'use client';

import type { Quiz } from '@/lib/api';
import { answerLetter } from '@/components/quiz/QuizComponents';

interface QuizReviewProps {
  quiz: Quiz;
  answers: Record<string, string>;
  onNewQuiz: () => void;
  onRetake: () => void;
  onClose?: () => void;
}

export function QuizReview({ quiz, answers, onNewQuiz, onRetake, onClose }: QuizReviewProps) {
  const questions = quiz.questions || [];
  const score = quiz.score ?? 0;
  const total = quiz.total_points ?? questions.length;
  const pct = total > 0 ? score / total : 0;

  return (
    <div className="glass-card overflow-hidden">
      {/* Score header */}
      <div className="border-b border-gray-700/40 px-5 py-5 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-synapse-neon-purple to-indigo-600 shadow-glow-purple">
          <span className="text-2xl">
            {pct >= 0.8 ? '🌟' : pct >= 0.5 ? '👍' : '📚'}
          </span>
        </div>
        <h3 className="text-lg font-bold text-glass-primary">
          {score}/{total} Correct
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          {score === total
            ? 'Perfect score! Excellent work! 🎉'
            : pct >= 0.8
              ? 'Great job! Almost perfect.'
              : pct >= 0.5
                ? 'Good effort! Review the explanations below.'
                : 'Keep studying! Review the correct answers below.'}
        </p>
        <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          <span>{quiz.topic}</span>
          <span className="h-3 w-px bg-gray-700" />
          <span>{quiz.difficulty}</span>
        </div>

        {/* Score bar */}
        <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-gray-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${
              pct >= 0.8 ? 'from-synapse-neon-green to-emerald-400' : pct >= 0.5 ? 'from-synapse-neon-amber to-amber-400' : 'from-synapse-neon-red to-red-400'
            }`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>

      {/* Question review */}
      <div className="divide-y divide-gray-700/30 px-5">
        {questions.map((q, i) => {
          const userAns = q.user_answer || answers[q.id] || '';
          const correct = q.correct_answer || '';
          const isCorrect = q.is_correct ?? (userAns.toLowerCase().trim() === correct.toLowerCase().trim());
          const isMcq = q.type === 'multiple_choice' || q.type === 'true_false';

          return (
            <div key={q.id} className="py-4">
              <div className="mb-2 flex items-start gap-2">
                {isCorrect ? (
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-synapse-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-synapse-neon-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-relaxed text-gray-200">
                    {i + 1}. {q.question}
                  </p>

                  {isMcq && q.options && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt, oi) => {
                        const isOptCorrect = opt === correct;
                        const isOptSelected = opt === userAns;
                        let optStyle = 'text-gray-500';
                        if (isOptCorrect && isOptSelected) optStyle = 'text-synapse-neon-green font-medium';
                        else if (isOptCorrect) optStyle = 'text-synapse-neon-green/70';
                        else if (isOptSelected && !isOptCorrect) optStyle = 'text-synapse-neon-red line-through';

                        return (
                          <div key={oi} className={`flex items-center gap-2 text-xs ${optStyle}`}>
                            <span className="w-4 text-center">{answerLetter(oi)}</span>
                            <span>{opt}</span>
                            {isOptCorrect && isOptSelected && <span className="text-synapse-neon-green">✓</span>}
                            {isOptCorrect && !isOptSelected && (
                              <span className="rounded border border-synapse-neon-green/20 bg-synapse-neon-green/10 px-1 text-[9px] text-synapse-neon-green">correct</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isMcq && (
                    <div className="mt-2 space-y-1">
                      <p className={`text-xs ${isCorrect ? 'text-synapse-neon-green' : 'text-synapse-neon-red'}`}>
                        Your answer: {userAns || '(none)'}
                      </p>
                      {!isCorrect && <p className="text-xs text-synapse-neon-green">Correct: {correct}</p>}
                    </div>
                  )}
                </div>
              </div>

              {q.explanation && (
                <div className="ml-6 mt-2 flex items-start gap-1.5 rounded-lg border border-synapse-neon-blue/10 bg-synapse-neon-blue/5 px-3 py-2">
                  <span className="mt-0.5 text-xs">💡</span>
                  <p className="text-[11px] leading-relaxed text-gray-400">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3 border-t border-gray-700/40 px-5 py-4">
        {onClose && (
          <button
            onClick={() => { onNewQuiz(); onClose(); }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-700/50 px-5 py-2 text-xs font-medium text-gray-400 transition-all hover:bg-white/[0.05] hover:text-gray-200 active:scale-[0.97]"
          >
            Close
          </button>
        )}
        <button
          onClick={onNewQuiz}
          className="flex items-center gap-1.5 rounded-xl border border-gray-700/50 px-5 py-2 text-xs font-medium text-gray-400 transition-all hover:bg-white/[0.05] hover:text-gray-200 active:scale-[0.97]"
        >
          New Quiz
        </button>
        <button
          onClick={onRetake}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-synapse-neon-purple to-indigo-600 px-5 py-2 text-xs font-medium text-white shadow-glow-sm transition-all duration-200 hover:shadow-glow-purple hover:brightness-110 active:scale-[0.97]"
        >
          Retake
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
