'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Send } from 'lucide-react';

export function InputArea() {
  const [input, setInput] = useState('');
  const { sendPrompt, isLoading } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto adjust height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    
    sendPrompt(input);
    setInput('');
    
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-github-border bg-github-surface p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              disabled={isLoading}
              rows={1}
              className="
                w-full px-4 py-3 pr-12
                bg-github-bg border border-github-border rounded-lg
                text-github-text placeholder-github-muted
                resize-none min-h-[48px] max-h-[200px]
                focus:outline-none focus:border-github-accent focus:ring-1 focus:ring-github-accent
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
            <div className="absolute right-3 bottom-3 text-xs text-github-muted pointer-events-none">
              {input.length > 0 && `${input.length} chars`}
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="
              p-3 rounded-lg
              bg-github-success hover:bg-github-success-hover
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-github-success
              transition-colors
              flex items-center justify-center
            "
          >
            <Send size={20} className="text-white" />
          </button>
        </div>
        
        <div className="mt-2 text-center">
          <p className="text-xs text-github-muted">
            AI assistants may produce inaccurate information, please verify important details
          </p>
        </div>
      </div>
    </div>
  );
}
