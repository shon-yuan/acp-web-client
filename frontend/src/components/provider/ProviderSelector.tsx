'use client';

import React, { useState } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Bot, Sparkles, TestTube } from 'lucide-react';

const providers = [
  {
    id: 'kimi',
    name: 'Kimi CLI',
    description: 'Moonshot Kimi Command Line Tool',
    icon: Sparkles,
    color: 'text-blue-400',
  },
  {
    id: 'claude',
    name: 'Claude ACP Agent',
    description: 'Anthropic Claude Code',
    icon: Bot,
    color: 'text-orange-400',
  },
  {
    id: 'mock',
    name: 'Mock Provider',
    description: 'Mock provider for testing',
    icon: TestTube,
    color: 'text-green-400',
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
    <div className="fixed inset-0 bg-github-bg flex items-center justify-center z-50">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-github-text-primary mb-2">
            ACP Web Client
          </h1>
          <p className="text-github-muted">
            Select an AI provider to start chatting
          </p>
        </div>

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
                  w-full p-4 rounded-lg border transition-all text-left
                  ${isSelected 
                    ? 'border-github-accent bg-github-accent/10' 
                    : 'border-github-border bg-github-surface hover:bg-github-surface-hover'
                  }
                  ${isSelecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-github-bg ${provider.color}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-github-text-primary">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-github-muted">
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

        {error && (
          <div className="mt-4 p-4 bg-github-danger/10 border border-github-danger rounded-lg">
            <p className="text-sm text-github-danger">{error}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-github-muted">
            Connection Status: <span className="capitalize">{connectionStatus}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
