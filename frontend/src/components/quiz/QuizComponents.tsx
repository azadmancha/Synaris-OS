'use client';

// ─── Answer Letter Helper ────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function answerLetter(index: number): string {
  return LETTERS[index] || `Option ${index + 1}`;
}

// ─── Answer Option Button (Dark-Sleek) ───────────────────

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
  let border = 'border-gray-700/40';
  let bg = 'bg-white/[0.03]';
  let labelBg = 'bg-gray-800/50';
  let labelText = 'text-gray-400';
  let hoverStyle = 'hover:border-synapse-neon-purple/30 hover:bg-white/[0.06]';

  if (revealed) {
    hoverStyle = '';
    if (isCorrect) {
      border = 'border-synapse-neon-green/40';
      bg = 'bg-synapse-neon-green/5';
      labelBg = 'bg-synapse-neon-green';
      labelText = 'text-glass-primary';
    } else if (selected && !isCorrect) {
      border = 'border-synapse-neon-red/40';
      bg = 'bg-synapse-neon-red/5';
      labelBg = 'bg-synapse-neon-red';
      labelText = 'text-glass-primary';
    }
  } else if (selected) {
    hoverStyle = '';
    border = 'border-synapse-neon-purple/50';
    bg = 'bg-synapse-neon-purple/10';
    labelBg = 'bg-synapse-neon-purple';
    labelText = 'text-glass-primary';
  }

  return (
    <button
      onClick={onSelect}
      disabled={disabled || revealed}
      className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200 active:scale-[0.99] ${border} ${bg} ${hoverStyle} text-gray-200 disabled:cursor-default`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${labelBg} ${labelText}`}>
        {label}
      </span>
      <span className="flex-1 leading-snug">{text}</span>
      {revealed && isCorrect && (
        <svg className="h-5 w-5 shrink-0 text-synapse-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {revealed && selected && !isCorrect && (
        <svg className="h-5 w-5 shrink-0 text-synapse-neon-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {selected && !revealed && (
        <svg className="h-5 w-5 shrink-0 text-synapse-neon-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
              ? 'border-synapse-neon-green/30 bg-synapse-neon-green/5'
              : 'border-synapse-neon-red/30 bg-synapse-neon-red/5'
          }`}
        >
          <p className="font-medium text-gray-200">{value || '(no answer)'}</p>
        </div>
        {correctAnswer && (
          <div className="flex items-start gap-2 rounded-xl border border-synapse-neon-blue/20 bg-synapse-neon-blue/5 px-4 py-3 text-sm">
            <span className="mt-0.5 shrink-0 text-synapse-neon-blue">💡</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-synapse-neon-blue">Expected answer</p>
              <p className="mt-0.5 text-gray-300">{correctAnswer}</p>
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
      className={`w-full rounded-xl border bg-[#1a1d2e] px-4 py-3 text-sm text-gray-200 outline-none transition-all placeholder:text-gray-500 focus:border-synapse-neon-purple/30 focus:ring-2 focus:ring-synapse-neon-purple/10 disabled:cursor-not-allowed disabled:opacity-50 ${
        value.trim() ? 'border-synapse-neon-purple/30' : 'border-gray-700/50'
      }`}
    />
  );
}

// ─── Skeleton Loader ─────────────────────────────────────

export function QuizSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-32 rounded bg-gray-800" />
      <div className="h-4 w-64 rounded bg-gray-800" />
      <div className="space-y-2 pt-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-white/[0.03]" />
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-3 w-20 rounded bg-gray-800" />
        <div className="h-3 w-16 rounded bg-gray-800" />
      </div>
    </div>
  );
}
