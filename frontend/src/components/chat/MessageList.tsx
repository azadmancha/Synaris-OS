'use client';

import { forwardRef } from 'react';
import type { Message } from '@/lib/api';
import type { Depth } from '@/components/chat/DepthSelector';
import type { AuthUser } from '@/hooks/useAuth';
import { DepthSelector } from '@/components/chat/DepthSelector';
import { MessageActions, stripFollowUpSection } from '@/components/chat/MessageActions';
import MarkdownRenderer from '@/components/MarkdownRenderer';

const SUGGESTED_TOPICS = [
  { emoji: '🔬', label: 'Quantum Mechanics', query: 'Explain quantum mechanics simply' },
  { emoji: '🧮', label: 'Calculus', query: 'What is calculus and why is it important?' },
  { emoji: '🧬', label: 'Genetics', query: 'Explain DNA replication step by step' },
  { emoji: '⚡', label: 'Thermodynamics', query: 'What are the laws of thermodynamics?' },
  { emoji: '🐍', label: 'Python', query: 'Teach me Python programming basics' },
  { emoji: '🌍', label: 'Climate', query: 'What causes climate change?' },
];

// ─── Startup Screen ─────────────────────────────────────

function StartupScreen({ user, depth, onChangeDepth, onSendMessage }: {
  user: AuthUser | null;
  depth: Depth;
  onChangeDepth: (d: Depth) => void;
  onSendMessage: (text: string) => void;
}) {
  return (
    <div className="mt-8 space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
          <span className="text-2xl">🧠</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-[#EDEDEE]">
          Welcome{user ? `, ${user.name.split(' ')[0]}` : ''} 👋
        </h2>
        <p className="mt-1 text-sm text-gray-500">What would you like to learn today?</p>
      </div>

      <div>
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">Try asking about</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SUGGESTED_TOPICS.map((topic) => (
            <button
              key={topic.label}
              onClick={() => onSendMessage(topic.query)}
              className="group flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-left text-xs text-gray-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.97] dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-800 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
            >
              <span className="text-base">{topic.emoji}</span>
              <span className="font-medium">{topic.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-gray-400">Learning Depth</p>
        <DepthSelector depth={depth} onChange={onChangeDepth} />
      </div>
    </div>
  );
}

// ─── Loading Dots ──────────────────────────────────────

function LoadingDots() {
  return (
    <div className="inline-block max-w-[75%] rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-[#1C1E2B]">
      <div className="flex gap-1.5">
        <span className="h-2 w-2 animate-loading-dot rounded-full bg-gray-400 [animation-delay:0s]" />
        <span className="h-2 w-2 animate-loading-dot rounded-full bg-gray-400 [animation-delay:0.16s]" />
        <span className="h-2 w-2 animate-loading-dot rounded-full bg-gray-400 [animation-delay:0.32s]" />
      </div>
      <style>{`
        @keyframes loading-dot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        .animate-loading-dot { animation: loading-dot 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ─── Streaming Message ─────────────────────────────────

function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="inline-block max-w-[85%] rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-relaxed dark:border-gray-700 dark:bg-[#1C1E2B] dark:text-[#EDEDEE] sm:max-w-[75%]">
      <MarkdownRenderer content={content} className="text-sm" />
      <span className="inline-block h-4 w-[2px] animate-pulse bg-blue-500 align-text-bottom" />
    </div>
  );
}

// ─── Message List ──────────────────────────────────────

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  isLoading: boolean;
  depth: Depth;
  user: AuthUser | null;
  onSendMessage: (text: string) => void;
  onFeedback: (id: string, rating: 'positive' | 'negative') => void;
  onChangeDepth: (depth: Depth) => void;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(function MessageList(
  { messages, streamingContent, isStreaming, isLoading, depth, user, onSendMessage, onFeedback, onChangeDepth },
  messagesEndRef,
) {
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <StartupScreen user={user} depth={depth} onChangeDepth={onChangeDepth} onSendMessage={onSendMessage} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="space-y-6">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`animate-message-in ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-gray-100 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-[#1C1E2B] dark:text-[#EDEDEE]'
            }`}>
              {msg.role === 'assistant' ? (
                <>
                  <MarkdownRenderer content={stripFollowUpSection(msg.content)} className="text-sm" />
                  <MessageActions
                    messageId={msg.id}
                    message={msg.content}
                    onFeedback={onFeedback}
                    onFollowUp={onSendMessage}
                  />
                </>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="animate-message-in text-left">
            <StreamingMessage content={streamingContent} />
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="text-left">
            <LoadingDots />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <style>{`
        @keyframes message-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-message-in { animation: message-in 0.3s ease-out; }
      `}</style>
    </div>
  );
});
