'use client';

export type AnswerMode = 'teach' | 'hint' | 'exam' | 'socratic' | 'simplify';

const ANSWER_MODES: { value: AnswerMode; label: string; icon: string; desc: string }[] = [
  { value: 'teach', label: 'Teach', icon: '📖', desc: 'Explain concepts clearly' },
  { value: 'hint', label: 'Hint', icon: '💡', desc: 'Give hints, not answers' },
  { value: 'exam', label: 'Exam', icon: '✍️', desc: 'Quiz me with questions' },
  { value: 'socratic', label: 'Socratic', icon: '🔄', desc: 'Guide with questions' },
  { value: 'simplify', label: 'Simplify', icon: '🔰', desc: 'Explain simply' },
];

interface AnswerModeSelectorProps {
  mode: AnswerMode;
  onChange: (mode: AnswerMode) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function AnswerModeSelector({
  mode,
  onChange,
  disabled,
  size = 'sm',
}: AnswerModeSelectorProps) {
  return (
    <div
      className={`inline-flex rounded-xl border border-gray-700/50 bg-[#1a1d2e]/80 p-1 ${
        size === 'md' ? 'gap-0.5' : ''
      }`}
    >
      {ANSWER_MODES.map((m) => {
        const isActive = mode === m.value;
        return (
          <button
            key={m.value}
            onClick={() => onChange(m.value)}
            disabled={disabled}
            title={m.desc}
            className={`rounded-lg font-medium transition-all duration-200 ${
              size === 'md' ? 'px-3.5 py-2 text-sm' : 'px-2.5 py-1.5 text-xs'
            } ${
              isActive
                ? 'bg-gradient-to-r from-synapse-neon-blue to-indigo-600 text-white shadow-glow-sm'
                : 'text-gray-500 hover:text-gray-300'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className={isActive ? '' : 'opacity-50'}>{m.icon}</span>
            <span className="ml-1">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
