'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { api, type Session, type Quiz, type AnalyticsResponse } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import QuizView from '@/components/learning/QuizView';

/** Wrapper that provides a Suspense boundary for useSearchParams. */
export default function QuizPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading quiz center...</p>
        </div>
      </main>
    }>
      <QuizPageContent />
    </Suspense>
  );
}

function QuizPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isGuest = searchParams.get('dev') === '1';
  const topicParam = searchParams.get('topic');
  const { user, isLoading: authLoading, handleSignOut } = useAuth(isGuest);

  const [session, setSession] = useState<Session | null>(null);
  const [quizHistory, setQuizHistory] = useState<Quiz[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Initialize session (persistent across page visits)
  useEffect(() => {
    if (authLoading) return;
    async function initSession() {
      try {
        // Reuse a persistent quiz session so history accumulates
        let quizSession: Session;
        const storedSessionId = localStorage.getItem('synaris_quiz_session');
        if (storedSessionId) {
          try {
            quizSession = await api.getSession(storedSessionId);
          } catch {
            localStorage.removeItem('synaris_quiz_session');
            quizSession = await api.createSession('balanced', 'quiz');
            localStorage.setItem('synaris_quiz_session', quizSession.id);
          }
        } else {
          quizSession = await api.createSession('balanced', 'quiz');
          localStorage.setItem('synaris_quiz_session', quizSession.id);
        }
        setSession(quizSession);

        // Load quiz history + analytics in parallel
        const [quizList, analyticsData] = await Promise.all([
          api.listQuizzes(quizSession.id).catch(() => ({ quizzes: [], total: 0 })),
          api.getAnalytics().catch(() => null),
        ]);
        setQuizHistory(quizList.quizzes || []);
        setAnalytics(analyticsData);
      } catch { /* ignore */ }
      finally { setDataLoading(false); }
    }
    initSession();
  }, [authLoading]);

  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading quiz center...</p>
        </div>
      </main>
    );
  }

  const a = analytics;

  return (
    <AppLayout activeNav="quiz" user={user} isGuest={isGuest} onSignOut={handleSignOut}>
      {/* ── Hero ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/20">
            <span className="text-lg">🧠</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-[#EDEDEE]">Quiz Center</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Test your knowledge with AI-generated quizzes
            </p>
          </div>
        </div>
      </div>

      {/* ── Mistake Analytics & Practice ── */}
      {a && a.total_mistakes > 0 && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/20 dark:bg-amber-900/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Practice Mistakes</h2>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                You have <strong>{a.total_mistakes}</strong> wrong answers across your quizzes
              </p>
              {a.weakest_topics.length > 0 && (
                <div className="mt-2 space-y-1">
                  {a.weakest_topics.slice(0, 3).map((wt) => (
                    <div key={wt.topic} className="flex items-center gap-2">
                      <span className="text-xs text-amber-700 dark:text-amber-400">{wt.topic}:</span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/30">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${wt.accuracy * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">{Math.round(wt.accuracy * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {session && (
              <button
                onClick={async () => {
                  try {
                    const newQuiz = await api.generatePracticeQuiz(session.id);
                    setQuizHistory((prev) => [newQuiz, ...prev]);
                    setQuizError(null);
                  } catch (err) {
                    setQuizError(err instanceof Error ? err.message : 'Generation failed');
                  }
                }}
                className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.97]"
              >
                Practice Weak Areas
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {quizError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">
          {quizError}
          <button onClick={() => setQuizError(null)} className="ml-2 font-medium hover:underline">Dismiss</button>
        </div>
      )}

      {/* ── Quiz Generator ── */}
      {session && (
        <div className="mb-8">
          <QuizView
            sessionId={session.id}
            prefillTopic={topicParam || undefined}
            onError={(msg) => setQuizError(msg)}
          />
        </div>
      )}

      {/* ── Quiz History ── */}
      {quizHistory.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Quiz History</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quizHistory.slice(0, 10).map((q) => {
              const pct = q.score !== null && q.total_points && q.total_points > 0
                ? Math.round((q.score / q.total_points) * 100) : null;
              const color = pct !== null ? (pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-gray-300';

              return (
                <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#151728]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-900 dark:text-[#EDEDEE]">{q.topic}</p>
                      <p className="text-[10px] text-gray-400">{q.difficulty} · {q.question_count} questions</p>
                    </div>
                    {pct !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'} dark:${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {pct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400">Not completed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
