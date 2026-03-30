'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useWebSocketContext, useWebSocketMessage } from './WebSocketContext';
import type { PermissionRequest, PermissionOption, WSMessage } from '@/types/acp';

interface PermissionContextType {
  // State
  pendingRequests: PermissionRequest[];
  
  // Methods
  respondToPermission: (requestId: string, outcome: PermissionOption) => void;
  dismissPermission: (requestId: string) => void;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { respondToPermission: sendPermissionResponse } = useWebSocketContext();
  
  const [pendingRequests, setPendingRequests] = useState<PermissionRequest[]>([]);

  // Respond to permission request
  const respondToPermission = useCallback((requestId: string, outcome: PermissionOption) => {
    sendPermissionResponse(requestId, outcome);
    
    // Remove from pending list
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
  }, [sendPermissionResponse]);

  // Dismiss permission request (without responding)
  const dismissPermission = useCallback((requestId: string) => {
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
  }, []);

  // Listen to WebSocket messages
  useWebSocketMessage((message: WSMessage) => {
    const { type, data, requestId } = message;
    
    // 调试日志

    if (type === 'permission_request' && requestId) {
      
      const permissionData = data as { 
        toolName?: string; 
        tool?: string;
        name?: string;
        toolCall?: { 
          name?: string; 
          toolName?: string;
          title?: string;
          kind?: string;
        };
        arguments?: Record<string, unknown>;
      };
      
      // Try to extract tool name from various possible fields
      let toolName = permissionData?.toolName 
        || permissionData?.tool 
        || permissionData?.name 
        || 'unknown';
      
      // Check toolCall object for tool name
      if (toolName === 'unknown' && permissionData?.toolCall) {
        toolName = permissionData.toolCall.name 
          || permissionData.toolCall.toolName 
          || permissionData.toolCall.title 
          || permissionData.toolCall.kind 
          || 'unknown';
      }
      
      const newRequest: PermissionRequest = {
        id: requestId,
        toolName: toolName,
        arguments: permissionData?.arguments || {},
        timestamp: Date.now(),
      };

      setPendingRequests(prev => [...prev, newRequest]);
    }

    if (type === 'permission_response_ack') {
    }
  });

  const value: PermissionContextType = {
    pendingRequests,
    respondToPermission,
    dismissPermission,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within PermissionProvider');
  }
  return context;
}
