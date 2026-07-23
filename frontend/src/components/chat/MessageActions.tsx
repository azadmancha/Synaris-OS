'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

// ─── Follow-Up Suggestions (ChatGPT-style pill buttons) ──

/** Strip the "## Follow-up Questions" section from rendered AI text. */
export function stripFollowUpSection(content: string): string {
  return content.replace(/\n## Follow-up Questions?[\s\S]*$/i, '').trim();
}

function FollowUpSuggestions({
  message,
  onSelect,
}: {
  message: string;
  onSelect: (q: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const followUpMatch = message.match(/## Follow-up Questions?\n([\s\S]*?)(?:\n##|$)/i);
    if (followUpMatch && followUpMatch[1]) {
      const questions = followUpMatch[1]
        .split('\n')
        .map((line) =>
          line
            .replace(/^\d+[\.\)]\s*/, '')
            .replace(/^- /, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .trim(),
        )
        .filter((q) => q.length > 10 && q.length < 200);
      if (questions.length > 0) {
        setSuggestions(questions.slice(0, 4));
        return;
      }
    }
    const questionLines = message
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.endsWith('?') && line.length > 15 && line.length < 200)
      .slice(0, 3);
    if (questionLines.length > 0) {
      setSuggestions(questionLines);
    }
  }, [message]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Try asking
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.97] dark:border-gray-700 dark:bg-[#1C1E2B] dark:text-gray-400 dark:hover:border-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
          >
            {q.length > 60 ? q.slice(0, 60) + '...' : q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message Actions (feedback + copy + follow-ups) ─────

interface MessageActionsProps {
  messageId: string;
  message: string;
  onFeedback: (id: string, rating: 'positive' | 'negative') => void;
  onFollowUp: (q: string) => void;
}

export function MessageActions({
  messageId,
  message,
  onFeedback,
  onFollowUp,
}: MessageActionsProps) {
  const [feedbackState, setFeedbackState] = useState<string | null>(null);

  const handleFeedback = (rating: 'positive' | 'negative') => {
    if (feedbackState === rating) {
      setFeedbackState(null);
      api.rateMessage(messageId, 'reset').catch(() => {});
    } else {
      setFeedbackState(rating);
      api.rateMessage(messageId, rating).catch(() => {});
      onFeedback(messageId, rating);
    }
  };

  return (
    <>
      <div className="mt-2 flex items-center gap-1">
        {/* Thumbs up */}
        <button
          onClick={() => handleFeedback('positive')}
          className={`rounded-lg p-1 transition-colors ${
            feedbackState === 'positive' ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
          }`}
          title="Helpful"
        >
          <svg
            className="h-3.5 w-3.5"
            fill={feedbackState === 'positive' ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
        </button>

        {/* Thumbs down */}
        <button
          onClick={() => handleFeedback('negative')}
          className={`rounded-lg p-1 transition-colors ${
            feedbackState === 'negative' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
          }`}
          title="Not helpful"
        >
          <svg
            className="h-3.5 w-3.5"
            fill={feedbackState === 'negative' ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
            />
          </svg>
        </button>

        {/* Copy */}
        <button
          onClick={() => navigator.clipboard.writeText(message)}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:text-blue-500"
          title="Copy response"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
      <FollowUpSuggestions message={message} onSelect={onFollowUp} />
    </>
  );
}
