'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { ProviderSelector } from '@/components/provider/ProviderSelector';
import { SessionPanel } from '@/components/session/SessionPanel';
import { MessageList } from '@/components/chat/MessageList';
import { InputArea } from '@/components/chat/InputArea';
import { PermissionModal } from '@/components/permission/PermissionModal';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { useSession } from '@/contexts/SessionContext';
import { Loading } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import { MessageSquare, Plus, Sparkles } from 'lucide-react';

function EmptySessionState({ onCreateSession }: { onCreateSession: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="glass-panel p-12 text-center max-w-md animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 
                        border border-white/20 flex items-center justify-center glow">
          <MessageSquare size={40} className="text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold gradient-text mb-3">
          No Active Session
        </h2>
        <p className="text-slate-400 mb-8">
          Create a new session to start chatting with AI
        </p>
        <Button variant="primary" size="lg" onClick={onCreateSession}>
          <Plus size={20} className="mr-2" />
          Create Session
        </Button>
      </div>
    </div>
  );
}

function ChatLayout() {
  const { connectionStatus } = useWebSocketContext();
  const { sessions, createSession, currentSessionId, isCreatingSession } = useSession();
  const [mounted, setMounted] = useState(false);
  
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(240, Math.min(400, startWidthRef.current + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <Loading text="Loading..." />
      </div>
    );
  }

  if (connectionStatus === 'awaiting_provider' || connectionStatus === 'disconnected') {
    return <ProviderSelector />;
  }

  const hasSessions = sessions.length > 0;
  const hasCurrentSession = !!currentSessionId;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* Session Panel */}
      <div
        ref={sidebarRef}
        className="flex-shrink-0 h-full"
        style={{ width: sidebarWidth }}
      >
        <SessionPanel />
      </div>

      {/* Resize Handle */}
      <div
        className={`
          w-1 cursor-col-resize flex-shrink-0 relative group transition-colors
          ${isResizing ? 'bg-blue-400' : 'bg-white/10 hover:bg-blue-400/50'}
        `}
        onMouseDown={handleMouseDown}
      >
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
          w-0.5 h-8 rounded-full transition-colors
          ${isResizing ? 'bg-blue-400' : 'bg-slate-500/50 group-hover:bg-blue-400/50'}
        `} />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 
                            border border-white/20 flex items-center justify-center">
              <Sparkles size={18} className="text-blue-400" />
            </div>
            <h1 className="font-semibold text-white">
              ACP Web Client
            </h1>
          </div>
          <ConnectionStatus />
        </header>

        {/* Content Area */}
        {!hasCurrentSession && !hasSessions ? (
          <EmptySessionState onCreateSession={() => createSession()} />
        ) : !hasCurrentSession ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="glass-panel p-8 text-center">
              <p className="text-slate-400 mb-4">Select a session from the left</p>
              <Button variant="primary" size="sm" onClick={() => createSession()}>
                <Plus size={16} className="mr-1.5" />
                Or Create New
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-h-0 relative">
              {isCreatingSession && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <Loading text="Creating session..." />
                </div>
              )}
              <MessageList />
            </div>
            <InputArea />
          </>
        )}
      </div>

      <PermissionModal />
    </div>
  );
}

export default function Home() {
  return (
    <WebSocketProvider>
      <SessionProvider>
        <PermissionProvider>
          <ChatLayout />
        </PermissionProvider>
      </SessionProvider>
    </WebSocketProvider>
  );
}
