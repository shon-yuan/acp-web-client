import { useACPWebSocket } from './useACPWebSocket';
import { useACPSession } from './useACPSession';
import { useACPPermission } from './useACPPermission';
import type { ConnectionStatus, WSMessage, Session, PermissionRequest, PermissionOption } from '@/types/acp';

// Chat message type from useACPSession
interface ChatMessage {
  role: 'user' | 'assistant' | 'thought' | 'tool_call';
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  toolCallId?: string;
}

export interface ACPState {
  // WebSocket state
  connectionStatus: ConnectionStatus;
  selectedProvider: string | null;
  agentCapabilities: Record<string, unknown> | null;
  error: string | null;
  wsUrl: string;
  
  // Session state
  sessions: Session[];
  currentSession: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isCreatingSession: boolean;
  
  // Permission state
  pendingRequests: PermissionRequest[];
}

export interface ACPActions {
  // WebSocket actions
  connect: (url: string) => void;
  disconnect: () => void;
  selectProvider: (provider: string) => void;
  
  // Session actions
  loadSessions: () => void;
  createSession: (cwd?: string, mcpServers?: any[]) => void;
  switchSession: (sessionId: string, cwd?: string) => void;
  sendPrompt: (prompt: string, sessionId?: string) => void;
  clearMessages: () => void;
  
  // Permission actions
  respondToPermission: (requestId: string, outcome: PermissionOption) => void;
  dismissPermission: (requestId: string) => void;
}

export interface UseACPReturn extends ACPState, ACPActions {}

export interface UseACPOptions {
  defaultUrl?: string;
  autoConnect?: boolean;
}

export function useACP(options: UseACPOptions = {}): UseACPReturn {
  const { defaultUrl, autoConnect = true } = options;
  
  // WebSocket hook
  const ws = useACPWebSocket(defaultUrl);
  
  // Session hook
  const session = useACPSession({
    sendMessage: ws.sendMessage,
    subscribe: ws.subscribe,
    connectionStatus: ws.connectionStatus,
  });
  
  // Permission hook
  const permission = useACPPermission({
    sendMessage: ws.sendMessage,
    subscribe: ws.subscribe,
  });
  
  // Auto connect
  if (autoConnect && typeof window !== 'undefined' && ws.connectionStatus === 'disconnected') {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('wsUrl');
    const finalUrl = urlParam || defaultUrl || process.env.NEXT_PUBLIC_WS_URL || ws.wsUrl;
    if (finalUrl) {
      ws.connect(finalUrl);
    }
  }
  
  return {
    // WebSocket state
    connectionStatus: ws.connectionStatus,
    selectedProvider: ws.selectedProvider,
    agentCapabilities: ws.agentCapabilities,
    error: ws.error,
    wsUrl: ws.wsUrl,
    
    // Session state
    sessions: session.sessions,
    currentSession: session.currentSession,
    messages: session.messages,
    isLoading: session.isLoading,
    isCreatingSession: session.isCreatingSession,
    
    // Permission state
    pendingRequests: permission.pendingRequests,
    
    // WebSocket actions
    connect: ws.connect,
    disconnect: ws.disconnect,
    selectProvider: ws.selectProvider,
    
    // Session actions
    loadSessions: session.loadSessions,
    createSession: session.createSession,
    switchSession: session.switchSession,
    sendPrompt: session.sendPrompt,
    clearMessages: session.clearMessages,
    
    // Permission actions
    respondToPermission: permission.respondToPermission,
    dismissPermission: permission.dismissPermission,
  };
}

// Re-export individual hooks
export { useACPWebSocket } from './useACPWebSocket';
export { useACPSession } from './useACPSession';
export { useACPPermission } from './useACPPermission';

// Re-export types
export type { ACPWebSocketState, ACPWebSocketActions, UseACPWebSocketReturn } from './useACPWebSocket';
export type { ACPSessionState, ACPSessionActions, UseACPSessionReturn, UseACPSessionOptions } from './useACPSession';
export type { ACPPermissionState, ACPPermissionActions, UseACPPermissionReturn, UseACPPermissionOptions } from './useACPPermission';
