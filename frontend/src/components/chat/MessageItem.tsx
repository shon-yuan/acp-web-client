'use client';

import React, { useState } from 'react';
import type { Message } from '@/types/acp';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { User, Bot, Brain, Wrench, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { formatTime, formatJson } from '@/utils/helpers';

interface MessageItemProps {
  message: Message;
}

interface AgentMessageWithThoughtsProps {
  agent: Message;
  thoughts: Message[];
  toolCalls: Message[];
}

// Thought process and tool call collapse component
export function AgentMessageWithThoughts({ agent, thoughts, toolCalls }: AgentMessageWithThoughtsProps) {
  const [showThoughts, setShowThoughts] = useState(false);

  const hasThoughts = thoughts.length > 0;
  const hasToolCalls = toolCalls.length > 0;
  
  if (!hasThoughts && !hasToolCalls) {
    // No thought process, display agent message directly
    return <MessageItem message={agent} />;
  }

  return (
    <div className="my-4 animate-fade-in">
      {/* Thought process collapse button */}
      <div className="mb-2">
        <button
          onClick={() => setShowThoughts(!showThoughts)}
          className="flex items-center gap-2 text-xs text-github-muted hover:text-purple-400 transition-colors"
        >
          <Brain size={14} className="text-purple-400" />
          <span>Thought Process</span>
          <span className="text-github-muted/60">
            ({thoughts.length > 0 && `${thoughts.length} thoughts`}
            {thoughts.length > 0 && toolCalls.length > 0 && ', '}
            {toolCalls.length > 0 && `${toolCalls.length} tool calls`})
          </span>
          {showThoughts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Thought process content */}
      {showThoughts && (
        <div className="mb-3 space-y-2">
          {/* Thought content */}
          {thoughts.map((thought) => (
            <div
              key={thought.id}
              className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2"
            >
              <div className="flex items-center gap-2 mb-1">
                <Brain size={14} className="text-purple-400" />
                <span className="text-xs font-medium text-purple-300">Thought</span>
                <span className="text-xs text-github-muted/60">
                  {formatTime(thought.timestamp)}
                </span>
              </div>
              <div className="text-purple-200/80 text-sm italic whitespace-pre-wrap">
                {thought.content}
              </div>
            </div>
          ))}

          {/* Tool calls */}
          {toolCalls.map((toolCall) => (
            <ToolCallItem key={toolCall.id} message={toolCall} />
          ))}
        </div>
      )}

      {/* Agent 消息 */}
      <MessageItem message={agent} />
    </div>
  );
}

// Tool call item component
function ToolCallItem({ message }: { message: Message }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolName = message.metadata?.toolName || 'unknown';

  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-yellow-500/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wrench size={14} className="text-yellow-400" />
          <span className="font-medium text-sm text-yellow-200">
            Tool: {toolName}
          </span>
          {message.metadata?.status === 'pending' && (
            <Clock size={14} className="text-yellow-400 animate-pulse" />
          )}
          {message.metadata?.status === 'success' && (
            <CheckCircle size={14} className="text-green-400" />
          )}
          {message.metadata?.status === 'error' && (
            <XCircle size={14} className="text-red-400" />
          )}
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-yellow-400" /> : <ChevronDown size={16} className="text-yellow-400" />}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-yellow-500/20">
          {!!message.metadata?.toolInput && (
            <div className="mt-2">
              <h4 className="text-xs font-medium text-yellow-300/70 mb-1">Input Parameters:</h4>
              <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto text-yellow-100/80">
                <code>{formatJson(message.metadata.toolInput)}</code>
              </pre>
            </div>
          )}
          {!!message.metadata?.toolOutput && (
            <div className="mt-2">
              <h4 className="text-xs font-medium text-yellow-300/70 mb-1">Output Result:</h4>
              <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto text-yellow-100/80">
                <code>{formatJson(message.metadata.toolOutput)}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Individual thought process component
function ThoughtItem({ message }: { message: Message }) {
  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 my-2">
      <div className="flex items-center gap-2 mb-1">
        <Brain size={14} className="text-purple-400" />
        <span className="text-xs font-medium text-purple-300">Thought</span>
        <span className="text-xs text-github-muted/60">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <div className="text-purple-200/80 text-sm italic whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}

// Main message item component
export function MessageItem({ message }: MessageItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'user':
        return <User size={18} className="text-github-accent" />;
      case 'agent':
        return <Bot size={18} className="text-green-400" />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (message.type) {
      case 'user':
        return 'User';
      case 'agent':
        return 'Assistant';
      default:
        return '';
    }
  };

  // Render thought and tool_call separately (when not in AgentMessageWithThoughts)
  if (message.type === 'thought') {
    return <ThoughtItem message={message} />;
  }
  
  if (message.type === 'tool_call') {
    return <ToolCallItem message={message} />;
  }

  return (
    <div className={`animate-fade-in ${message.type === 'user' ? 'flex justify-end' : ''}`}>
      <div className={`max-w-[85%] ${message.type === 'user' ? 'w-auto' : 'w-full'}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 px-1">
          {message.type !== 'user' && getIcon()}
          <span className="text-xs font-medium text-github-muted">
            {getLabel()}
          </span>
          <span className="text-xs text-github-muted/60">
            {formatTime(message.timestamp)}
          </span>
          {message.type === 'user' && (
            <button
              onClick={handleCopy}
              className="ml-2 p-1 rounded hover:bg-github-surface-hover text-github-muted"
              title="Copy"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          )}
        </div>

        {/* Content */}
        <div 
          className={`
            rounded-lg px-4 py-3 border
            ${message.type === 'user' 
              ? 'bg-github-accent text-white' 
              : 'bg-github-surface border-github-border'
            }
          `}
        >
          {message.type === 'user' ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}
