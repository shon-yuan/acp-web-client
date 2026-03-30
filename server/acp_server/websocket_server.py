"""
WebSocket Server for ACP Web Bridge
Supports dynamic provider selection from web client
"""

import asyncio
import json
import websockets
import os
import sys
import time

# Handle different websockets versions
try:
    from websockets.server import WebSocketServerProtocol
except ImportError:
    from websockets import WebSocketServerProtocol

from typing import Dict, Optional
import argparse

from .acp_client import ACPClient

# Default working directory from environment or current directory
DEFAULT_CWD = os.environ.get('ACP_DEFAULT_CWD', os.getcwd())


class ConnectionState:
    """Tracks state of a single client connection"""

    def __init__(self, client_id: str):
        self.client_id = client_id
        self.websocket: Optional[WebSocketServerProtocol] = None
        self.acp_client: Optional[ACPClient] = None
        self.status = 'disconnected'  # disconnected, connecting, ready
        self.provider: Optional[dict] = None
        self.pending_requests: Dict = {}
        self.cleanup_task: Optional[asyncio.Task] = None
        self.last_activity = time.time()

    def update_activity(self):
        self.last_activity = time.time()


class ACPWebBridge:
    """
    Manages WebSocket connections with dynamic ACP provider selection.
    Uses connection IDs to track clients across reconnects.
    """

    def __init__(self, cleanup_delay: float = 10.0):
        # websocket -> {client_id, acp_client, ...}
        self.connections: Dict[WebSocketServerProtocol, dict] = {}
        self.cleanup_delay = cleanup_delay  # seconds to wait before cleaning up ACP client

    def get_provider_config(self, provider_name: str) -> Optional[dict]:
        """Get provider configuration"""
        configs = {
            "kimi": {
                "name": "Kimi CLI",
                "cmd": "kimi",
                "args": ["acp"]},
            "claude": {
                "name": "Claude ACP Agent",
                "cmd": "node",
                "args": [
                    os.path.join(
                        os.path.dirname(__file__),
                        "..",
                        "..",
                        "..",
                        "claude-agent-acp",
                        "dist",
                        "index.js")]},
            "mock": {
                "name": "Mock Provider",
                        "cmd": sys.executable,
                        "args": [
                            os.path.join(
                                os.path.dirname(__file__),
                                "mock_provider.py")]}}
        return configs.get(provider_name)

    def check_provider(self, provider_name: str) -> bool:
        """Check if provider is available"""
        import shutil
        if provider_name == "mock":
            return True
        config = self.get_provider_config(provider_name)
        if not config:
            return False
        return shutil.which(config['cmd']) is not None

    async def handle_connection(self, websocket: WebSocketServerProtocol, path: str = None):
        """Handle a new WebSocket connection"""
        # Parse client_id from URL query params
        import urllib.parse
        client_id = None
        if path and '?' in path:
            query = path.split('?')[1]
            params = urllib.parse.parse_qs(query)
            client_id = params.get('clientId', [None])[0]

        # Fall back to websocket id if no client_id provided
        if not client_id:
            client_id = str(id(websocket))

        # Check if this client has a pending cleanup that we should cancel
        # Look for existing cleanup tasks for this client_id
        for ws, state in list(self.connections.items()):
            if state.get('client_id') == client_id:
                cleanup_task = state.get('cleanup_task')
                if cleanup_task and not cleanup_task.done():
                    cleanup_task.cancel()
                    try:
                        await cleanup_task
                    except asyncio.CancelledError:
                        pass
                    # Reuse the existing ACP client
                    existing_acp = state.get('acp_client')
                    if existing_acp and existing_acp.state.name == 'READY':
                        self.connections[websocket] = {
                            'client_id': client_id,
                            'acp_client': existing_acp,
                            'provider': state.get('provider'),
                            'status': 'ready',
                            'pending_requests': {},
                            'cleanup_task': None
                        }
                        # Send ready immediately
                        await websocket.send(json.dumps({
                            "type": "ready",
                            "data": {
                                "agentCapabilities": existing_acp.agent_capabilities or {},
                                "provider": state.get('provider', {}).get('name', 'Unknown')
                            }
                        }))
                        # Remove old websocket mapping
                        del self.connections[ws]
                        break
        else:
            # Initialize new connection state
            self.connections[websocket] = {
                'client_id': client_id,
                'acp_client': None,
                'provider': None,
                'status': 'awaiting_provider',
                'pending_requests': {},
                'cleanup_task': None
            }

        try:
            # Wait for provider selection from client
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self._handle_websocket_message(websocket, data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "data": {"message": "Invalid JSON"}
                    }))
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    await websocket.send(json.dumps({
                        "type": "error",
                        "data": {"message": str(e)}
                    }))

        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception:
            pass
        finally:
            await self._cleanup_connection(websocket)

    async def _handle_websocket_message(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle a message from the web client"""
        msg_type = data.get("type")
        msg_data = data.get("data", {})
        conn_state = self.connections.get(websocket, {})

        # Provider selection must come first
        if msg_type == "select_provider":
            await self._handle_select_provider(websocket, msg_data.get("provider", "mock"))
            return

        # Check if provider is selected
        if conn_state.get('status') == 'awaiting_provider':
            await websocket.send(json.dumps({
                "type": "error",
                "data": {"message": "Please select a provider first"}
            }))
            return

        acp_client = conn_state.get('acp_client')
        if not acp_client:
            await websocket.send(json.dumps({
                "type": "error",
                "data": {"message": "ACP client not ready"}
            }))
            return

        if msg_type == "list_sessions":
            await self._handle_list_sessions(websocket, acp_client, msg_data)
        elif msg_type == "create_session":
            await self._handle_create_session(websocket, acp_client, msg_data)
        elif msg_type == "switch_session":
            await self._handle_switch_session(websocket, acp_client, msg_data)
        elif msg_type == "prompt":
            await self._handle_prompt(websocket, acp_client, msg_data)
        elif msg_type == "permission_response":
            await self._handle_permission_response(websocket, msg_data)
        elif msg_type == "ping":
            await websocket.send(json.dumps({"type": "pong"}))
        else:
            await websocket.send(json.dumps({
                "type": "error",
                "data": {"message": f"Unknown message type: {msg_type}"}
            }))

    async def _handle_select_provider(self, websocket: WebSocketServerProtocol, provider_name: str):
        """Handle provider selection from client"""

        conn_state = self.connections.get(websocket)
        if not conn_state:
            return

        # Close existing provider connection if any
        existing_client = conn_state.get('acp_client')
        if existing_client:
            try:
                await existing_client.close()
            except Exception:
                pass
            conn_state['acp_client'] = None

        # Check if provider is available
        if not self.check_provider(provider_name):
            await websocket.send(json.dumps({
                "type": "provider_error",
                "data": {
                    "provider": provider_name,
                    "message": f"{provider_name} is not installed or not in PATH"
                }
            }))
            return

        provider_config = self.get_provider_config(provider_name)
        conn_state['status'] = 'connecting'
        conn_state['provider'] = provider_config

        await websocket.send(json.dumps({
            "type": "provider_connecting",
            "data": {"provider": provider_config['name']}
        }))

        try:
            # Create ACP client
            acp_client = ACPClient(
                provider_command=provider_config['cmd'],
                provider_args=provider_config['args'],
                on_notification=lambda n: asyncio.create_task(
                    self._forward_notification(websocket, n)
                ),
                on_request=lambda r: self._handle_acp_request(websocket, r)
            )

            # Prepare environment for Claude ACP Agent
            connect_env = None
            if provider_name == 'claude':
                connect_env = {
                    'ANTHROPIC_AUTH_TOKEN': os.environ.get('ANTHROPIC_AUTH_TOKEN', ''),
                    'ANTHROPIC_BASE_URL': os.environ.get('ANTHROPIC_BASE_URL', ''),
                }

            # Connect to ACP provider
            print(f"[ACP] Connecting to {provider_config['cmd']} "
                  f"{provider_config['args']}", flush=True)
            await acp_client.connect(env=connect_env)
            print(f"[ACP] Connected successfully", flush=True)

            conn_state['acp_client'] = acp_client
            conn_state['status'] = 'ready'

            # Send ready message
            await websocket.send(json.dumps({
                "type": "ready",
                "data": {
                    "agentCapabilities": acp_client.agent_capabilities or {},
                    "provider": provider_config['name']
                }
            }))

        except Exception as e:
            conn_state['status'] = 'error'
            await websocket.send(json.dumps({
                "type": "provider_error",
                "data": {
                    "provider": provider_name,
                    "message": f"Failed to connect: {str(e)}"
                }
            }))

    async def _handle_list_sessions(
            self,
            websocket: WebSocketServerProtocol,
            acp_client: ACPClient,
            msg_data: Dict):
        """Handle list sessions request"""
        try:
            # Get working directory from request, fallback to DEFAULT_CWD
            cwd = msg_data.get("cwd", DEFAULT_CWD) if msg_data else DEFAULT_CWD
            sessions = await acp_client.list_sessions()
            # Filter sessions to only show those exactly matching the specified working directory
            # Map sessionId -> id for frontend compatibility
            filtered_sessions = [
                {
                    "id": s.get("sessionId", s.get("id", "")),
                    "cwd": s.get("cwd", ""),
                    "createdAt": s.get("createdAt", s.get("created_at", "")),
                    "updatedAt": s.get("updatedAt", s.get("updated_at", ""))
                }
                for s in sessions
                if s.get("cwd", "") == cwd
            ]
            await websocket.send(json.dumps({
                "type": "sessions_list",
                "data": {"sessions": filtered_sessions}
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "error",
                "data": {"message": f"Failed to list sessions: {str(e)}"}
            }))

    async def _handle_create_session(
            self,
            websocket: WebSocketServerProtocol,
            acp_client: ACPClient,
            msg_data: Dict):
        """Handle create session request"""
        cwd = msg_data.get("cwd", os.getcwd())
        mcp_servers = msg_data.get("mcpServers", [])

        try:
            session_id = await acp_client.create_session(cwd, mcp_servers)
            await websocket.send(json.dumps({
                "type": "session_created",
                "data": {"sessionId": session_id}
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "error",
                "data": {"message": f"Failed to create session: {str(e)}"}
            }))

    async def _handle_switch_session(
            self,
            websocket: WebSocketServerProtocol,
            acp_client: ACPClient,
            msg_data: Dict):
        """Handle switch session request"""
        session_id = msg_data.get("sessionId")

        if not session_id:
            await websocket.send(json.dumps({
                "type": "error",
                "data": {"message": "Session ID is required"}
            }))
            return

        try:
            # Get cwd from request for load
            cwd = msg_data.get("cwd", DEFAULT_CWD)

            # Collect history messages during session/load
            history_messages = []
            original_on_notification = acp_client.on_notification

            def capture_history_notification(notification):
                method = notification.get("method", "")
                params = notification.get("params", {})

                if method in ("sessionUpdate", "session/update"):
                    update = params.get("update", {})
                    update_type = update.get("sessionUpdate", "")

                    # Capture history-related updates including messages, thoughts, and tool calls
                    if update_type in (
                        "user_message_chunk",
                        "agent_message_chunk",
                        "agent_thought_chunk",
                        "tool_call",
                            "tool_call_update"):
                        history_messages.append({
                            "type": update_type,
                            "update": update
                        })

                # Still forward to original handler
                if original_on_notification:
                    asyncio.create_task(original_on_notification(notification))

            # Temporarily replace notification handler
            acp_client.on_notification = capture_history_notification

            try:
                # Load session with history (session/load method streams history via notifications)
                await acp_client.load_session(session_id, cwd, [])
                # Wait a bit for history notifications to arrive
                await asyncio.sleep(0.5)
            finally:
                # Restore original handler
                acp_client.on_notification = original_on_notification

            await websocket.send(json.dumps({
                "type": "session_switched",
                "data": {
                    "sessionId": session_id,
                    "history": history_messages
                }
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "error",
                "data": {"message": f"Failed to switch session: {str(e)}"}
            }))

    async def _handle_prompt(
            self,
            websocket: WebSocketServerProtocol,
            acp_client: ACPClient,
            msg_data: Dict):
        """Handle prompt request"""
        prompt_text = msg_data.get("prompt", "").strip()
        session_id = msg_data.get("sessionId")
        context = msg_data.get("context", [])

        if not prompt_text:
            return

        try:
            asyncio.create_task(
                self._send_prompt_async(
                    websocket,
                    acp_client,
                    prompt_text,
                    session_id,
                    context))
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "error",
                "data": {"message": f"Prompt failed: {str(e)}"}
            }))

    async def _send_prompt_async(self, websocket, acp_client, prompt_text, session_id, context):
        """Send prompt asynchronously"""
        try:
            response = await acp_client.send_prompt(prompt_text, session_id, context)
            await websocket.send(json.dumps({
                "type": "prompt_response",
                "data": response
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "error",
                "data": {"message": f"Prompt failed: {str(e)}"}
            }))

    async def _forward_notification(self, websocket: WebSocketServerProtocol, notification: Dict):
        """Forward ACP notification to web client"""
        try:
            await websocket.send(json.dumps({
                "type": "notification",
                "data": notification
            }))
        except Exception:
            pass

    async def _handle_acp_request(self, websocket: WebSocketServerProtocol, request: Dict):
        """Handle a request from ACP provider"""
        method = request.get("method", "")
        params = request.get("params", {})
        request_id = request.get("id")

        if method == "session/request_permission":
            try:
                # Store pending request
                conn_state = self.connections.get(websocket, {})
                pending = conn_state.get('pending_requests', {})

                # Create a future to wait for client response
                loop = asyncio.get_event_loop()
                future = loop.create_future()
                pending[request_id] = future

                # Send to client
                await websocket.send(json.dumps({
                    "type": "permission_request",
                    "data": params,
                    "requestId": request_id
                }))

                # Wait for client response (with timeout)
                try:
                    result = await asyncio.wait_for(future, timeout=300.0)
                    return result
                except asyncio.TimeoutError:
                    del pending[request_id]
                    return {
                        "outcome": {
                            "outcome": "selected",
                            "optionId": "deny_once"
                        }
                    }
            except Exception:
                raise

        return {}

    async def _handle_permission_response(self, websocket: WebSocketServerProtocol, msg_data: Dict):
        """Handle permission response from web client"""
        request_id = msg_data.get("requestId")
        outcome = msg_data.get("outcome", "deny_once")

        conn_state = self.connections.get(websocket, {})
        pending = conn_state.get('pending_requests', {})

        if request_id in pending:
            future = pending.pop(request_id)
            if not future.done():
                # Map frontend outcome to Claude Agent ACP optionId
                # Frontend: allow_once, allow_session, deny_once, deny_session
                # Claude Agent expects: "allow", "allow_always", "reject", etc.
                option_id_map = {
                    "allow_once": "allow",
                    "allow_session": "allow_always",
                    "deny_once": "reject",
                    "deny_session": "reject"
                }
                option_id = option_id_map.get(outcome, "reject")

                # ACP format: {"outcome": {"outcome": "selected", "optionId": "allow"}}
                acp_outcome = {
                    "outcome": {
                        "outcome": "selected",
                        "optionId": option_id
                    }
                }
                future.set_result(acp_outcome)
            await websocket.send(json.dumps({
                "type": "permission_response_ack",
                "data": {"requestId": request_id, "status": "ok"}
            }))
        else:
            await websocket.send(json.dumps({
                "type": "error",
                "data": {"message": f"Unknown permission request: {request_id}"}
            }))

    async def _cleanup_connection(self, websocket: WebSocketServerProtocol):
        """Schedule delayed cleanup of connection resources"""
        # Get connection state
        conn_state = self.connections.pop(websocket, None)
        if not conn_state:
            return

        client_id = conn_state.get('client_id', id(websocket))

        # Cancel any existing cleanup task
        existing_task = conn_state.get('cleanup_task')
        if existing_task and not existing_task.done():
            existing_task.cancel()
            try:
                await existing_task
            except asyncio.CancelledError:
                pass

        acp_client = conn_state.get('acp_client')
        if not acp_client:
            return

        # Schedule delayed cleanup - keep connection state around for potential reuse
        async def delayed_cleanup():
            await asyncio.sleep(self.cleanup_delay)

            # Check if this client reconnected with same client_id
            for ws, state in self.connections.items():
                if state.get('client_id') == client_id:
                    return

            try:
                await acp_client.close()
            except Exception:
                pass

        # Start cleanup task
        asyncio.create_task(delayed_cleanup())


def run_server():
    parser = argparse.ArgumentParser(description="ACP WebSocket Bridge Server")
    parser.add_argument(
        "--host",
        default="localhost",
        help="WebSocket server host (default: localhost)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=9178,
        help="WebSocket server port (default: 9178)"
    )

    args = parser.parse_args()

    # Create bridge
    bridge = ACPWebBridge()

    # Start server
    async def start():
        await websockets.serve(
            bridge.handle_connection,
            args.host,
            args.port,
            ping_interval=20,
            ping_timeout=10
        )
        await asyncio.Future()  # Run forever

    try:
        asyncio.run(start())
    except KeyboardInterrupt:
        pass


def main():
    """CLI entry point"""
    run_server()


if __name__ == "__main__":
    main()
