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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all dark:border-gray-700 dark:bg-[#151728]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20">
            <span className="text-lg">🧠</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">Quiz Mode</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Test your knowledge with an AI-generated quiz</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300" title="Close quiz">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && topic.trim()) onGenerate(); }}
            placeholder="e.g., Quantum Mechanics, World History, Python..."
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-[#1C1E2B] dark:text-[#EDEDEE] dark:focus:border-purple-400 dark:focus:ring-purple-400/20"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Difficulty</label>
            <div className="flex gap-1 rounded-xl border border-gray-200 p-1 dark:border-gray-700">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => onDifficultyChange(d)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                    difficulty === d
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {d === 'quick' ? '⚡ Quick' : d === 'balanced' ? '⚖️ Balanced' : '🔬 Deep'}
                </button>
              ))}
            </div>
          </div>

          <div className="w-24">
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Questions</label>
            <select
              value={questionCount}
              onChange={(e) => onQuestionCountChange(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-[#1C1E2B] dark:text-[#EDEDEE] dark:focus:border-purple-400 dark:focus:ring-purple-400/20"
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
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
