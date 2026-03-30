import { useRef, useState, useCallback, useEffect } from 'react';
import type { ConnectionStatus, WSMessage, WSResponseType, ReadyData, ErrorData } from '@/types/acp';

export interface ACPWebSocketState {
  connectionStatus: ConnectionStatus;
  selectedProvider: string | null;
  agentCapabilities: Record<string, unknown> | null;
  error: string | null;
  wsUrl: string;
}

export interface ACPWebSocketActions {
  connect: (url: string) => void;
  disconnect: () => void;
  selectProvider: (provider: string) => void;
  sendMessage: <T>(message: WSMessage<T>) => void;
  respondToPermission: (requestId: string, outcome: string) => void;
  subscribe: (callback: (message: WSMessage) => void) => () => void;
}

export interface UseACPWebSocketReturn extends ACPWebSocketState, ACPWebSocketActions {}

export function useACPWebSocket(defaultUrl?: string): UseACPWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [agentCapabilities, setAgentCapabilities] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>(defaultUrl || 'ws://localhost:9178');
  
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<(message: WSMessage) => void>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const notifyListeners = useCallback((message: WSMessage) => {
    listenersRef.current.forEach((listener) => {
      try {
        listener(message);
      } catch (e) {}
    });
  }, []);

  const getClientId = useCallback(() => {
    if (typeof window === 'undefined') return '';
    let clientId = localStorage.getItem('acp_client_id');
    if (!clientId) {
      clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('acp_client_id', clientId);
    }
    return clientId;
  }, []);

  const handleMessage = useCallback((message: WSMessage) => {
    const { type, data } = message;

    switch (type as WSResponseType) {
      case 'ready':
        const readyData = data as ReadyData;
        setConnectionStatus('ready');
        setAgentCapabilities(readyData?.agentCapabilities || null);
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
        break;
    }
  }, []);

  const connect = useCallback((url: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setWsUrl(url);
    setConnectionStatus('connecting');
    setError(null);

    try {
      let wsUrl = url;
      if (url.startsWith('http://')) {
        wsUrl = url.replace('http://', 'ws://');
      } else if (url.startsWith('https://')) {
        wsUrl = url.replace('https://', 'wss://');
      }
      
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
        } catch (e) {}
      };

      ws.onerror = () => {
        setError(`WebSocket connection error: ${wsUrl}`);
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;

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
  }, [getClientId, handleMessage, notifyListeners]);

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

  const selectProvider = useCallback((provider: string) => {
    setSelectedProvider(provider);
    setError(null);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'select_provider',
        data: { provider }
      }));
    }
  }, []);

  const sendMessage = useCallback(<T,>(message: WSMessage<T>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const respondToPermission = useCallback((requestId: string, outcome: string) => {
    sendMessage({
      type: 'permission_response',
      data: { requestId, outcome }
    });
  }, [sendMessage]);

  const subscribe = useCallback((callback: (message: WSMessage) => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    if (connectionStatus !== 'ready') return;

    const interval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000);

    return () => clearInterval(interval);
  }, [connectionStatus, sendMessage]);

  return {
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
    subscribe,
  };
}
