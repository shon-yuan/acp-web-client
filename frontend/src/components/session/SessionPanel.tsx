'use client';

import React, { useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/Button';
import { Plus, Folder, RefreshCw, Edit2, Check, X, Trash2, AlertTriangle } from 'lucide-react';

export function SessionPanel() {
  const { sessions, currentSessionId, createSession, switchSession, listSessions, deleteSession, clearAllSessions, workingDirectory, setWorkingDirectory } = useSession();
  const [showNewSession, setShowNewSession] = useState(false);
  const [isEditingCwd, setIsEditingCwd] = useState(false);
  const [cwdInput, setCwdInput] = useState(workingDirectory);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleCreateSession = () => {
    createSession();
    setShowNewSession(false);
  };

  const handleSaveCwd = () => {
    if (cwdInput.trim()) {
      setWorkingDirectory(cwdInput.trim());
    }
    setIsEditingCwd(false);
  };

  const handleCancelCwd = () => {
    setCwdInput(workingDirectory);
    setIsEditingCwd(false);
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-github-surface border-r border-github-border flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-4 border-b border-github-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-github-text-primary">Session List</h2>
          <button
            onClick={() => listSessions()}
            className="p-1.5 rounded hover:bg-github-surface-hover text-github-muted"
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

      {/* Working Directory */}
      <div className="px-4 py-2 bg-github-bg/50 border-b border-github-border">
        {isEditingCwd ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={cwdInput}
              onChange={(e) => setCwdInput(e.target.value)}
              className="flex-1 px-2 py-1 text-xs bg-github-surface border border-github-border rounded text-github-text"
              placeholder="Enter working directory..."
              autoFocus
            />
            <button
              onClick={handleSaveCwd}
              className="p-1 rounded hover:bg-github-success/20 text-github-success"
              title="Save"
            >
              <Check size={12} />
            </button>
            <button
              onClick={handleCancelCwd}
              className="p-1 rounded hover:bg-github-danger/20 text-github-danger"
              title="Cancel"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-github-muted overflow-hidden">
              <Folder size={12} />
              <span className="truncate" title={workingDirectory}>
                {workingDirectory}
              </span>
            </div>
            <button
              onClick={() => setIsEditingCwd(true)}
              className="p-1 rounded hover:bg-github-surface-hover text-github-muted shrink-0 ml-2"
              title="Edit working directory"
            >
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-github-muted text-sm">
            No sessions
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`
                  w-full text-left p-3 rounded-lg transition-colors group relative
                  ${currentSessionId === session.id
                    ? 'bg-github-accent/20 border border-github-accent/50'
                    : 'hover:bg-github-surface-hover border border-transparent'
                  }
                `}
              >
                <button
                  onClick={() => switchSession(session.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-2 h-2 rounded-full shrink-0
                      ${currentSessionId === session.id ? 'bg-github-accent' : 'bg-github-muted'}
                    `} />
                    <div className="min-w-0 flex-1 pr-6">
                      <p className="text-sm font-medium text-github-text-primary truncate">
                        {session.title || session.id.slice(0, 8)}
                      </p>
                      {session.updatedAt && (
                        <p className="text-xs text-github-muted mt-0.5">
                          {formatTime(session.updatedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
                {/* 删除按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-github-danger/20 text-github-muted hover:text-github-danger transition-all"
                  title="Delete session"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-github-border">
        {showClearConfirm ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-github-danger">Confirm clear?</span>
            <button
              onClick={() => {
                clearAllSessions();
                setShowClearConfirm(false);
              }}
              className="p-1 rounded bg-github-danger text-white hover:bg-github-danger/80"
            >
              <Check size={12} />
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="p-1 rounded bg-github-surface-hover hover:bg-github-border"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs text-github-muted">
              {sessions.length} sessions
            </p>
            {sessions.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1 text-xs text-github-muted hover:text-github-danger transition-colors"
                title="Clear all sessions"
              >
                <AlertTriangle size={12} />
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
