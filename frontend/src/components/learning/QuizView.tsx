'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { api, type Quiz } from '@/lib/api';
import { QuizIdleForm } from '@/components/quiz/QuizIdleForm';
import { QuizGenerating } from '@/components/quiz/QuizGenerating';
import { QuizAnswering } from '@/components/quiz/QuizAnswering';
import { QuizReview } from '@/components/quiz/QuizReview';

type QuizPhase = 'idle' | 'generating' | 'answering' | 'submitting' | 'reviewing';

interface QuizViewProps {
  sessionId: string;
  onError: (error: string) => void;
  onClose?: () => void;
  prefillTopic?: string;
}

export default function QuizView({ sessionId, onError, onClose, prefillTopic }: QuizViewProps) {
  const [phase, setPhase] = useState<QuizPhase>('idle');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [topic, setTopic] = useState(prefillTopic || '');
  const [difficulty, setDifficulty] = useState<'quick' | 'balanced' | 'deep_dive'>('balanced');
  const [questionCount, setQuestionCount] = useState(5);
  const [streamingText, setStreamingText] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [phase, currentIdx]);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    setPhase('generating');
    setQuiz(null);
    setAnswers({});
    setCurrentIdx(0);
    setStreamingText('');

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      await api.generateQuizStream(
        sessionId, topic.trim(), difficulty, questionCount,
        {
          onToken: (token) => setStreamingText((prev) => prev + token),
          onDone: (generated) => {
            setQuiz(generated);
            setStreamingText('');
            setPhase('answering');
          },
          onError: (errMsg) => { onError(errMsg); setPhase('idle'); },
        },
        abortController.signal,
      );
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        onError(err instanceof Error ? err.message : 'Failed to generate quiz');
        setPhase('idle');
      }
    }
  }, [sessionId, topic, difficulty, questionCount, onError]);

  const handleSelectAnswer = useCallback(
    (questionId: string, answer: string) => {
      if (phase !== 'answering') return;
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    },
    [phase],
  );

  const handleSubmit = useCallback(async () => {
    if (!quiz || phase !== 'answering') return;
    setPhase('submitting');

    const answerList = Object.entries(answers).map(([question_id, user_answer]) => ({
      question_id, user_answer,
    }));

    try {
      const result = await api.submitQuizAnswers(sessionId, quiz.id, answerList);
      setQuiz(result);
      setPhase('reviewing');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to submit answers');
      setPhase('answering');
    }
  }, [quiz, sessionId, answers, phase, onError]);

  const handleReset = useCallback(() => {
    setPhase('idle');
    setQuiz(null);
    setAnswers({});
    setCurrentIdx(0);
    setTopic('');
  }, []);

  return (
    <div ref={scrollRef} className="quiz-view my-4">
      {phase === 'idle' && (
        <QuizIdleForm
          topic={topic}
          difficulty={difficulty}
          questionCount={questionCount}
          onTopicChange={setTopic}
          onDifficultyChange={setDifficulty}
          onQuestionCountChange={setQuestionCount}
          onGenerate={handleGenerate}
          onClose={onClose}
        />
      )}

      {phase === 'generating' && (
        <QuizGenerating
          topic={topic}
          streamingText={streamingText}
          onCancel={onClose ? () => { abortRef.current?.abort(); onClose(); } : undefined}
        />
      )}

      {(phase === 'answering' || phase === 'submitting') && quiz && (
        <QuizAnswering
          quiz={quiz}
          currentIdx={currentIdx}
          answers={answers}
          phase={phase}
          onSelectAnswer={handleSelectAnswer}
          onSubmit={handleSubmit}
          onNavigate={setCurrentIdx}
          onClose={onClose}
        />
      )}

      {phase === 'reviewing' && quiz && (
        <QuizReview
          quiz={quiz}
          answers={answers}
          onNewQuiz={handleReset}
          onRetake={() => {
            setPhase('idle');
            setQuiz(null);
            setAnswers({});
            setCurrentIdx(0);
            if (quiz) setTopic(quiz.topic);
          }}
          onClose={onClose}
        />
      )}
    </div>
  );
}
