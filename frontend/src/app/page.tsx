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
import { MessageSquare, Plus } from 'lucide-react';
import { GlobalErrorDisplay } from '@/components/GlobalErrorDisplay';

function EmptySessionState({ onCreateSession }: { onCreateSession: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-github-bg p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-github-surface rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={32} className="text-github-accent" />
        </div>
        <h2 className="text-xl font-semibold text-github-text-primary mb-2">
          No Active Session
        </h2>
        <p className="text-github-muted mb-6">
          Create a new session to start chatting with the AI assistant
        </p>
        <Button variant="primary" size="lg" onClick={onCreateSession}>
          <Plus size={20} className="mr-2" />
          Create New Session
        </Button>
      </div>
    </div>
  );
}

function ChatLayout() {
  const { connectionStatus } = useWebSocketContext();
  const { sessions, createSession, currentSessionId, isCreatingSession } = useSession();
  const [mounted, setMounted] = useState(false);
  
  // Sidebar width state
  const [sidebarWidth, setSidebarWidth] = useState(280); // 默认 280px
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Start drag resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Dragging
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

  // Prevent SSR hydration issues
  if (!mounted) {
    return (
      <div className="flex h-screen bg-github-bg items-center justify-center">
        <Loading text="Loading..." />
      </div>
    );
  }

  // If provider not selected, show selection interface
  if (connectionStatus === 'awaiting_provider' || connectionStatus === 'disconnected') {
    return <ProviderSelector />;
  }

  // If no sessions, show empty state
  const hasSessions = sessions.length > 0;
  const hasCurrentSession = !!currentSessionId;

  return (
    <div className="flex h-screen bg-github-bg overflow-hidden">
      {/* Session Panel - fixed width on left, resizable */}
      <div
        ref={sidebarRef}
        className="flex-shrink-0 h-full"
        style={{ width: sidebarWidth }}
      >
        <SessionPanel />
      </div>

      {/* Drag resize handle */}
      <div
        className={`
          w-1 bg-github-border hover:bg-github-accent cursor-col-resize 
          flex-shrink-0 relative group transition-colors
          ${isResizing ? 'bg-github-accent' : ''}
        `}
        onMouseDown={handleMouseDown}
      >
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
          w-0.5 h-8 rounded-full transition-colors
          ${isResizing ? 'bg-github-accent' : 'bg-github-muted/50 group-hover:bg-github-accent'}
        `} />
      </div>

      {/* Main Chat Area - right side adaptive */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="h-14 border-b border-github-border bg-github-surface flex items-center justify-between px-4 shrink-0">
          <h1 className="font-semibold text-github-text-primary">
            ACP Web Client
          </h1>
          <ConnectionStatus />
        </header>

        {/* Content Area */}
        {!hasSessions ? (
          <EmptySessionState onCreateSession={() => createSession()} />
        ) : !hasCurrentSession ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-github-bg">
            <p className="text-github-muted mb-4">Please select a session from the left</p>
            <Button variant="primary" size="sm" onClick={() => createSession()}>
              <Plus size={16} className="mr-1.5" />
              Or create new session
            </Button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 flex flex-col min-h-0 relative">
              {isCreatingSession && (
                <div className="absolute inset-0 bg-github-bg/80 flex items-center justify-center z-10">
                  <Loading text="Creating session..." />
                </div>
              )}
              <MessageList />
            </div>

            {/* Input */}
            <InputArea />
          </>
        )}
      </div>

      {/* Permission Modal */}
      <PermissionModal />
      
      {/* Debug log display */}
      <GlobalErrorDisplay />
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
