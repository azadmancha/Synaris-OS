'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { api, type Session, type Quiz, type AnalyticsResponse } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import QuizView from '@/components/learning/QuizView';

// ─── Ambient Background ─────────────────────────────────

function AmbientBackground() {
  return (
    <>
      <div className="grid-overlay" />
      <div className="orb-container">
        <div className="orb orb-1" style={{ width: '350px', height: '350px', background: '#A855F7', top: '-5%', left: '10%' }} />
        <div className="orb orb-2" style={{ width: '300px', height: '300px', background: '#EC4899', bottom: '-5%', right: '5%' }} />
        <div className="orb orb-3" style={{ width: '200px', height: '200px', background: '#6366F1', top: '30%', left: '60%' }} />
      </div>
    </>
  );
}

/** Wrapper that provides a Suspense boundary for useSearchParams. */
export default function QuizPage() {
  return (
    <Suspense fallback={
      <main className="relative flex min-h-screen items-center justify-center bg-[#0F1117]">
        <AmbientBackground />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <div className="relative">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-synapse-neon-purple border-t-transparent" />
              <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-synapse-neon-purple/10" />
            </div>
          </div>
          <p className="text-sm text-gray-400">Loading quiz center...</p>
        </div>
      </main>
    }>
      <QuizPageContent />
    </Suspense>
  );
}

function QuizPageContent() {
  const searchParams = useSearchParams();
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
      <main className="relative flex min-h-screen items-center justify-center bg-[#0F1117]">
        <AmbientBackground />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <div className="relative">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-synapse-neon-purple border-t-transparent" />
              <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-synapse-neon-purple/10" />
            </div>
          </div>
          <p className="text-sm text-gray-400">Loading quiz center...</p>
        </div>
      </main>
    );
  }

  const a = analytics;

  return (
    <AppLayout activeNav="quiz" user={user} isGuest={isGuest} onSignOut={handleSignOut}>
      <AmbientBackground />
      <div className="relative z-10">
        {/* ── Hero ── */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-synapse-neon-purple to-pink-600 shadow-glow-purple">
              <span className="text-2xl">🧠</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-gradient-blue">Quiz Center</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Test your knowledge with AI-generated quizzes
              </p>
            </div>
          </div>
        </div>

        {/* ── Mistake Analytics & Practice ── */}
        {a && a.total_mistakes > 0 && (
          <div className="mb-6 glass-card animate-slide-up overflow-hidden border-synapse-neon-amber/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/10">
                    <span className="text-sm">🎯</span>
                  </div>
                  <h2 className="text-sm font-semibold text-glass-primary">Practice Mistakes</h2>
                </div>
                <p className="text-xs text-amber-400/80">
                  You have <strong className="text-amber-300">{a.total_mistakes}</strong> wrong answers across your quizzes
                </p>
                {a.weakest_topics.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {a.weakest_topics.slice(0, 3).map((wt) => (
                      <div key={wt.topic} className="flex items-center gap-2">
                        <span className="text-xs text-amber-300/80 capitalize">{wt.topic}:</span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${wt.accuracy * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-amber-400/80">{Math.round(wt.accuracy * 100)}%</span>
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
                  className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-xs font-semibold text-white shadow-glow-sm transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-[0.97]"
                >
                  Practice Weak Areas
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Error Banner ── */}
        {quizError && (
          <div className="mb-4 animate-slide-down rounded-xl border border-synapse-neon-red/20 bg-synapse-neon-red/5 px-4 py-3 text-xs text-synapse-neon-red">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{quizError}</span>
              <button onClick={() => setQuizError(null)} className="ml-auto text-synapse-neon-red/60 hover:text-synapse-neon-red">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-600/10">
                <span className="text-sm">📋</span>
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Quiz History</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {quizHistory.slice(0, 10).map((q) => {
                const pct = q.score !== null && q.total_points && q.total_points > 0
                  ? Math.round((q.score / q.total_points) * 100) : null;

                return (
                  <div key={q.id} className="glass-card p-4 transition-all duration-200 hover:border-synapse-neon-purple/20 hover:shadow-card-hover">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-gray-200">{q.topic}</p>
                        <p className="mt-0.5 text-[10px] text-gray-500">{q.difficulty} · {q.question_count} questions</p>
                      </div>
                      {pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-800">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${
                                pct >= 80 ? 'from-synapse-neon-green to-emerald-400' : pct >= 50 ? 'from-synapse-neon-amber to-amber-400' : 'from-synapse-neon-red to-red-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${
                            pct >= 80 ? 'text-synapse-neon-green' : pct >= 50 ? 'text-synapse-neon-amber' : 'text-synapse-neon-red'
                          }`}>
                            {pct}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-500">Not completed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
