"""
ACP Client Implementation for Python
Bridges WebSocket connections to ACP Provider stdio communication.
"""

import asyncio
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, AsyncIterator
from enum import Enum, auto
import uuid

# Default working directory from environment or current directory
DEFAULT_CWD = os.environ.get('ACP_DEFAULT_CWD', os.getcwd())


class ACPError(Exception):
    """Base exception for ACP errors"""
    pass


class ACPConnectionError(ACPError):
    """Connection-related errors"""
    pass


@dataclass
class JSONRPCRequest:
    """JSON-RPC 2.0 Request"""
    id: Any
    method: str
    params: Optional[Dict] = None
    jsonrpc: str = "2.0"
    
    def to_dict(self) -> Dict:
        result = {
            "jsonrpc": self.jsonrpc,
            "id": self.id,
            "method": self.method,
        }
        if self.params is not None:
            result["params"] = self.params
        return result
    
    @classmethod
    def from_dict(cls, data: Dict) -> "JSONRPCRequest":
        return cls(
            id=data.get("id"),
            method=data["method"],
            params=data.get("params"),
            jsonrpc=data.get("jsonrpc", "2.0")
        )


@dataclass
class JSONRPCResponse:
    """JSON-RPC 2.0 Response"""
    id: Any
    result: Optional[Dict] = None
    error: Optional[Dict] = None
    jsonrpc: str = "2.0"
    
    def to_dict(self) -> Dict:
        result = {
            "jsonrpc": self.jsonrpc,
            "id": self.id,
        }
        if self.error is not None:
            result["error"] = self.error
        else:
            result["result"] = self.result
        return result
    
    @classmethod
    def from_dict(cls, data: Dict) -> "JSONRPCResponse":
        return cls(
            id=data.get("id"),
            result=data.get("result"),
            error=data.get("error"),
            jsonrpc=data.get("jsonrpc", "2.0")
        )


@dataclass
class JSONRPCNotification:
    """JSON-RPC 2.0 Notification"""
    method: str
    params: Optional[Dict] = None
    jsonrpc: str = "2.0"
    
    def to_dict(self) -> Dict:
        result = {
            "jsonrpc": self.jsonrpc,
            "method": self.method,
        }
        if self.params is not None:
            result["params"] = self.params
        return result
    
    @classmethod
    def from_dict(cls, data: Dict) -> "JSONRPCNotification":
        return cls(
            method=data["method"],
            params=data.get("params"),
            jsonrpc=data.get("jsonrpc", "2.0")
        )


class ACPClientCapabilities:
    """Client capabilities for ACP initialize"""
    
    def __init__(self):
        self.fs = {"readTextFile": True, "writeTextFile": True}
        self.terminal = True
        self.prompt = {"streaming": True, "tools": True}
    
    def to_dict(self) -> Dict:
        return {
            "fs": self.fs,
            "terminal": self.terminal,
            "prompt": self.prompt,
        }


class ACPState(Enum):
    """ACP Client connection state"""
    DISCONNECTED = auto()
    INITIALIZING = auto()
    AUTHENTICATING = auto()
    READY = auto()
    ERROR = auto()


class ACPClient:
    """
    ACP Client implementation that communicates with an ACP Provider via stdio.
    
    This client:
    1. Spawns the ACP provider process
    2. Handles JSON-RPC 2.0 messaging
    3. Manages session lifecycle
    4. Routes requests/responses between WebSocket and ACP Provider
    """
    
    def __init__(
        self,
        provider_command: str,
        provider_args: List[str] = None,
        on_notification: Optional[Callable[[Dict], None]] = None,
        on_request: Optional[Callable[[Dict], asyncio.Future]] = None,
    ):
        self.provider_command = provider_command
        self.provider_args = provider_args or []
        self.on_notification = on_notification
        self.on_request = on_request
        
        self.state = ACPState.DISCONNECTED
        self.process: Optional[subprocess.Popen] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.reader: Optional[asyncio.StreamReader] = None
        
        # Request/response handling
        self._pending_requests: Dict[Any, asyncio.Future] = {}
        self._request_counter = 0
        self._lock = asyncio.Lock()
        
        # Session info
        self.session_id: Optional[str] = None
        self.agent_capabilities: Optional[Dict] = None
        
    async def connect(self, env: Optional[Dict[str, str]] = None) -> None:
        """Connect to the ACP provider process"""
        if self.state != ACPState.DISCONNECTED:
            raise ACPConnectionError("Already connected or connecting")
        
        self.state = ACPState.INITIALIZING
        
        try:
            # Prepare environment
            process_env = os.environ.copy()
            if env:
                process_env.update(env)
            
            # Start the provider process
            self.process = subprocess.Popen(
                [self.provider_command] + self.provider_args,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=False,  # We'll handle bytes
                bufsize=0,   # Unbuffered
                env=process_env,
            )
            
            # Create asyncio streams with larger buffer for big JSON responses
            loop = asyncio.get_event_loop()
            
            # Wrap stdin/stdout with StreamReader/StreamWriter
            # Increase limit to handle large session list responses
            self.reader = asyncio.StreamReader(limit=1024*1024)  # 1MB buffer
            protocol = asyncio.StreamReaderProtocol(self.reader)
            await loop.connect_read_pipe(lambda: protocol, self.process.stdout)
            
            writer_transport, writer_protocol = await loop.connect_write_pipe(
                asyncio.streams.FlowControlMixin, self.process.stdin
            )
            self.writer = asyncio.StreamWriter(
                writer_transport, writer_protocol, None, loop
            )
            
            # Start message reader task
            asyncio.create_task(self._read_messages())
            
            # Perform initialization
            await self._initialize()
            
        except Exception as e:
            self.state = ACPState.ERROR
            raise ACPConnectionError(f"Failed to connect: {e}")
    
    async def _initialize(self) -> None:
        """Perform ACP initialization handshake"""
        # Try different protocol version formats for compatibility
        init_request = {
            "clientCapabilities": ACPClientCapabilities().to_dict(),
            "clientInfo": {
                "name": "acp-web-bridge",
                "version": "0.1.0",
            }
        }
        
        # Some providers expect string version (ACP spec)
        # Others expect integer version (older implementations)
        init_request_str = {**init_request, "protocolVersion": "2025-03-26"}
        init_request_int = {**init_request, "protocolVersion": 1}
        
        response = None
        last_error = None
        
        # Try string format first (standard ACP)
        try:
            response = await self.send_request("initialize", init_request_str)
        except ACPError as e:
            last_error = e
            # Try integer format
            try:
                response = await self.send_request("initialize", init_request_int)
            except ACPError as e2:
                last_error = e2
        
        if response is None:
            raise ACPConnectionError(f"Initialize failed: {last_error}")
        
        self.agent_capabilities = response.get("agentCapabilities", {})
        self.state = ACPState.READY
        
    
    async def list_sessions(self) -> List[Dict]:
        """List all available sessions"""
        if self.state != ACPState.READY:
            raise ACPConnectionError("Not ready")
        
        try:
            response = await self.send_request("session/list", {})
            return response.get("sessions", [])
        except ACPError as e:
            # Provider may not support session/list
            return []
    
    async def create_session(self, cwd: str, mcp_servers: List[Dict] = None) -> str:
        """Create a new ACP session"""
        if self.state != ACPState.READY:
            raise ACPConnectionError("Not ready")
        
        params = {
            "cwd": cwd,
            "mcpServers": mcp_servers or [],
        }
        
        response = await self.send_request("session/new", params)
        self.session_id = response["sessionId"]
        
        return self.session_id
    
    async def load_session(self, session_id: str, cwd: str = None, mcp_servers: List[Dict] = None) -> Dict:
        """Load a session with its history using session/load method"""
        if self.state != ACPState.READY:
            raise ACPConnectionError("Not ready")
        
        # session/load requires cwd and mcpServers parameters
        params = {
            "sessionId": session_id,
            "cwd": cwd or DEFAULT_CWD,
            "mcpServers": mcp_servers or [],
        }
        
        try:
            # Try session/load first (returns history via notifications)
            response = await self.send_request("session/load", params)
            self.session_id = session_id
            return response
        except ACPError as e:
            # Fallback to session/resume
            try:
                response = await self.send_request("session/resume", {
                    "sessionId": session_id,
                    "cwd": cwd or DEFAULT_CWD,
                })
                self.session_id = session_id
                return response
            except ACPError as e2:
                # Last resort: just set the session_id
                self.session_id = session_id
                return {"sessionId": session_id}
    
    async def send_prompt(
        self, 
        prompt: str, 
        session_id: Optional[str] = None,
        context: Optional[List[Dict]] = None
    ) -> Dict:
        """Send a prompt to the agent"""
        session_id = session_id or self.session_id
        if not session_id:
            raise ACPError("No active session")
        
        params = {
            "sessionId": session_id,
            "prompt": [{"type": "text", "text": prompt}],
        }
        
        if context:
            params["context"] = context
        
        return await self.send_request("session/prompt", params)
    
    async def send_request(self, method: str, params: Dict) -> Dict:
        """Send a JSON-RPC request and wait for response"""
        async with self._lock:
            self._request_counter += 1
            request_id = self._request_counter
        
        request = JSONRPCRequest(
            id=request_id,
            method=method,
            params=params
        )
        
        # Create future for response
        future = asyncio.get_event_loop().create_future()
        self._pending_requests[request_id] = future
        
        # Send request
        await self._send_message(request.to_dict())
        
        try:
            # Wait for response with timeout
            response = await asyncio.wait_for(future, timeout=300.0)
            if response.error:
                raise ACPError(f"RPC Error: {response.error}")
            return response.result or {}
        except asyncio.TimeoutError:
            self._pending_requests.pop(request_id, None)
            raise ACPError("Request timeout")
    
    async def send_notification(self, method: str, params: Dict) -> None:
        """Send a JSON-RPC notification (no response expected)"""
        notification = JSONRPCNotification(
            method=method,
            params=params
        )
        await self._send_message(notification.to_dict())
    
    async def _send_message(self, message: Dict) -> None:
        """Send a message to the ACP provider"""
        if not self.writer:
            raise ACPConnectionError("Not connected")
        
        data = json.dumps(message) + "\n"
        self.writer.write(data.encode('utf-8'))
        await self.writer.drain()
    
    async def _read_messages(self) -> None:
        """Read and process messages from ACP provider"""
        try:
            while True:
                line = await self.reader.readline()
                if not line:
                    break
                
                try:
                    data = json.loads(line.decode('utf-8').strip())
                    await self._handle_message(data)
                except json.JSONDecodeError as e:
                    pass
                except Exception as e:
                    pass
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
        finally:
            self.state = ACPState.DISCONNECTED
    
    async def _handle_message(self, data: Dict) -> None:
        """Handle incoming JSON-RPC message"""
        # Check if it's a response
        if "result" in data or "error" in data:
            response = JSONRPCResponse.from_dict(data)
            if response.id in self._pending_requests:
                future = self._pending_requests.pop(response.id)
                if not future.done():
                    future.set_result(response)
            return
        
        # Check if it's a request (from agent to client)
        if "id" in data and "method" in data:
            await self._handle_request(data)
            return
        
        # It's a notification
        if "method" in data:
            notification = JSONRPCNotification.from_dict(data)
            await self._handle_notification(notification)
    
    async def _handle_request(self, data: Dict) -> None:
        """Handle a request from the agent"""
        request_id = data["id"]
        method = data["method"]
        params = data.get("params", {})
        
        
        # Handle client-side methods
        if method == "session/request_permission":
            result = await self._handle_permission_request(params)
        elif method == "fs/read_text_file":
            result = await self._handle_read_file(params)
        elif method == "fs/write_text_file":
            result = await self._handle_write_file(params)
        elif method == "terminal/create":
            result = await self._handle_create_terminal(params)
        elif method == "terminal/output":
            result = await self._handle_terminal_output(params)
        else:
            # Check for custom handler
            if self.on_request:
                try:
                    result = await self.on_request(data)
                except Exception as e:
                    await self._send_response(request_id, error={
                        "code": -32603,
                        "message": str(e)
                    })
                    return
            else:
                await self._send_response(request_id, error={
                    "code": -32601,
                    "message": f"Method not found: {method}"
                })
                return
        
        await self._send_response(request_id, result=result)
    
    async def _send_response(self, request_id: Any, result: Dict = None, error: Dict = None) -> None:
        """Send a JSON-RPC response"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
        }
        if error:
            response["error"] = error
        else:
            response["result"] = result or {}
        await self._send_message(response)
    
    async def _handle_notification(self, notification: JSONRPCNotification) -> None:
        """Handle a notification from the agent"""
        
        # Forward to WebSocket handler if registered
        if self.on_notification:
            self.on_notification(notification.to_dict())
    
    # Default handlers for client-side methods
    
    async def _handle_permission_request(self, params: Dict) -> Dict:
        """Handle permission request - forward to WebSocket client if handler registered"""
        # If on_request is registered, use it to forward to WebSocket client
        if self.on_request:
            import uuid
            result = await self.on_request({
                "method": "session/request_permission",
                "params": params,
                "id": f"perm_{uuid.uuid4().hex[:8]}"
            })
            # ACP Agent expects {"outcome": {"outcome": "selected", "optionId": "allow_session"|...}}
            # websocket_server now returns the correctly formatted response
            if result:
                return result
            # Default deny if no result
            return {
                "outcome": {
                    "outcome": "selected",
                    "optionId": "deny_once"
                }
            }
        # Otherwise auto-allow for backward compatibility
        return {
            "outcome": {
                "outcome": "selected",
                "optionId": "allow_once"
            }
        }
    
    async def _handle_read_file(self, params: Dict) -> Dict:
        """Handle file read request"""
        import os
        path = params.get("path", "")
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            return {"content": content}
        except Exception as e:
            raise ACPError(f"Failed to read file: {e}")
    
    async def _handle_write_file(self, params: Dict) -> Dict:
        """Handle file write request"""
        import os
        path = params.get("path", "")
        content = params.get("content", "")
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {}
        except Exception as e:
            raise ACPError(f"Failed to write file: {e}")
    
    async def _handle_create_terminal(self, params: Dict) -> Dict:
        """Handle terminal creation request"""
        import os
        import tempfile
        
        terminal_id = str(uuid.uuid4())
        command = params.get("command", "")
        args = params.get("args", [])
        cwd = params.get("cwd", os.getcwd())
        
        # For demo, we'll create a simple terminal wrapper
        # In production, this would manage a real PTY
        
        return {"terminalId": terminal_id}
    
    async def _handle_terminal_output(self, params: Dict) -> Dict:
        """Handle terminal output request"""
        terminal_id = params.get("terminalId", "")
        # Return empty output for demo
        return {
            "output": "",
            "exitStatus": 0
        }
    
    async def close(self) -> None:
        """Close the ACP connection"""
        if self.writer:
            self.writer.close()
            await self.writer.wait_closed()
        
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except:
                self.process.kill()
        
        self.state = ACPState.DISCONNECTED
