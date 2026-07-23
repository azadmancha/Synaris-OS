'use client';

import { type KeyboardEvent, type RefObject } from 'react';
import type { Depth } from '@/components/chat/DepthSelector';
import type { AnswerMode } from '@/components/chat/AnswerModeSelector';
import { DepthSelector } from '@/components/chat/DepthSelector';
import { AnswerModeSelector } from '@/components/chat/AnswerModeSelector';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  depth: Depth;
  onChangeDepth: (depth: Depth) => void;
  answerMode: AnswerMode;
  onChangeAnswerMode: (mode: AnswerMode) => void;
  isLoading: boolean;
  showControls: boolean;
  inputRef: RefObject<HTMLInputElement>;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onKeyDown,
  depth,
  onChangeDepth,
  answerMode,
  onChangeAnswerMode,
  isLoading,
  showControls,
  inputRef,
}: ChatInputProps) {
  return (
    <div className="border-t border-gray-800/50 bg-[#0F1117]/90 px-4 py-4 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        {showControls && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <DepthSelector depth={depth} onChange={onChangeDepth} disabled={isLoading} />
            <AnswerModeSelector
              mode={answerMode}
              onChange={onChangeAnswerMode}
              disabled={isLoading}
            />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          className="group relative flex items-center gap-2"
        >
          {/* Glow border effect on focus */}
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-synapse-neon-blue/0 via-synapse-neon-blue/0 to-synapse-neon-purple/0 transition-all duration-300 group-focus-within:from-synapse-neon-blue/20 group-focus-within:via-synapse-neon-blue/10 group-focus-within:to-synapse-neon-purple/20 group-focus-within:shadow-glow-blue" />

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything..."
            disabled={isLoading}
            autoFocus
            className="relative z-10 flex-1 rounded-xl border border-gray-700/50 bg-[#1a1d2e] px-5 py-3.5 text-sm text-gray-200 outline-none transition-all placeholder:text-gray-500 focus:border-synapse-neon-blue/30 focus:ring-2 focus:ring-synapse-neon-blue/10 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className="relative z-10 rounded-xl bg-gradient-to-r from-synapse-neon-blue to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-glow-sm transition-all duration-200 hover:shadow-glow-blue hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
          >
            <span className="flex items-center gap-2">
              Send
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </span>
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-gray-600">
          Press{' '}
          <kbd className="rounded-md border border-gray-700 bg-gray-800/50 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
            Enter
          </kbd>{' '}
          to send ·
          <kbd className="rounded-md border border-gray-700 bg-gray-800/50 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
            Shift+Enter
          </kbd>{' '}
          for new line
        </p>
      </div>
    </div>
  );
}
