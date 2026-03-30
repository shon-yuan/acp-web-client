# ACP WebSocket Server

WebSocket bridge server for Agent Client Protocol (ACP).

## Installation

```bash
pip install acp-web-server
```

## Usage

### Command Line

```bash
# Start server (default port 9178)
acp-web-server

# Custom port
acp-web-server --port 8080

# Custom host
acp-web-server --host 0.0.0.0 --port 9178
```

### Programmatic Usage

```python
import asyncio
import websockets
from acp_server import ACPWebBridge

async def main():
    bridge = ACPWebBridge()
    
    server = await websockets.serve(
        bridge.handle_connection,
        "localhost",
        9178,
        ping_interval=20,
        ping_timeout=10
    )
    
    print("Server started on ws://localhost:9178")
    await asyncio.Future()

asyncio.run(main())
```

## Supported AI Providers

- **Kimi CLI** - Moonshot Kimi command line tool
- **Claude ACP Agent** - Anthropic Claude Code
- **Mock Provider** - Mock provider for testing

## Environment Variables

| Variable | Description | Default |
|------|------|--------|
| `ANTHROPIC_AUTH_TOKEN` | Claude API Token | - |
| `ANTHROPIC_BASE_URL` | Claude API Base URL | - |
| `ACP_DEFAULT_CWD` | Default working directory for sessions | Current directory |

## License

MIT
