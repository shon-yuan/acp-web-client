# Architecture Overview

This document describes the architecture of ACP Web Client.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  index.html                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  Chat UI    │  │ Session Mgr │  │  Renderer   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              WebSocket Bridge (Python)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              websocket_server.py                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │   Server    │  │  ACPClient  │  │   Router    │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ stdio (JSON-RPC)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     ACP Provider                             │
│         (Claude ACP Agent / Kimi CLI / Mock)                │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Frontend (index.html)

**Responsibilities:**

- User interface rendering
- WebSocket connection management
- Message display (Markdown, code blocks)
- Session UI (list, switch, create)
- Permission request UI

**Key Features:**

- Uses marked.js for Markdown rendering
- highlight.js for syntax highlighting
- Pure vanilla JavaScript (no framework)
- Responsive CSS with CSS variables

### 2. WebSocket Bridge (Python)

**Responsibilities:**

- Accept WebSocket connections from browsers
- Spawn and manage ACP provider processes
- Translate between WebSocket messages and ACP JSON-RPC
- Handle permission request flow
- Route notifications to correct clients

**Files:**

- `websocket_server.py` - Main server with connection handling
- `acp_client.py` - ACP protocol client implementation

### 3. ACP Client (Python)

**Responsibilities:**

- Manage stdio communication with ACP providers
- JSON-RPC 2.0 message handling
- Request/response correlation
- Notification forwarding
- Protocol initialization

**Key Classes:**

- `ACPClient` - Main client class
- `JSONRPCRequest` / `JSONRPCResponse` - Message types

## Data Flow

### 1. Connection Establishment

```
Browser → WebSocket Server: connect
WebSocket Server → ACP Provider: spawn process
ACP Provider → WebSocket Server: initialize response
WebSocket Server → Browser: ready
```

### 2. Sending a Message

```
Browser → WebSocket Server: prompt message
WebSocket Server → ACP Provider: session/prompt request
ACP Provider → WebSocket Server: response + notifications
WebSocket Server → Browser: notification (streaming)
WebSocket Server → Browser: prompt_response
```

### 3. Permission Request

```
ACP Provider → WebSocket Server: session/request_permission request
WebSocket Server → Browser: permission_request message
[User clicks Allow/Deny in UI]
Browser → WebSocket Server: permission_response message
WebSocket Server → ACP Provider: request response
```

## Message Types

### Browser ↔ WebSocket

| Type                  | Direction | Description         |
| --------------------- | --------- | ------------------- |
| `select_provider`     | B→W       | Choose ACP provider |
| `ready`               | W→B       | Provider connected  |
| `prompt`              | B→W       | Send user message   |
| `notification`        | W→B       | Streaming response  |
| `permission_request`  | W→B       | Show permission UI  |
| `permission_response` | B→W       | User decision       |
| `list_sessions`       | B→W       | Get session list    |
| `sessions_list`       | W→B       | Session list result |
| `create_session`      | B→W       | Create new session  |
| `session_created`     | W→B       | Session created     |
| `switch_session`      | B→W       | Switch to session   |
| `session_switched`    | W→B       | Switch complete     |

### WebSocket ↔ ACP Provider

Uses standard ACP protocol methods over JSON-RPC 2.0:

- `initialize`
- `session/new`
- `session/list`
- `session/load`
- `session/resume`
- `session/prompt`
- `session/request_permission`

See [ACP Protocol Docs](https://agentclientprotocol.com) for details.

## Provider Support

### Claude ACP Agent

- **Protocol**: Custom format with `_meta.claudeCode` extensions
- **Tool Calls**: Uses `title` + `rawInput` instead of standard `toolCall`
- **Notifications**: `session/update` with various `sessionUpdate` types

### Kimi CLI

- **Protocol**: Closer to standard ACP
- **Tool Calls**: Standard `toolCall` format

### Mock Provider

- **Purpose**: Testing and development
- **Implementation**: Python script in `src/py/`

## Security Considerations

1. **CORS**: HTTP server should set appropriate CORS headers
2. **API Keys**: Store `ANTHROPIC_AUTH_TOKEN` securely, never commit
3. **Permissions**: User must approve tool calls
4. **File System**: Agent has access to working directory only
5. **Network**: WebSocket runs on localhost by default

## Future Improvements

1. **Authentication**: Add user authentication
2. **Persistence**: Database-backed session storage
3. **Multi-user**: Support concurrent users
4. **Plugins**: Extensible provider system
5. **Tests**: Comprehensive test suite
