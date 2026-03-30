'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { MessageItem, AgentMessageWithThoughts } from './MessageItem';
import { TypingIndicator } from '@/components/ui/Loading';
import { Bot } from 'lucide-react';
import type { Message } from '@/types/acp';

export function MessageList() {
  const { messages, isLoading } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Group messages by round
  // Each round: user message -> (thought+tool) -> Agent reply
  const messageGroups = useMemo(() => {
    // 首先，按时间戳排序确保基本顺序
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    
    const groups: Array<
      | { type: 'agent'; agent: Message; thoughts: Message[]; toolCalls: Message[] }
      | { type: 'single'; message: Message }
    > = [];
    
    // Process in order, associate thought/tool with following agent message
    let pendingThoughts: Message[] = [];
    let pendingTools: Message[] = [];
    
    for (const msg of sortedMessages) {
      if (msg.type === 'user') {
        // User message - clear previous pending first (associate with previous agent)
        if (pendingThoughts.length > 0 || pendingTools.length > 0) {
          const lastGroup = groups[groups.length - 1];
          if (lastGroup && lastGroup.type === 'agent') {
            lastGroup.thoughts.push(...pendingThoughts);
            lastGroup.toolCalls.push(...pendingTools);
          }
          pendingThoughts = [];
          pendingTools = [];
        }
        groups.push({ type: 'single', message: msg });
      } else if (msg.type === 'thought') {
        pendingThoughts.push(msg);
      } else if (msg.type === 'tool_call') {
        pendingTools.push(msg);
      } else if (msg.type === 'agent') {
        // Agent 消息 - 附加之前的 thought/tool
        groups.push({
          type: 'agent',
          agent: msg,
          thoughts: [...pendingThoughts],
          toolCalls: [...pendingTools]
        });
        pendingThoughts = [];
        pendingTools = [];
      }
    }
    
    // Handle unassociated thought/tool at the end
    if (pendingThoughts.length > 0 || pendingTools.length > 0) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.type === 'agent') {
        lastGroup.thoughts.push(...pendingThoughts);
        lastGroup.toolCalls.push(...pendingTools);
      }
    }
    
    return groups;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-github-surface flex items-center justify-center">
            <Bot size={32} className="text-github-accent" />
          </div>
          <h3 className="text-lg font-medium text-github-text-primary mb-2">
            Start Conversation
          </h3>
          <p className="text-github-muted text-sm max-w-sm">
            Type a message in the input box below to start chatting with the AI assistant
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-2"
    >
      {messageGroups.map((group) => (
        group.type === 'agent' ? (
          <AgentMessageWithThoughts
            key={group.agent.id}
            agent={group.agent}
            thoughts={group.thoughts}
            toolCalls={group.toolCalls}
          />
        ) : (
          <MessageItem key={group.message.id} message={group.message} />
        )
      ))}
      
      {isLoading && (
        <div className="flex items-center gap-3 p-4">
          <div className="w-8 h-8 rounded-full bg-github-surface flex items-center justify-center">
            <Bot size={16} className="text-green-400" />
          </div>
          <TypingIndicator />
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
