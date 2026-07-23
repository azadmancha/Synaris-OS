'use client';

interface QuizIdleFormProps {
  topic: string;
  difficulty: 'quick' | 'balanced' | 'deep_dive';
  questionCount: number;
  onTopicChange: (topic: string) => void;
  onDifficultyChange: (d: 'quick' | 'balanced' | 'deep_dive') => void;
  onQuestionCountChange: (n: number) => void;
  onGenerate: () => void;
  onClose?: () => void;
}

export function QuizIdleForm({
  topic, difficulty, questionCount,
  onTopicChange, onDifficultyChange, onQuestionCountChange,
  onGenerate, onClose,
}: QuizIdleFormProps) {
  const difficulties = ['quick' as const, 'balanced' as const, 'deep_dive' as const];

  return (
    <div className="glass-card overflow-hidden p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-synapse-neon-purple to-indigo-600 shadow-glow-purple">
            <span className="text-lg">🧠</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-glass-primary">Quiz Mode</h3>
            <p className="text-xs text-gray-400">Test your knowledge with an AI-generated quiz</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/[0.05] hover:text-gray-300" title="Close quiz">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && topic.trim()) onGenerate(); }}
            placeholder="e.g., Quantum Mechanics, World History, Python..."
            className="w-full rounded-xl border border-gray-700/50 bg-[#1a1d2e] px-4 py-2.5 text-sm text-gray-200 outline-none transition-all placeholder:text-gray-500 focus:border-synapse-neon-purple/30 focus:ring-2 focus:ring-synapse-neon-purple/10"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Difficulty</label>
            <div className="flex gap-1 rounded-xl border border-gray-700/50 bg-[#1a1d2e]/80 p-1">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => onDifficultyChange(d)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                    difficulty === d
                      ? 'bg-gradient-to-r from-synapse-neon-purple to-indigo-600 text-white shadow-glow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {d === 'quick' ? '⚡ Quick' : d === 'balanced' ? '⚖️ Balanced' : '🔬 Deep'}
                </button>
              ))}
            </div>
          </div>

          <div className="w-24">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Questions</label>
            <select
              value={questionCount}
              onChange={(e) => onQuestionCountChange(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-700/50 bg-[#1a1d2e] px-3 py-2.5 text-sm text-gray-200 outline-none transition-all focus:border-synapse-neon-purple/30 focus:ring-2 focus:ring-synapse-neon-purple/10"
            >
              {[3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={!topic.trim()}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-synapse-neon-purple to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-glow-sm transition-all duration-200 hover:shadow-glow-purple hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Generate Quiz
        </button>
      </div>
    </div>
  );
}
