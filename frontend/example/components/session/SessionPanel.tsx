'use client';

import React, { useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/Button';
import { Plus, Folder, RefreshCw, MessageSquare } from 'lucide-react';

export function SessionPanel() {
  const { sessions, currentSessionId, createSession, switchSession } = useSession();
  const [showNewSession, setShowNewSession] = useState(false);

  const handleCreateSession = () => {
    createSession();
    setShowNewSession(false);
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="glass-panel border-r border-white/10 flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-400" />
            Sessions
          </h2>
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateSession}
          className="w-full"
        >
          <Plus size={16} className="mr-1.5" />
          New Session
        </Button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto glass-scrollbar p-2 space-y-1">
        {sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
              <Folder size={24} className="text-slate-500" />
            </div>
            <p className="text-sm text-slate-500">No sessions</p>
            <p className="text-xs text-slate-600 mt-1">Click above to create a new session</p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === currentSessionId;
            return (
              <button
                key={session.id}
                onClick={() => switchSession(session.id)}
                className={`
                  w-full text-left p-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-500/20 border border-blue-400/50 shadow-lg shadow-blue-500/10' 
                    : 'glass-card-hover hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    isActive ? 'bg-blue-400 shadow-lg shadow-blue-400/50' : 'bg-slate-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {session.title || 'Untitled Session'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatTime(session.updatedAt)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <p className="text-xs text-slate-500 text-center">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
