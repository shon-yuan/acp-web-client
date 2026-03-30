# API Documentation

## WebSocket Protocol

The WebSocket bridge uses JSON messages with a `type` field.

### Client → Server Messages

#### select_provider

Choose the ACP provider to connect to.

```json
{
  "type": "select_provider",
  "data": {
    "provider": "claude"
  }
}
```

**Parameters:**

- `provider` (string): One of `mock`, `kimi`, `claude`

#### prompt

Send a user message to the agent.

```json
{
  "type": "prompt",
  "data": {
    "sessionId": "uuid",
    "prompt": "Hello, how are you?",
    "context": []
  }
}
```

#### list_sessions

Get list of available sessions.

```json
{
  "type": "list_sessions",
  "data": {
    "cwd": "/home/user/workspace"
  }
}
```

#### create_session

Create a new session.

```json
{
  "type": "create_session",
  "data": {
    "cwd": "/home/user/workspace",
    "mcpServers": []
  }
}
```

#### switch_session

Switch to an existing session.

```json
{
  "type": "switch_session",
  "data": {
    "sessionId": "uuid",
    "cwd": "/home/user/workspace"
  }
}
```

#### permission_response

Respond to a permission request.

```json
{
  "type": "permission_response",
  "data": {
    "requestId": "id",
    "outcome": {
      "outcome": "selected",
      "optionId": "allow_once"
    }
  }
}
```

### Server → Client Messages

#### ready

Connection established with provider.

```json
{
  "type": "ready",
  "data": {
    "provider": "Claude ACP Agent",
    "agentCapabilities": {
      "promptCapabilities": { "streaming": true },
      "loadSession": true
    }
  }
}
```

#### notification

Streaming message from agent.

```json
{
  "type": "notification",
  "data": {
    "jsonrpc": "2.0",
    "method": "session/update",
    "params": {
      "sessionId": "uuid",
      "update": {
        "sessionUpdate": "agent_message_chunk",
        "content": { "text": "Hello!" }
      }
    }
  }
}
```

#### permission_request

Show permission request UI.

```json
{
  "type": "permission_request",
  "data": {
    "toolCall": {
      "name": "fs/read_file",
      "arguments": { "path": "/tmp/test.txt" }
    },
    "options": [
      { "optionId": "allow_once", "name": "Allow", "optionType": "allow" },
      { "optionId": "deny_once", "name": "Deny", "optionType": "deny" }
    ]
  },
  "requestId": "req-id"
}
```

#### sessions_list

List of available sessions.

```json
{
  "type": "sessions_list",
  "data": {
    "sessions": [
      {
        "sessionId": "uuid",
        "cwd": "/home/user/workspace",
        "title": "Session title",
        "updatedAt": "2025-03-29T00:00:00Z"
      }
    ]
  }
}
```

## ACP Protocol Reference

### Standard Methods

See [ACP Protocol Specification](https://agentclientprotocol.com/protocol) for complete documentation.

#### initialize

Protocol version negotiation.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-03-26",
    "clientCapabilities": {},
    "clientInfo": { "name": "acp-web-bridge", "version": "0.1.0" }
  }
}
```

#### session/new

Create a new session.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "session/new",
  "params": {
    "cwd": "/home/user/workspace",
    "mcpServers": []
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "sessionId": "uuid",
    "modes": {},
    "models": {}
  }
}
```

#### session/prompt

Send a prompt to the agent.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "session/prompt",
  "params": {
    "sessionId": "uuid",
    "prompt": [{ "type": "text", "text": "Hello" }],
    "context": []
  }
}
```

### Notification Types

#### session/update

Real-time updates from agent.

**Types:**

- `user_message_chunk` - User message being processed
- `agent_message_chunk` - Agent response streaming
- `agent_thought_chunk` - Agent thinking process
- `tool_call` - Tool being invoked
- `tool_call_update` - Tool execution status
- `plan` - Execution plan

## Python API

### ACPClient

```python
from acp_client import ACPClient

client = ACPClient(
    provider_command='node',
    provider_args=['claude-agent.js'],
    on_notification=lambda n: print(n),
    on_request=lambda r: handle_request(r)
)

await client.connect(env={'ANTHROPIC_AUTH_TOKEN': 'key'})
session_id = await client.create_session('/workspace')
response = await client.send_prompt('Hello!')
```

### WebSocketServer

```python
from websocket_server import WebSocketServer

server = WebSocketServer(host='localhost', port=8765)
await server.start()
```
