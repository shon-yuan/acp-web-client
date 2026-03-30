'use client';

import React from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export function ConnectionStatus() {
  const { connectionStatus, error, wsUrl } = useWebSocketContext();

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'ready':
        return {
          icon: <Wifi size={14} className="text-green-400" />,
          text: 'Connected',
          className: 'bg-green-500/10 text-green-400 border-green-500/30',
        };
      case 'connecting':
      case 'awaiting_provider':
        return {
          icon: <Loader2 size={14} className="animate-spin text-yellow-400" />,
          text: 'Connecting...',
          className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        };
      case 'error':
        return {
          icon: <WifiOff size={14} className="text-red-400" />,
          text: error || 'Connection Failed',
          className: 'bg-red-500/10 text-red-400 border-red-500/30',
        };
      default:
        return {
          icon: <WifiOff size={14} className="text-github-muted" />,
          text: 'Not Connected',
          className: 'bg-github-surface text-github-muted border-github-border',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border
          ${config.className}
        `}
        title={`WebSocket: ${wsUrl}`}
      >
        {config.icon}
        <span className="hidden sm:inline">{config.text}</span>
      </div>
    </div>
  );
}
