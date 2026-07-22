'use client';

import { type KeyboardEvent, type RefObject } from 'react';
import type { Depth } from '@/components/chat/DepthSelector';
import { DepthSelector } from '@/components/chat/DepthSelector';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  depth: Depth;
  onChangeDepth: (depth: Depth) => void;
  isLoading: boolean;
  showDepthSelector: boolean;
  inputRef: RefObject<HTMLInputElement>;
}

export function ChatInput({
  value, onChange, onSend, onKeyDown,
  depth, onChangeDepth, isLoading, showDepthSelector, inputRef,
}: ChatInputProps) {
  return (
    <div className="border-t border-gray-200 bg-white/80 px-4 py-4 backdrop-blur-sm dark:border-gray-700 dark:bg-[#0F1117]/80">
      <div className="mx-auto max-w-3xl">
        {showDepthSelector && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <DepthSelector depth={depth} onChange={onChangeDepth} disabled={isLoading} />
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); onSend(); }} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything..."
            disabled={isLoading}
            autoFocus
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-[#1C1E2B] dark:text-[#EDEDEE] dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
          />
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            Send
          </button>
        </form>

        <p className="mt-2 text-center text-xs text-gray-400">
          Press <kbd className="rounded border border-gray-300 px-1 py-0.5 font-mono text-[10px] dark:border-gray-600">Enter</kbd> to send ·
          <kbd className="rounded border border-gray-300 px-1 py-0.5 font-mono text-[10px] dark:border-gray-600">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
