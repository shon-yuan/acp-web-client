'use client';

import React, { useState } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { Loading } from '@/components/ui/Loading';
import { Bot, Sparkles, TestTube } from 'lucide-react';

const providers = [
  {
    id: 'kimi',
    name: 'Kimi CLI',
    description: 'Moonshot Kimi command line tool',
    icon: Sparkles,
    color: 'text-blue-400',
    glowColor: 'shadow-blue-400/30',
  },
  {
    id: 'claude',
    name: 'Claude ACP Agent',
    description: 'Anthropic Claude Code',
    icon: Bot,
    color: 'text-orange-400',
    glowColor: 'shadow-orange-400/30',
  },
  {
    id: 'mock',
    name: 'Mock Provider',
    description: 'Mock provider for testing',
    icon: TestTube,
    color: 'text-green-400',
    glowColor: 'shadow-green-400/30',
  },
];

export function ProviderSelector() {
  const { connectionStatus, selectProvider, error } = useWebSocketContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (providerId: string) => {
    setSelectedId(providerId);
    selectProvider(providerId);
  };

  const isSelecting = connectionStatus === 'connecting';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)'
      }}
    >
      <div className="glass-panel max-w-md w-full p-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 
                          border border-white/20 flex items-center justify-center glow">
            <Bot size={32} className="text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">
            ACP Web Client
          </h1>
          <p className="text-slate-400">
            Select an AI provider to start chatting
          </p>
        </div>

        {/* Provider List */}
        <div className="space-y-3">
          {providers.map((provider) => {
            const Icon = provider.icon;
            const isSelected = selectedId === provider.id;
            const isLoading = isSelecting && isSelected;

            return (
              <button
                key={provider.id}
                onClick={() => handleSelect(provider.id)}
                disabled={isSelecting}
                className={`
                  w-full p-4 rounded-xl border transition-all duration-300 text-left
                  ${isSelected 
                    ? `bg-blue-500/20 border-blue-400/50 shadow-lg ${provider.glowColor}` 
                    : 'glass-card-hover'
                  }
                  ${isSelecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br from-white/10 to-white/5 
                                  border border-white/20 ${provider.color} shadow-lg ${provider.glowColor}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {provider.description}
                    </p>
                  </div>
                  {isLoading && (
                    <Loading size="sm" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 backdrop-blur-md border border-red-400/30 rounded-xl">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Connection Status */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'ready' ? 'bg-green-400 shadow-lg shadow-green-400/50' :
            connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            connectionStatus === 'error' ? 'bg-red-400' :
            'bg-slate-400'
          }`} />
          <p className="text-sm text-slate-400 capitalize">
            {connectionStatus === 'awaiting_provider' ? 'Awaiting Provider' : connectionStatus}
          </p>
        </div>
      </div>
    </div>
  );
}
