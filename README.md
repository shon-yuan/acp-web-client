# ACP Web Client

A modern web client for Agent Client Protocol (ACP), built with React + TypeScript + Tailwind CSS.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACP Web Client (Frontend)                     │
│              React + TypeScript + Tailwind CSS                   │
│                    (Published as NPM package)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Hooks: useACP │ useACPWebSocket │ useACPSession          │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│              ACP WebSocket Bridge Server (Python)                │
│                    (Backend - Required)                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ stdio
┌───────────────────────────▼─────────────────────────────────────┐
│                  ACP Providers (Kimi/Claude/Mock)               │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
acp-web-client/
├── frontend/           # NPM Package: React Hooks
│   ├── src/
│   │   ├── hooks/      # ACP React Hooks
│   │   └── types/      # TypeScript types
│   ├── dist/           # Build output
│   ├── example/        # Example implementation (full UI)
│   └── package.json
│
├── server/             # Python WebSocket Server
│   ├── acp_server/     # Python package
│   ├── requirements.txt
│   └── README.md
│
└── docs/               # Documentation
    ├── API.md
    └── ARCHITECTURE.md
```

## Quick Start

### Option 1: Use NPM Package (Recommended)

In your React project:

```bash
npm install acp-react-hooks
```

```tsx
import { useACP } from 'acp-react-hooks';

function MyApp() {
  const { connectionStatus, messages, sendPrompt, createSession } = useACP({
    defaultUrl: 'ws://localhost:9178'
  });
  
  // Build your own UI
}
```

### Option 2: Use Example Implementation

```bash
cd frontend/example
npm install
npm run dev
```

### Option 3: Full Deployment

#### 1. Start WebSocket Server

```bash
cd server
pip install -e .
acp-web-server --port 9178
```

#### 2. Build and Run Frontend Example

```bash
cd frontend/example
npm install
npm run dev
```

Or use Docker:

```bash
cd frontend
docker build -t acp-web-client .
docker run -p 9177:80 acp-web-client
```

## Development Mode

```bash
# Terminal 1: Start WebSocket Server
cd server && acp-web-server

# Terminal 2: Start Frontend Dev Server
cd frontend && npm run dev
```

## Supported AI Providers

- **Kimi CLI** - Moonshot Kimi command line tool (`kimi acp`)
- **Claude ACP Agent** - Anthropic Claude Code
- **Mock Provider** - Mock provider for testing

## Tech Stack

| Layer | Technology |
|------|------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Backend | Python 3.8+, websockets |
| Protocol | WebSocket (Browser) / JSON-RPC 2.0 over stdio (ACP) |

## WebSocket URL Configuration

Frontend supports multiple ways to configure WebSocket server address:

1. **URL Param**: `http://localhost:9177?wsUrl=wss://example.com/ws`
2. **Default**: `ws://localhost:9178`

## Environment Variables

Create `.env` file and configure:

```bash
# Required for Claude provider
ANTHROPIC_AUTH_TOKEN=your_api_key_here

# Optional: Default working directory for sessions (defaults to current directory)
ACP_DEFAULT_CWD=/path/to/workspace
```

## Documentation

- [API Documentation](./docs/API.md) - API interface documentation
- [Architecture](./docs/ARCHITECTURE.md) - System architecture design
- [Frontend](./frontend/README.md) - Frontend development documentation
- [Backend](./server/README.md) - Backend development documentation

## License

MIT
