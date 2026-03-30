'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useWebSocketContext, useWebSocketMessage } from './WebSocketContext';
import type { 
  Session, 
  Message, 
  WSMessage,
  SessionsListData,
  SessionCreatedData,
  SessionSwitchedData,
  NotificationParams,
  PromptResponseData,
  NotificationUpdateType
} from '@/types/acp';

interface SessionContextType {
  // State
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  isCreatingSession: boolean;
  workingDirectory: string;
  
  // Session management
  listSessions: (cwd?: string) => void;
  createSession: (cwd?: string, mcpServers?: string[]) => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  
  // Messages
  sendPrompt: (prompt: string) => void;
  clearMessages: () => void;
  
  // Configuration
  setWorkingDirectory: (cwd: string) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

interface SessionProviderProps {
  children: ReactNode;
  defaultWorkingDirectory?: string;
}

export function SessionProvider({ children, defaultWorkingDirectory = '/home/xuyuan/workspace' }: SessionProviderProps) {
  const { sendMessage, connectionStatus } = useWebSocketContext();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [workingDirectory, setWorkingDirectory] = useState(defaultWorkingDirectory);

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // List sessions
  const listSessions = useCallback((cwd?: string) => {
    sendMessage({
      type: 'list_sessions',
      data: { cwd: cwd || workingDirectory }
    });
  }, [sendMessage, workingDirectory]);

  // Create session
  const createSession = useCallback((cwd?: string, mcpServers?: string[]) => {
    setIsCreatingSession(true);
    setMessages([]); // Clear current messages
    sendMessage({
      type: 'create_session',
      data: { 
        cwd: cwd || workingDirectory,
        mcpServers: mcpServers || []
      }
    });
  }, [sendMessage, workingDirectory]);

  // Switch session
  const switchSession = useCallback((sessionId: string) => {
    // Clear current messages
    setMessages([]);
    setIsCreatingSession(true);
    
    sendMessage({
      type: 'switch_session',
      data: { 
        sessionId,
        cwd: workingDirectory
      }
    });
  }, [sendMessage, workingDirectory]);

  // Delete session
  const deleteSession = useCallback((sessionId: string) => {
    // Remove from local state
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    // If deleting current session, clear current session ID and messages
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    
    // Notify server to close session (ACP protocol uses session/cancel or session/close)
    sendMessage({
      type: 'close_session',
      data: { sessionId }
    });
  }, [sendMessage, currentSessionId]);

  // Clear all sessions
  const clearAllSessions = useCallback(() => {
    // Clear local state
    setSessions([]);
    setCurrentSessionId(null);
    setMessages([]);
    
    // Notify server to clear (can batch send or handle server-side)
    sessions.forEach(session => {
      sendMessage({
        type: 'close_session',
        data: { sessionId: session.id }
      });
    });
  }, [sendMessage, sessions]);

  // Use ref to keep currentSessionId up to date
  const currentSessionIdRef = useRef(currentSessionId);
  currentSessionIdRef.current = currentSessionId;

  // Send prompt
  const sendPrompt = useCallback((prompt: string) => {
    if (!prompt.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      type: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Use ref to get latest sessionId
    const sessionId = currentSessionIdRef.current;
    
    sendMessage({
      type: 'prompt',
      data: {
        prompt: prompt.trim(),
        sessionId: sessionId,
        context: []
      }
    });
  }, [sendMessage]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Handle notification messages
  const handleNotification = useCallback((notification: NotificationParams) => {
    const method = notification.method || '';
    const params = notification.params || {};
    const update = params.update;

    if (!update) return;

    const updateType = update.sessionUpdate as NotificationUpdateType;
    // Handle different message content formats (chunk or content.text)
    let chunk = update.chunk || '';
    const content = update.content || '';
    
    // DEBUG: Log notification
    
    // If chunk is empty but content exists, try to extract from content
    if (!chunk && content) {
      if (typeof content === 'string') {
        chunk = content;
      } else if (typeof content === 'object' && content !== null) {
        const contentObj = content as { text?: string; type?: string };
        if (contentObj.text) {
          chunk = contentObj.text;
        }
      }
    }

    switch (updateType) {
      case 'user_message_chunk':
        // User message chunk - if first message, update session title
        if (chunk) {
          const sessionId = params.sessionId || currentSessionId;
          if (sessionId) {
            setSessions(prev => {
              const session = prev.find(s => s.id === sessionId);
              // Only set if no title exists (using first message as reference)
              if (session && !session.title) {
                return prev.map(s => 
                  s.id === sessionId 
                    ? { ...s, title: chunk.slice(0, 50) }
                    : s
                );
              }
              return prev;
            });
          }
        }
        break;

      case 'agent_message_chunk':
        // Agent message chunk - append to latest agent message
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.type === 'agent') {
            // Append to existing message
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + chunk
            };
            return updated;
          } else {
            // Create new message (previous may be thought or tool_call)
            return [...prev, {
              id: generateId(),
              type: 'agent',
              content: chunk,
              timestamp: Date.now(),
            }];
          }
        });
        // Reset loading state (using functional update)
        setIsLoading(prev => prev ? false : prev);
        break;

      case 'agent_thought_chunk':
        // Agent thought process
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.type === 'thought') {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + chunk
            };
            return updated;
          } else {
            return [...prev, {
              id: generateId(),
              type: 'thought',
              content: chunk,
              timestamp: Date.now(),
            }];
          }
        });
        // Reset loading state (using functional update)
        setIsLoading(prev => prev ? false : prev);
        break;

      case 'tool_call':
        // Tool call - handle different tool name formats
        // Claude ACP format: tool data directly on update, not in update.toolCall
        const toolName = update.title || 
                        update._meta?.claudeCode?.toolName || 
                        update.toolCallId || 
                        'unknown';
        const toolInput = update.rawInput || update.arguments || {};
        setMessages(prev => [...prev, {
          id: generateId(),
          type: 'tool_call',
          content: toolName,
          timestamp: Date.now(),
          metadata: {
            toolName: toolName,
            toolInput: toolInput,
            status: update.status || 'pending'
          }
        }]);
        break;

      case 'tool_call_update':
        // Tool call update
        setMessages(prev => {
          const toolCallIndex = prev.findIndex(
            m => m.type === 'tool_call' && m.metadata?.status === 'pending'
          );
          
          if (toolCallIndex !== -1) {
            const updated = [...prev];
            updated[toolCallIndex] = {
              ...updated[toolCallIndex],
              metadata: {
                ...updated[toolCallIndex].metadata,
                status: update.status || 'success',
                toolOutput: update.toolResult
              }
            };
            return updated;
          }
          return prev;
        });
        break;
    }
  }, []);

  // Extract text from history message content (handle different formats)
  const extractHistoryContent = (update: any, type: string): string => {
    const content = update.content;
    
    // Parse JSON content
    let parsedContent: any = content;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch {
        // Not JSON, use original string
      }
    }
    
    // Get raw text
    let rawText = '';
    
    // Handle array format
    if (Array.isArray(parsedContent)) {
      const texts: string[] = [];
      for (const item of parsedContent) {
        const text = item?.text || item?.content?.text || '';
        if (text) texts.push(text);
      }
      rawText = texts.join('');
    } else if (typeof parsedContent === 'object' && parsedContent !== null) {
      rawText = parsedContent.text || '';
    } else if (typeof parsedContent === 'string') {
      rawText = parsedContent;
    }
    
    // For user messages, handle special format
    if (type === 'user_message_chunk' && rawText) {
      // Remove all XML tags and their content
      let cleanedText = rawText.replace(/<[^>]+>.*?<\/[^>]+>/g, '').trim();
      // Remove remaining tags again
      cleanedText = cleanedText.replace(/<[^>]+>/g, '').trim();
      return cleanedText;
    }
    
    return rawText;
  };

  // Handle history messages
  const handleHistory = useCallback((history: Array<{ type: NotificationUpdateType; update: any }>) => {
    if (!history || history.length === 0) return;

    const newMessages: Message[] = [];
    let currentAgentMessage = '';
    let currentThoughtMessage = '';
    let currentUserMessage = '';

    history.forEach((item, index) => {
      const { type, update } = item;
      const chunk = extractHistoryContent(update, type);

      // Skip empty content (except tool_call)
      if (!chunk && type !== 'tool_call') {
        return; // Use return instead of continue in forEach
      }

      switch (type) {
        case 'user_message_chunk':
          // Save previous agent message first
          if (currentAgentMessage) {
            newMessages.push({
              id: generateId(),
              type: 'agent',
              content: currentAgentMessage,
              timestamp: Date.now(),
            });
            currentAgentMessage = '';
          }
          if (chunk) currentUserMessage += chunk;
          break;

        case 'agent_message_chunk':
          // If there was a user message before, save it first
          if (currentUserMessage) {
            newMessages.push({
              id: generateId(),
              type: 'user',
              content: currentUserMessage,
              timestamp: Date.now(),
            });
            currentUserMessage = '';
          }
          if (chunk) currentAgentMessage += chunk;
          break;

        case 'agent_thought_chunk':
          if (chunk) currentThoughtMessage += chunk;
          break;

        case 'tool_call':
          // Extract tool name from history messages
          const historyToolName = update.title || 
                                  update._meta?.claudeCode?.toolName || 
                                  update.toolCallId || 
                                  'unknown';
          if (currentAgentMessage) {
            newMessages.push({
              id: generateId(),
              type: 'agent',
              content: currentAgentMessage,
              timestamp: Date.now(),
            });
            currentAgentMessage = '';
          }
          if (currentThoughtMessage) {
            newMessages.push({
              id: generateId(),
              type: 'thought',
              content: currentThoughtMessage,
              timestamp: Date.now(),
            });
            currentThoughtMessage = '';
          }
          newMessages.push({
            id: generateId(),
            type: 'tool_call',
            content: historyToolName,
            timestamp: Date.now(),
            metadata: {
              toolName: historyToolName,
              status: 'success'
            }
          });
          break;
      }
    });

    // Add remaining messages
    if (currentUserMessage) {
      newMessages.push({
        id: generateId(),
        type: 'user',
        content: currentUserMessage,
        timestamp: Date.now(),
      });
    }
    if (currentAgentMessage) {
      newMessages.push({
        id: generateId(),
        type: 'agent',
        content: currentAgentMessage,
        timestamp: Date.now(),
      });
    }
    if (currentThoughtMessage) {
      newMessages.push({
        id: generateId(),
        type: 'thought',
        content: currentThoughtMessage,
        timestamp: Date.now(),
      });
    }

    setMessages(newMessages);
  }, []);

  // Listen to WebSocket messages
  useWebSocketMessage((message: WSMessage) => {
    const { type, data } = message;

    switch (type) {
      case 'sessions_list':
        const sessionsData = data as SessionsListData;
        setSessions(sessionsData?.sessions || []);
        break;

      case 'session_created':
        const createdData = data as SessionCreatedData;
        if (createdData?.sessionId) {
          setCurrentSessionId(createdData.sessionId);
          setIsCreatingSession(false);
          // Refresh session list
          listSessions();
        }
        break;

      case 'session_switched':
        const switchedData = data as SessionSwitchedData;
        if (switchedData?.sessionId) {
          setCurrentSessionId(switchedData.sessionId);
          if (switchedData.history) {
            handleHistory(switchedData.history);
            
            // Extract first user message from history as session title
            const firstUserMessage = switchedData.history.find(
              (item: any) => item.type === 'user_message_chunk'
            );
            if (firstUserMessage) {
              const title = extractHistoryContent(firstUserMessage.update, 'user_message_chunk');
              if (title) {
                // 更新会话列表中的标题
                setSessions(prev => prev.map(s => 
                  s.id === switchedData.sessionId 
                    ? { ...s, title: title.slice(0, 50) }  // Limit title length
                    : s
                ));
              }
            }
          }
          setIsCreatingSession(false);
        }
        break;

      case 'notification':
        const notificationData = data as NotificationParams;
        handleNotification(notificationData);
        break;

      case 'prompt_response':
        setIsLoading(false);
        break;

      case 'permission_request':
        // Stop loading when receiving permission request, allowing user to interact with permission modal
        setIsLoading(false);
        break;

      case 'error':
        setIsLoading(false);
        break;
    }
  });

  // List sessions when connection is ready
  useEffect(() => {
    if (connectionStatus === 'ready') {
      listSessions();
    }
  }, [connectionStatus, listSessions]);

  const value: SessionContextType = {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    isCreatingSession,
    workingDirectory,
    listSessions,
    createSession,
    switchSession,
    deleteSession,
    clearAllSessions,
    sendPrompt,
    clearMessages,
    setWorkingDirectory,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
