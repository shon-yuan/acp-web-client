# ACP React Hooks

React hooks for Agent Client Protocol (ACP) - Connect to AI agents like Claude and Kimi through WebSocket.

## Installation

```bash
npm install acp-react-hooks
```

## Usage

### Basic Usage with useACP

```tsx
import { useACP } from 'acp-react-hooks';

function MyApp() {
  const {
    // WebSocket state
    connectionStatus,
    selectedProvider,
    error,
    
    // Session state
    sessions,
    currentSession,
    messages,
    isLoading,
    
    // Permission state
    pendingRequests,
    
    // Actions
    connect,
    disconnect,
    selectProvider,
    createSession,
    sendPrompt,
    respondToPermission,
  } = useACP({
    defaultUrl: 'ws://localhost:9178',
    autoConnect: true,
  });

  // Render your UI...
}
```

### Individual Hooks

```tsx
import { useACPWebSocket, useACPSession, useACPPermission } from 'acp-react-hooks';

// WebSocket only
const ws = useACPWebSocket('ws://localhost:9178');

// Session management
const session = useACPSession({
  sendMessage: ws.sendMessage,
  subscribe: ws.subscribe,
  connectionStatus: ws.connectionStatus,
});

// Permission handling
const permission = useACPPermission({
  sendMessage: ws.sendMessage,
  subscribe: ws.subscribe,
});
```

## API

### useACP

Main hook combining WebSocket, Session, and Permission management.

### useACPWebSocket

Manages WebSocket connection to ACP server.

### useACPSession

Manages sessions, messages, and prompts.

### useACPPermission

Manages permission requests from agents.

## License

MIT
