'use client';

import { QuizSkeleton } from '@/components/quiz/QuizComponents';

interface QuizGeneratingProps {
  topic: string;
  streamingText: string;
  onCancel?: () => void;
}

export function QuizGenerating({ topic, streamingText, onCancel }: QuizGeneratingProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-700/40 px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-synapse-neon-purple to-indigo-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-glass-primary">Generating Quiz</h3>
          <p className="text-xs text-gray-400">
            {streamingText.length === 0
              ? `Creating questions about ${topic}...`
              : `Generated ${streamingText.length} characters so far...`
            }
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/[0.05] hover:text-gray-300"
            title="Cancel generation"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-4">
        {streamingText.length === 0 ? (
          <QuizSkeleton />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-700/30 bg-[#0F1117]">
            <div className="flex items-center justify-between border-b border-gray-700/30 px-3 py-1.5">
              <span className="text-[9px] font-medium uppercase tracking-wider text-gray-500">Live Preview</span>
              <span className="text-[9px] text-gray-500">{streamingText.length} chars</span>
            </div>
            <div className="max-h-48 overflow-y-auto p-3">
              <pre className="whitespace-pre-wrap break-all text-[10px] leading-relaxed text-gray-400">
                {streamingText}
                <span className="inline-block h-3 w-[2px] animate-pulse bg-synapse-neon-purple align-text-bottom shadow-glow-sm" />
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
