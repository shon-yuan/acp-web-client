import { useState, useCallback, useEffect } from 'react';
import type { WSMessage, PermissionRequest, PermissionOption } from '@/types/acp';

export interface ACPPermissionState {
  pendingRequests: PermissionRequest[];
}

export interface ACPPermissionActions {
  respondToPermission: (requestId: string, outcome: PermissionOption) => void;
  dismissPermission: (requestId: string) => void;
}

export interface UseACPPermissionReturn extends ACPPermissionState, ACPPermissionActions {}

export interface UseACPPermissionOptions {
  sendMessage: (message: WSMessage) => void;
  subscribe: (callback: (message: WSMessage) => void) => () => void;
}

export function useACPPermission(options: UseACPPermissionOptions): UseACPPermissionReturn {
  const { sendMessage, subscribe } = options;
  
  const [pendingRequests, setPendingRequests] = useState<PermissionRequest[]>([]);

  const respondToPermission = useCallback((requestId: string, outcome: PermissionOption) => {
    sendMessage({
      type: 'permission_response',
      data: { requestId, outcome }
    });
    
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
  }, [sendMessage]);

  const dismissPermission = useCallback((requestId: string) => {
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((message: WSMessage) => {
      const { type, data, requestId } = message;

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
        
        let toolName = permissionData?.toolName 
          || permissionData?.tool 
          || permissionData?.name 
          || 'unknown';
        
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
    });

    return unsubscribe;
  }, [subscribe]);

  return {
    pendingRequests,
    respondToPermission,
    dismissPermission,
  };
}
