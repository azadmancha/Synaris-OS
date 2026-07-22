'use client';

import { QuizSkeleton } from '@/components/quiz/QuizComponents';

interface QuizGeneratingProps {
  topic: string;
  streamingText: string;
  onCancel?: () => void;
}

export function QuizGenerating({ topic, streamingText, onCancel }: QuizGeneratingProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-[#151728]">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">Generating Quiz</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {streamingText.length === 0
              ? `Creating questions about ${topic}...`
              : `Generated ${streamingText.length} characters so far...`
            }
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300"
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
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-[#0F1117]">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5 dark:border-gray-700">
              <span className="text-[9px] font-medium uppercase tracking-wider text-gray-400">Live Preview</span>
              <span className="text-[9px] text-gray-400">{streamingText.length} chars</span>
            </div>
            <div className="max-h-48 overflow-y-auto p-3">
              <pre className="whitespace-pre-wrap break-all text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
                {streamingText}
                <span className="inline-block h-3 w-[2px] animate-pulse bg-purple-500 align-text-bottom" />
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
