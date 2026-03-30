// WebSocket message types
export type WSMessageType = 
  | 'select_provider'
  | 'list_sessions'
  | 'create_session'
  | 'switch_session'
  | 'close_session'
  | 'prompt'
  | 'permission_response'
  | 'ping';

// Server response types
export type WSResponseType =
  | 'ready'
  | 'error'
  | 'provider_connecting'
  | 'provider_error'
  | 'sessions_list'
  | 'session_created'
  | 'session_switched'
  | 'notification'
  | 'permission_request'
  | 'permission_response_ack'
  | 'prompt_response'
  | 'pong';

// Provider configuration
export interface ProviderConfig {
  id: string;
  name: string;
  cmd: string;
  args: string[];
  available: boolean;
}

// Session
export interface Session {
  id: string;
  cwd: string;
  createdAt?: string;
  updatedAt?: string;
  title?: string;  // Session title (first user message)
}

// Message types
export type MessageType = 
  | 'user' 
  | 'agent' 
  | 'thought' 
  | 'tool_call' 
  | 'tool_result' 
  | 'system';

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: number;
  metadata?: {
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolOutput?: unknown;
    status?: 'pending' | 'success' | 'error';
  };
}

// Permission request
export interface PermissionRequest {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  timestamp: number;
}

// Permission options
export type PermissionOption = 
  | 'allow_once'
  | 'allow_session'
  | 'deny_once'
  | 'deny_session';

// WebSocket connection status
export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'awaiting_provider'
  | 'ready'
  | 'error';

// WebSocket message structure
export interface WSMessage<T = unknown> {
  type: WSMessageType | WSResponseType;
  data?: T;
  requestId?: string;
}

// Notification update types
export type NotificationUpdateType =
  | 'user_message_chunk'
  | 'agent_message_chunk'
  | 'agent_thought_chunk'
  | 'tool_call'
  | 'tool_call_update'
  | 'sessionUpdate';

export interface NotificationUpdate {
  sessionUpdate: NotificationUpdateType;
  chunk?: string;
  content?: string | { type?: string; text?: string };
  // tool_call related fields (Claude ACP format)
  title?: string;
  rawInput?: Record<string, unknown>;
  arguments?: Record<string, unknown>;
  toolCallId?: string;
  kind?: string;
  locations?: unknown[];
  toolCall?: {
    name?: string;
    toolName?: string;
    title?: string;
    arguments?: Record<string, unknown>;
    rawInput?: Record<string, unknown>;
    toolCallId?: string;
    kind?: string;
  };
  toolResult?: unknown;
  status?: 'pending' | 'success' | 'error';
  _meta?: {
    claudeCode?: {
      toolName?: string;
    };
  };
}

// Notification parameters
export interface NotificationParams {
  method?: string;
  params?: {
    update?: NotificationUpdate;
    sessionId?: string;
    [key: string]: unknown;
  };
}

// Sessions list response
export interface SessionsListData {
  sessions: Session[];
}

// Session created response
export interface SessionCreatedData {
  sessionId: string;
}

// Session switched response
export interface SessionSwitchedData {
  sessionId: string;
  history?: Array<{
    type: NotificationUpdateType;
    update: {
      sessionUpdate: NotificationUpdateType;
      chunk?: string;
      content?: string | { type?: string; text?: string };
      toolCall?: { name: string; arguments: Record<string, unknown> };
      toolResult?: unknown;
      status?: 'pending' | 'success' | 'error';
    };
  }>;
}

// Prompt response
export interface PromptResponseData {
  result?: string;
  error?: string;
}

// Permission request data
export interface PermissionRequestData {
  requestId?: string;
  toolName?: string;
  arguments?: Record<string, unknown>;
  [key: string]: unknown;
}

// Provider selection data
export interface SelectProviderData {
  provider: string;
}

// Create session data
export interface CreateSessionData {
  cwd?: string;
  mcpServers?: string[];
}

// Switch session data
export interface SwitchSessionData {
  sessionId: string;
  cwd?: string;
}

// Send prompt data
export interface SendPromptData {
  prompt: string;
  sessionId?: string;
  context?: unknown[];
}

// Permission response data
export interface PermissionResponseData {
  requestId: string;
  outcome: PermissionOption;
}

// Ready data
export interface ReadyData {
  agentCapabilities?: Record<string, unknown>;
  provider?: string;
}

// Error data
export interface ErrorData {
  message: string;
}
