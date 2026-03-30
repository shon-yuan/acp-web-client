import { useState, useCallback, useEffect } from 'react';
import type { WSMessage, Session, Message, MessageType } from '@/types/acp';

// Internal message type for hook state
interface ChatMessage {
  role: 'user' | 'assistant' | 'thought' | 'tool_call';
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  toolCallId?: string;
}

export interface ACPSessionState {
  sessions: Session[];
  currentSession: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isCreatingSession: boolean;
}

export interface ACPSessionActions {
  loadSessions: () => void;
  createSession: (cwd?: string, mcpServers?: any[]) => void;
  switchSession: (sessionId: string, cwd?: string) => void;
  sendPrompt: (prompt: string, sessionId?: string) => void;
  clearMessages: () => void;
}

export interface UseACPSessionReturn extends ACPSessionState, ACPSessionActions {
  handleHistory: (history: any[]) => void;
  handleNotification: (notification: any) => void;
}

export interface UseACPSessionOptions {
  sendMessage: (message: WSMessage) => void;
  subscribe: (callback: (message: WSMessage) => void) => () => void;
  connectionStatus: string;
}

export function useACPSession(options: UseACPSessionOptions): UseACPSessionReturn {
  const { sendMessage, subscribe, connectionStatus } = options;
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const handleSessionsList = useCallback((data: any) => {
    const sessionList = data?.sessions || [];
    setSessions(sessionList.map((s: any) => ({
      id: s.id || s.sessionId,
      cwd: s.cwd,
      createdAt: s.createdAt || s.created_at,
      updatedAt: s.updatedAt || s.updated_at,
    })));
  }, []);

  const handleSessionCreated = useCallback((data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      setCurrentSession(sessionId);
      setMessages([]);
      setIsCreatingSession(false);
      sendMessage({ type: 'list_sessions', data: {} });
    }
  }, [sendMessage]);

  const handleSessionSwitched = useCallback((data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      setCurrentSession(sessionId);
      if (data.history) {
        handleHistory(data.history);
      }
    }
  }, []);

  const handlePromptResponse = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleHistory = useCallback((history: any[]) => {
    const newMessages: ChatMessage[] = [];
    
    history.forEach((item) => {
      const update = item.update || {};
      const updateType = update.sessionUpdate;
      
      switch (updateType) {
        case 'user_message_chunk':
          const userContent = typeof update.content === 'string' 
            ? update.content 
            : update.content?.text || '';
          if (userContent) {
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg?.role === 'user') {
              lastMsg.content += userContent;
            } else {
              newMessages.push({ role: 'user', content: userContent });
            }
          }
          break;
          
        case 'agent_message_chunk':
          const agentContent = typeof update.content === 'string'
            ? update.content
            : update.content?.text || '';
          if (agentContent) {
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg?.role === 'assistant') {
              lastMsg.content += agentContent;
            } else {
              newMessages.push({ role: 'assistant', content: agentContent });
            }
          }
          break;
          
        case 'agent_thought_chunk':
          const thoughtContent = typeof update.content === 'string'
            ? update.content
            : update.content?.text || '';
          if (thoughtContent) {
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg?.role === 'thought') {
              lastMsg.content += thoughtContent;
            } else {
              newMessages.push({ role: 'thought', content: thoughtContent });
            }
          }
          break;
          
        case 'tool_call':
          const toolName = update._meta?.claudeCode?.toolName || 'tool';
          const toolInput = update.toolInput || update.arguments || {};
          newMessages.push({
            role: 'tool_call',
            content: '',
            toolName,
            toolInput,
            toolCallId: update.toolCallId,
          });
          break;
          
        case 'tool_call_update':
          const toolOutput = typeof update.content === 'string'
            ? update.content
            : JSON.stringify(update.content);
          const lastToolCall = [...newMessages].reverse().find(m => m.role === 'tool_call');
          if (lastToolCall) {
            lastToolCall.toolOutput = toolOutput;
          }
          break;
      }
    });
    
    setMessages(newMessages);
  }, []);

  const handleNotification = useCallback((notification: any) => {
    const params = notification.params || {};
    const update = params.update || {};
    const updateType = update.sessionUpdate;
    const chunk = update.chunk || update;

    switch (updateType) {
      case 'user_message_chunk':
        const userContent = typeof chunk?.content === 'string'
          ? chunk.content
          : chunk?.content?.text || '';
        if (userContent) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'user') {
              return [...prev.slice(0, -1), { ...last, content: last.content + userContent }];
            }
            return [...prev, { role: 'user', content: userContent }];
          });
        }
        break;

      case 'agent_message_chunk':
        const agentContent = typeof chunk?.content === 'string'
          ? chunk.content
          : chunk?.content?.text || '';
        if (agentContent) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), { ...last, content: last.content + agentContent }];
            }
            return [...prev, { role: 'assistant', content: agentContent }];
          });
        }
        break;

      case 'agent_thought_chunk':
        const thoughtContent = typeof chunk?.content === 'string'
          ? chunk.content
          : chunk?.content?.text || '';
        if (thoughtContent) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'thought') {
              return [...prev.slice(0, -1), { ...last, content: last.content + thoughtContent }];
            }
            return [...prev, { role: 'thought', content: thoughtContent }];
          });
        }
        break;

      case 'tool_call':
        const toolName = update._meta?.claudeCode?.toolName || 'tool';
        const toolInput = update.toolInput || update.arguments || {};
        setMessages(prev => [...prev, {
          role: 'tool_call',
          content: '',
          toolName,
          toolInput,
          toolCallId: update.toolCallId,
        }]);
        break;

      case 'tool_call_update':
        const toolOutput = typeof update.content === 'string'
          ? update.content
          : JSON.stringify(update.content);
        setMessages(prev => {
          const lastToolIdx = [...prev].reverse().findIndex(m => m.role === 'tool_call');
          if (lastToolIdx >= 0) {
            const idx = prev.length - 1 - lastToolIdx;
            return prev.map((m, i) => i === idx ? { ...m, toolOutput } : m);
          }
          return prev;
        });
        break;

      case 'available_commands_update':
        break;
    }
  }, []);

  const loadSessions = useCallback(() => {
    sendMessage({ type: 'list_sessions', data: {} });
  }, [sendMessage]);

  const createSession = useCallback((cwd?: string, mcpServers?: any[]) => {
    setIsCreatingSession(true);
    sendMessage({
      type: 'create_session',
      data: { cwd: cwd || '/tmp', mcpServers: mcpServers || [] }
    });
  }, [sendMessage]);

  const switchSession = useCallback((sessionId: string, cwd?: string) => {
    sendMessage({
      type: 'switch_session',
      data: { sessionId, cwd: cwd || '/tmp', mcpServers: [] }
    });
  }, [sendMessage]);

  const sendPrompt = useCallback((prompt: string, sessionId?: string) => {
    const targetSession = sessionId || currentSession;
    if (!targetSession) return;
    
    setIsLoading(true);
    sendMessage({
      type: 'prompt',
      data: { prompt, sessionId: targetSession, context: [] }
    });
  }, [sendMessage, currentSession]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      const { type, data } = message;
      
      switch (type) {
        case 'sessions_list':
          handleSessionsList(data);
          break;
        case 'session_created':
          handleSessionCreated(data);
          break;
        case 'session_switched':
          handleSessionSwitched(data);
          break;
        case 'prompt_response':
          handlePromptResponse();
          break;
        case 'notification':
          handleNotification(data);
          break;
        case 'error':
          setIsLoading(false);
          setIsCreatingSession(false);
          break;
      }
    });

    return unsubscribe;
  }, [subscribe, handleSessionsList, handleSessionCreated, handleSessionSwitched, handlePromptResponse, handleNotification]);

  useEffect(() => {
    if (connectionStatus === 'ready') {
      loadSessions();
    }
  }, [connectionStatus, loadSessions]);

  return {
    sessions,
    currentSession,
    messages,
    isLoading,
    isCreatingSession,
    loadSessions,
    createSession,
    switchSession,
    sendPrompt,
    clearMessages,
    handleHistory,
    handleNotification,
  };
}
