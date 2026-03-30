'use client';

import React, { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';
import type { 
  ConnectionStatus, 
  WSMessage, 
  WSResponseType,
  ReadyData,
  ErrorData,
  PermissionRequestData
} from '@/types/acp';

interface WebSocketContextType {
  // State
  connectionStatus: ConnectionStatus;
  selectedProvider: string | null;
  agentCapabilities: Record<string, unknown> | null;
  error: string | null;
  wsUrl: string;
  
  // Methods
  connect: (url: string) => void;
  disconnect: () => void;
  selectProvider: (provider: string) => void;
  sendMessage: <T>(message: WSMessage<T>) => void;
  respondToPermission: (requestId: string, outcome: string) => void;
  
  // Internal use - for message listeners
  messageListenersRef?: React.MutableRefObject<Set<(message: WSMessage) => void>>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  defaultUrl?: string;
}

export function WebSocketProvider({ children, defaultUrl }: WebSocketProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [agentCapabilities, setAgentCapabilities] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>('ws://localhost:9178');
  const [isClient, setIsClient] = useState(false);
  
  // Client initialization
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('wsUrl');
      const finalUrl = urlParam || defaultUrl || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:9178';
      setWsUrl(finalUrl);
    }
  }, [defaultUrl]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messageListenersRef = useRef<Set<(message: WSMessage) => void>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Notify all listeners
  const notifyListeners = useCallback((message: WSMessage) => {
    messageListenersRef.current.forEach((listener) => {
      try {
        listener(message);
      } catch (e) {
      }
    });
  }, [])

  // Generate or retrieve persistent client ID
  const getClientId = useCallback(() => {
    if (typeof window === 'undefined') return '';
    let clientId = localStorage.getItem('acp_client_id');
    if (!clientId) {
      clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('acp_client_id', clientId);
    }
    return clientId;
  }, []);

  // Connect WebSocket
  const connect = useCallback((url: string) => {
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setWsUrl(url);
    setConnectionStatus('connecting');
    setError(null);

    try {
      // Ensure URL is correct WebSocket protocol
      let wsUrl = url;
      if (url.startsWith('http://')) {
        wsUrl = url.replace('http://', 'ws://');
      } else if (url.startsWith('https://')) {
        wsUrl = url.replace('https://', 'wss://');
      }
      
      // Add client_id to URL for reconnection tracking
      const clientId = getClientId();
      const separator = wsUrl.includes('?') ? '&' : '?';
      wsUrl = `${wsUrl}${separator}clientId=${clientId}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('awaiting_provider');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleMessage(message);
          notifyListeners(message);
        } catch (e) {
        }
      };

      ws.onerror = (e) => {
        setError(`WebSocket connection error: ${wsUrl}`);
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Auto reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect(url);
          }, delay);
        }
      };
    } catch (e) {
      setError('Failed to create WebSocket connection');
      setConnectionStatus('error');
    }
  }, [notifyListeners]);

  // Handle received messages
  const handleMessage = useCallback((message: WSMessage) => {
    const { type, data } = message;

    switch (type as WSResponseType) {
      case 'ready':
        const readyData = data as ReadyData;
        setConnectionStatus('ready');
        setAgentCapabilities(readyData?.agentCapabilities || null);
        setSelectedProvider(prev => prev); // Keep current provider selection
        break;

      case 'error':
        const errorData = data as ErrorData;
        setError(errorData?.message || 'Unknown error');
        break;

      case 'provider_error':
        const providerErrorData = data as ErrorData & { provider?: string };
        setError(`Provider error: ${providerErrorData?.message || 'Unknown'}`);
        setConnectionStatus('error');
        break;

      case 'provider_connecting':
        setConnectionStatus('connecting');
        break;

      case 'pong':
        // Heartbeat response, no processing needed
        break;
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
    setSelectedProvider(null);
    setAgentCapabilities(null);
  }, []);

  // Select provider
  const selectProvider = useCallback((provider: string) => {
    setSelectedProvider(provider);
    setError(null);
    
    sendMessage({
      type: 'select_provider',
      data: { provider }
    });
  }, []);

  // Send message
  const sendMessage = useCallback(<T,>(message: WSMessage<T>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
    }
  }, [])

  // Respond to permission request
  const respondToPermission = useCallback((requestId: string, outcome: string) => {
    sendMessage({
      type: 'permission_response',
      data: { requestId, outcome }
    });
  }, [sendMessage]);

  // Initial connection - only connect on client and after URL is set
  useEffect(() => {
    if (!isClient) return;
    // Don't auto-connect in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    if (wsUrl) {
      connect(wsUrl);
    }

    return () => {
      disconnect();
    };
  }, [isClient]);

  // Keep-alive heartbeat
  useEffect(() => {
    if (connectionStatus !== 'ready') return;

    const interval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000);

    return () => clearInterval(interval);
  }, [connectionStatus, sendMessage]);

  const value: WebSocketContextType = {
    connectionStatus,
    selectedProvider,
    agentCapabilities,
    error,
    wsUrl,
    connect,
    disconnect,
    selectProvider,
    sendMessage,
    respondToPermission,
    messageListenersRef,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}

// Hook for listening to messages
export function useWebSocketMessage(callback: (message: WSMessage) => void) {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketMessage must be used within WebSocketProvider');
  }

  // Use ref to keep callback function reference up to date
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const listeners = context.messageListenersRef;
    
    if (listeners) {
      // Wrapper function, always calls latest callback
      const wrappedCallback = (message: WSMessage) => {
        callbackRef.current(message);
      };
      
      listeners.current.add(wrappedCallback);
      
      return () => {
        listeners.current.delete(wrappedCallback);
      };
    }
  }, [context]); // Only depend on context, not callback
}
