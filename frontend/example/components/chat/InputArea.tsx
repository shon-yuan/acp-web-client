'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Send } from 'lucide-react';

export function InputArea() {
  const [input, setInput] = useState('');
  const { sendPrompt, isLoading } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="border-t border-white/10 bg-slate-900/50 backdrop-blur-xl p-4">
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
              className="glass-input w-full pr-12 resize-none min-h-[48px] max-h-[200px]"
            />
            <div className="absolute right-3 bottom-3 text-xs text-slate-500 pointer-events-none">
              {input.length > 0 && `${input.length} chars`}
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="
              p-3 rounded-xl
              bg-gradient-to-r from-blue-600/80 to-blue-500/80
              backdrop-blur-md
              border border-blue-400/50
              shadow-lg shadow-blue-500/30
              hover:shadow-blue-500/50 hover:from-blue-600 hover:to-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
              transition-all duration-200
              flex items-center justify-center
            "
          >
            <Send size={20} className="text-white" />
          </button>
        </div>
        
        <div className="mt-2 text-center">
          <p className="text-xs text-slate-500">
            AI may produce inaccurate information. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
