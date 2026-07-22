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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-[#151728]">
      {/* Score header */}
      <div className="border-b border-gray-100 px-5 py-4 text-center dark:border-gray-700">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
          <span className="text-2xl">
            {score / total >= 0.8 ? '🌟' : score / total >= 0.5 ? '👍' : '📚'}
          </span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-[#EDEDEE]">
          {score}/{total} Correct
        </h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {score === total
            ? 'Perfect score! Excellent work! 🎉'
            : score / total >= 0.8
              ? 'Great job! Almost perfect.'
              : score / total >= 0.5
                ? 'Good effort! Review the explanations below.'
                : 'Keep studying! Review the correct answers below.'}
        </p>
        <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-wider text-gray-400">
          <span>{quiz.topic}</span>
          <span className="h-3 w-px bg-gray-300 dark:bg-gray-600" />
          <span>{quiz.difficulty}</span>
        </div>
      </div>

      {/* Question review */}
      <div className="divide-y divide-gray-100 px-5 dark:divide-gray-700">
        {questions.map((q, i) => {
          const userAns = q.user_answer || answers[q.id] || '';
          const correct = q.correct_answer || '';
          const isCorrect = q.is_correct ?? (userAns.toLowerCase().trim() === correct.toLowerCase().trim());
          const isMcq = q.type === 'multiple_choice' || q.type === 'true_false';

          return (
            <div key={q.id} className="py-4">
              <div className="mb-2 flex items-start gap-2">
                {isCorrect ? (
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-relaxed text-gray-900 dark:text-[#EDEDEE]">
                    {i + 1}. {q.question}
                  </p>

                  {isMcq && q.options && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt, oi) => {
                        const isOptCorrect = opt === correct;
                        const isOptSelected = opt === userAns;
                        let optStyle = 'text-gray-500 dark:text-gray-400';
                        if (isOptCorrect && isOptSelected) optStyle = 'text-green-700 dark:text-green-400 font-medium';
                        else if (isOptCorrect) optStyle = 'text-green-600 dark:text-green-500';
                        else if (isOptSelected && !isOptCorrect) optStyle = 'text-red-600 dark:text-red-400 line-through';

                        return (
                          <div key={oi} className={`flex items-center gap-2 text-xs ${optStyle}`}>
                            <span className="w-4 text-center">{answerLetter(oi)}</span>
                            <span>{opt}</span>
                            {isOptCorrect && isOptSelected && <span className="text-green-500">✓</span>}
                            {isOptCorrect && !isOptSelected && (
                              <span className="rounded bg-green-100 px-1 text-[9px] text-green-600 dark:bg-green-900/30 dark:text-green-400">correct</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isMcq && (
                    <div className="mt-2 space-y-1">
                      <p className={`text-xs ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        Your answer: {userAns || '(none)'}
                      </p>
                      {!isCorrect && <p className="text-xs text-green-600 dark:text-green-400">Correct: {correct}</p>}
                    </div>
                  )}
                </div>
              </div>

              {q.explanation && (
                <div className="ml-6 mt-2 flex items-start gap-1.5 rounded-lg bg-gray-50 px-3 py-2 dark:bg-[#1C1E2B]">
                  <span className="mt-0.5 text-xs">💡</span>
                  <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
        {onClose && (
          <button
            onClick={() => { onNewQuiz(); onClose(); }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-5 py-2 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.97] dark:border-gray-600 dark:text-gray-400 dark:hover:bg-[#1C1E2B]"
          >
            Close
          </button>
        )}
        <button
          onClick={onNewQuiz}
          className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-5 py-2 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.97] dark:border-gray-600 dark:text-gray-400 dark:hover:bg-[#1C1E2B]"
        >
          New Quiz
        </button>
        <button
          onClick={onRetake}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-indigo-700 active:scale-[0.97]"
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
