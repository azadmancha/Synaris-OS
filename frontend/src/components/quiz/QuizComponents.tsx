'use client';

// ─── Answer Letter Helper ────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function answerLetter(index: number): string {
  return LETTERS[index] || `Option ${index + 1}`;
}

// ─── Answer Option Button ─────────────────────────────────

interface AnswerOptionProps {
  label: string;
  text: string;
  selected: boolean;
  revealed: boolean;
  isCorrect: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export function AnswerOption({ label, text, selected, revealed, isCorrect, disabled, onSelect }: AnswerOptionProps) {
  let border = 'border-gray-200 dark:border-gray-600';
  let bg = 'bg-white dark:bg-[#1C1E2B]';
  let labelBg = 'bg-gray-100 dark:bg-gray-700';
  let labelText = 'text-gray-500 dark:text-gray-400';

  if (revealed) {
    if (isCorrect) {
      border = 'border-green-400 dark:border-green-500';
      bg = 'bg-green-50 dark:bg-green-900/20';
      labelBg = 'bg-green-500';
      labelText = 'text-white';
    } else if (selected && !isCorrect) {
      border = 'border-red-400 dark:border-red-500';
      bg = 'bg-red-50 dark:bg-red-900/20';
      labelBg = 'bg-red-500';
      labelText = 'text-white';
    }
  } else if (selected) {
    border = 'border-blue-400 dark:border-blue-500';
    bg = 'bg-blue-50 dark:bg-blue-900/20';
    labelBg = 'bg-blue-500';
    labelText = 'text-white';
  }

  return (
    <button
      onClick={onSelect}
      disabled={disabled || revealed}
      className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all active:scale-[0.99] ${border} ${bg} text-gray-900 dark:text-[#EDEDEE] ${
        !revealed && !disabled ? 'hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-700 dark:hover:bg-blue-900/10' : ''
      } disabled:cursor-default`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${labelBg} ${labelText}`}
      >
        {label}
      </span>
      <span className="flex-1 leading-snug">{text}</span>
      {revealed && isCorrect && (
        <svg className="h-5 w-5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {revealed && selected && !isCorrect && (
        <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {selected && !revealed && (
        <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </button>
  );
}

// ─── Short Answer Input ──────────────────────────────────

interface ShortAnswerInputProps {
  value: string;
  revealed: boolean;
  isCorrect: boolean;
  correctAnswer: string | null;
  disabled: boolean;
  onChange: (val: string) => void;
}

export function ShortAnswerInput({ value, revealed, isCorrect, correctAnswer, disabled, onChange }: ShortAnswerInputProps) {
  if (revealed) {
    return (
      <div className="space-y-2">
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            isCorrect
              ? 'border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/20'
              : 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20'
          }`}
        >
          <p className="font-medium text-gray-900 dark:text-[#EDEDEE]">{value || '(no answer)'}</p>
        </div>
        {correctAnswer && (
          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-700 dark:bg-blue-900/10">
            <span className="mt-0.5 shrink-0 text-blue-500">💡</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Expected answer</p>
              <p className="mt-0.5 text-gray-700 dark:text-gray-300">{correctAnswer}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Type your answer..."
      rows={3}
      className={`w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-[#1C1E2B] dark:text-[#EDEDEE] dark:focus:border-blue-400 dark:focus:ring-blue-400/20 ${
        value.trim() ? 'border-blue-300 dark:border-blue-600' : ''
      }`}
    />
  );
}

// ─── Skeleton Loader ─────────────────────────────────────

export function QuizSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-2 pt-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-[#1C1E2B]" />
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
