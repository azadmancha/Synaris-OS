'use client';

import type { Quiz, Question } from '@/lib/api';
import { AnswerOption, ShortAnswerInput, answerLetter } from '@/components/quiz/QuizComponents';

interface QuizAnsweringProps {
  quiz: Quiz;
  currentIdx: number;
  answers: Record<string, string>;
  phase: 'answering' | 'submitting';
  onSelectAnswer: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  onNavigate: (idx: number) => void;
  onClose?: () => void;
}

export function QuizAnswering({
  quiz, currentIdx, answers, phase,
  onSelectAnswer, onSubmit, onNavigate, onClose,
}: QuizAnsweringProps) {
  const questions = quiz.questions || [];
  const currentQuestion = questions[currentIdx];
  const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length;
  const allAnswered = questions.every((q) => answers[q.id]?.trim());
  const isLastQuestion = currentIdx >= questions.length - 1;
  const isSubmitting = phase === 'submitting';

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="text-sm font-semibold text-glass-primary">{quiz.topic}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            {answeredCount}/{questions.length} Answered
          </span>
          {onClose && (
            <button onClick={onClose} className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-white/[0.05] hover:text-gray-300" title="Close quiz">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-synapse-neon-purple to-indigo-500 shadow-glow-sm transition-all duration-500"
          style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }}
        />
      </div>

      <div className="p-5">
        {/* Question navigation dots */}
        {questions.length > 1 && (
          <div className="mb-4 flex items-center gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => onNavigate(i)}
                disabled={isSubmitting}
                className={`h-2 rounded-full transition-all ${
                  i === currentIdx
                    ? 'w-6 bg-synapse-neon-purple shadow-glow-sm'
                    : answers[q.id]?.trim()
                      ? 'w-2 bg-synapse-neon-purple/50'
                      : 'w-2 bg-gray-700'
                }`}
                title={`Question ${i + 1}`}
              />
            ))}
          </div>
        )}

        {currentQuestion && (
          <div className="animate-message-in space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Question {currentIdx + 1} of {questions.length}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-gray-200">
                {currentQuestion.question}
              </p>
            </div>

            {/* Multiple choice */}
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, i) => (
                  <AnswerOption
                    key={i}
                    label={answerLetter(i)}
                    text={option}
                    selected={answers[currentQuestion.id] === option}
                    revealed={isSubmitting}
                    isCorrect={option === currentQuestion.correct_answer}
                    disabled={isSubmitting}
                    onSelect={() => onSelectAnswer(currentQuestion.id, option)}
                  />
                ))}
              </div>
            )}

            {/* True/False */}
            {currentQuestion.type === 'true_false' && currentQuestion.options && (
              <div className="flex gap-3">
                {currentQuestion.options.map((option, i) => (
                  <div key={i} className="flex-1">
                    <AnswerOption
                      label={option === 'True' ? '✔️' : '✖️'}
                      text={option}
                      selected={answers[currentQuestion.id] === option}
                      revealed={isSubmitting}
                      isCorrect={option === currentQuestion.correct_answer}
                      disabled={isSubmitting}
                      onSelect={() => onSelectAnswer(currentQuestion.id, option)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Short answer */}
            {currentQuestion.type === 'short_answer' && (
              <ShortAnswerInput
                value={answers[currentQuestion.id] || ''}
                revealed={isSubmitting}
                isCorrect={answers[currentQuestion.id] === currentQuestion.correct_answer}
                correctAnswer={currentQuestion.correct_answer}
                disabled={isSubmitting}
                onChange={(val) => onSelectAnswer(currentQuestion.id, val)}
              />
            )}
          </div>
        )}

        {/* Navigation buttons */}
        {phase === 'answering' && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={() => onNavigate(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 transition-all hover:bg-white/[0.05] hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Previous
            </button>
            <div className="flex gap-2">
              {isLastQuestion ? (
                <button
                  onClick={onSubmit}
                  disabled={!allAnswered}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-synapse-neon-purple to-indigo-600 px-5 py-2 text-xs font-medium text-white shadow-glow-sm transition-all duration-200 hover:shadow-glow-purple hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  Submit Answers
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate(Math.min(questions.length - 1, currentIdx + 1))}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-synapse-neon-purple to-indigo-600 px-5 py-2 text-xs font-medium text-white shadow-glow-sm transition-all duration-200 hover:shadow-glow-purple hover:brightness-110 active:scale-[0.97]"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}

        {isSubmitting && (
          <div className="mt-5 flex items-center justify-center gap-2 py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-synapse-neon-purple border-t-transparent" />
            <span className="text-xs text-gray-500">Scoring your answers...</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes quiz-message-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .quiz-view .animate-message-in { animation: quiz-message-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
