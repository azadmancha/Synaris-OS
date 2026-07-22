'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, type Session, type AnalyticsResponse, type StudyPlan } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';

// ─── Feature Cards ───────────────────────────────────────

interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  status: 'ready' | 'coming_soon';
  gradient: string;
}

const FEATURES: FeatureCard[] = [
  {
    id: 'learn',
    icon: '🧠',
    title: 'Start Learning',
    description: 'Chat with your AI tutor. Ask questions, explore topics, and build understanding.',
    href: '/learn',
    status: 'ready',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'quiz',
    icon: '📝',
    title: 'Take a Quiz',
    description: 'Test your knowledge with AI-generated quizzes on any topic at any difficulty.',
    href: '/quiz',
    status: 'ready',
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 'study-plan',
    icon: '🗺️',
    title: 'Study Plan',
    description: 'AI-generated personalized learning paths with weekly milestones and practice exercises.',
    href: '/study-plan',
    status: 'ready',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Settings',
    description: 'Customize your learning preferences, subjects, and account settings.',
    href: '/settings',
    status: 'ready',
    gradient: 'from-orange-500 to-amber-600',
  },
  {
    id: 'roadmap',
    icon: '🚀',
    title: 'Coming Features',
    description: 'Knowledge maps, study groups, spaced repetition, handwriting recognition, and more.',
    href: '#',
    status: 'coming_soon',
    gradient: 'from-emerald-500 to-teal-600',
  },
];

// ─── Stat Card ──────────────────────────────────────────

function StatCard({ label, value, icon, color, subtitle }: { label: string; value: string | number; icon: string; color: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1C1E2B]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <span className="text-lg">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-gray-900 dark:text-[#EDEDEE]">{value}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
          {subtitle && <p className="text-[9px] text-gray-400/60">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Activity Bar ────────────────────────────────────────

function ActivityBar({ day, max }: { day: { date: string; sessions: number; messages: number }; max: number }) {
  const height = max > 0 ? (day.sessions / max) * 100 : 0;
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="text-[9px] text-gray-400">{day.sessions}</span>
      <div className="flex h-16 w-full items-end justify-center">
        <div
          className={`w-4 rounded-t-md transition-all ${
            day.sessions > 0
              ? day.sessions >= max * 0.5
                ? 'bg-blue-500'
                : 'bg-blue-300 dark:bg-blue-600'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}
          style={{ height: `${Math.max(height, 4)}%` }}
        />
      </div>
      <span className="text-[9px] text-gray-400">{day.date}</span>
    </div>
  );
}

// ─── Mastery Badge ───────────────────────────────────────

function MasteryBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    mastered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    familiar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    practicing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    introduced: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    undiscovered: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${colors[level] || colors.undiscovered}`}>
      {level}
    </span>
  );
}

// ─── Quiz Score Bar ─────────────────────────────────────

function QuizScoreBar({ percentage }: { percentage: number | null }) {
  if (percentage === null) return <span className="text-[10px] text-gray-400">—</span>;
  const color = percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

// ─── Recent Sessions ─────────────────────────────────────

// ─── Study Plan Progress ──────────────────────────────

function StudyPlanProgress({ plans }: { plans: StudyPlan[] }) {
  const router = useRouter();
  const activePlan = plans.find((p) => p.status === 'active') || plans[0];
  if (!activePlan) return null;

  const weeksElapsed = Math.max(0, Math.floor(
    (Date.now() - new Date(activePlan.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)
  ));
  const completedMilestones = activePlan.milestones.filter((m) => m.week <= weeksElapsed);
  const progress = activePlan.milestones.length > 0
    ? Math.min(1, completedMilestones.length / activePlan.milestones.length)
    : 0;
  const nextMilestone = activePlan.milestones.find((m) => m.week > weeksElapsed);
  const goalLabel = (
    activePlan.goal === 'exam_prep' ? '🎯 Exam Prep' :
    activePlan.goal === 'skill_building' ? '🛠️ Skill Building' :
    activePlan.goal === 'research' ? '🔬 Research' :
    '🧠 Curiosity'
  );

  return (
    <div className="mb-8 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-5 dark:border-emerald-800/40 dark:from-emerald-900/15 dark:to-[#151728]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <span className="text-lg">🗺️</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">{activePlan.title}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
              <span>{goalLabel}</span>
              <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
              <span>{activePlan.estimated_duration_weeks} weeks</span>
              <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
              <span>{activePlan.milestones.length} milestones</span>
            </div>
          </div>
        </div>
        <a href="/study-plan" className="shrink-0 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]">
          Continue →
        </a>
      </div>

      {/* Progress bar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {Math.round(progress * 100)}%
        </span>
      </div>

      {/* Next milestone */}
      {nextMilestone && (
        <div className="rounded-lg border border-emerald-100 bg-white/60 p-3 dark:border-emerald-900/20 dark:bg-[#1C1E2B]/40">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {nextMilestone.week}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Next Milestone</span>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">{nextMilestone.title}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{nextMilestone.description}</p>
          {nextMilestone.topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {nextMilestone.topics.slice(0, 4).map((topic, i) => (
                <span key={i} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{topic}</span>
              ))}
              {nextMilestone.topics.length > 4 && (
                <span className="text-[9px] text-gray-400">+{nextMilestone.topics.length - 4} more</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecentSessionsList({ sessions }: { sessions: Session[] }) {
  const router = useRouter();

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-6 text-center dark:border-gray-600 dark:bg-[#1C1E2B]/50">
        <p className="text-sm text-gray-400">No learning sessions yet</p>
        <p className="mt-1 text-xs text-gray-400/60">Start a new chat to begin learning</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sessions.slice(0, 5).map((s) => {
        const date = new Date(s.created_at);
        const isToday = new Date().toDateString() === date.toDateString();
        const timeStr = isToday
          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

        return (
          <button
            key={s.id}
            onClick={() => router.push('/learn')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-[#1C1E2B]"
          >
            <span className="text-base">
              {s.subject === 'mathematics' ? '📐' : s.subject === 'science' ? '🔬' : '💬'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                {s.title || 'Untitled'}
              </p>
              <p className="text-[10px] text-gray-400">{timeStr} · {s.message_count} messages</p>
            </div>
            <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// ─── Study Plan Stat Card Helper ──────────────────────────

/** Compute the active study plan stats for the quick stats row. */
function getStudyPlanStatCard(studyPlans: StudyPlan[]): React.ReactNode {
  const activePlan = studyPlans.find((p) => p.status === 'active') || studyPlans[0];
  if (!activePlan || activePlan.milestones.length === 0) return null;

  const weeksElapsed = Math.max(0, Math.floor(
    (Date.now() - new Date(activePlan.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)
  ));
  const completedCount = activePlan.milestones.filter((m) => m.week <= weeksElapsed).length;
  const progressPct = Math.round((completedCount / activePlan.milestones.length) * 100);
  const nextMilestone = activePlan.milestones.find((m) => m.week > weeksElapsed);
  const nextDueDate = nextMilestone
    ? new Date(new Date(activePlan.created_at).getTime() + nextMilestone.week * 7 * 24 * 60 * 60 * 1000)
    : null;
  const dueStr = nextDueDate
    ? (nextDueDate <= new Date() ? 'Due now!' : `Due ${nextDueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`)
    : 'Complete!';

  return (
    <StatCard
      label="Study Plan"
      value={`${progressPct}%`}
      icon="🗺️"
      color="bg-emerald-50 dark:bg-emerald-900/20"
      subtitle={nextMilestone ? `Week ${nextMilestone.week}: ${nextMilestone.title.slice(0, 24)}${nextMilestone.title.length > 24 ? '…' : ''} · ${dueStr}` : dueStr}
    />
  );
}

// ─── Main Dashboard ──────────────────────────────────────

/** Wrapper that provides a Suspense boundary for useSearchParams. */
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading your learning dashboard...</p>
        </div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isGuest = searchParams.get('dev') === '1';
  const { user, isLoading: authLoading, handleSignOut } = useAuth(isGuest);
  const [dataLoading, setDataLoading] = useState(true);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    if (authLoading) return;
    async function loadData() {
      try {
        const [sessionList, analyticsData, plansData] = await Promise.all([
          api.listSessions().catch(() => ({ sessions: [], total: 0 })),
          api.getAnalytics().catch(() => null),
          api.listStudyPlans().catch(() => ({ study_plans: [], total: 0 })),
        ]);
        setRecentSessions(sessionList.sessions || []);
        setAnalytics(analyticsData);
        setStudyPlans(plansData.study_plans || []);
      } catch { /* ignore */ }
      finally { setDataLoading(false); }
    }
    loadData();
  }, [authLoading]);

  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading your learning dashboard...</p>
        </div>
      </main>
    );
  }

  const a = analytics;
  const studyPlanStat = studyPlans.length > 0 ? getStudyPlanStatCard(studyPlans) : null;

  return (
    <AppLayout activeNav="dashboard" user={user} isGuest={isGuest} onSignOut={handleSignOut}>
      {/* ── Greeting ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDEE]">
          {greeting}{user ? `, ${user.name.split(' ')[0]}` : ''} 👋
        </h1>
        {a && (
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <span className={`h-1.5 w-1.5 rounded-full ${a.is_active_today ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
              {a.is_active_today ? 'Learned today' : 'Start a session'}
            </span>
            {a.learning_streak_days > 0 && (
              <>
                <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
                <span className="inline-flex items-center gap-1 text-xs text-orange-500">
                  🔥 {a.learning_streak_days} day streak
                </span>
              </>
            )}
            {a.top_subject && (
              <>
                <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400">Focus: {a.top_subject}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Stats ── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          label="Learning Streak"
          value={a?.learning_streak_days ? `🔥 ${a.learning_streak_days}d` : '—'}
          icon="🔥"
          color="bg-orange-50 dark:bg-orange-900/20"
          subtitle={a ? (a.is_active_today ? 'Active today' : 'Start learning!') : undefined}
        />
        <StatCard
          label="Quizzes Taken"
          value={a?.total_quizzes ?? '—'}
          icon="📝"
          color="bg-purple-50 dark:bg-purple-900/20"
          subtitle={a?.quizzes_completed ? `${a.quizzes_completed} completed` : undefined}
        />
        <StatCard
          label="Concepts"
          value={a?.total_concepts ?? '—'}
          icon="🧠"
          color="bg-emerald-50 dark:bg-emerald-900/20"
          subtitle={a ? `${a.mastered_concepts} mastered · ${a.learning_concepts} learning` : undefined}
        />
        <StatCard
          label="Subjects"
          value={a?.subjects.length ?? '—'}
          icon="📚"
          color="bg-blue-50 dark:bg-blue-900/20"
          subtitle={a?.top_subject ? `Top: ${a.top_subject}` : undefined}
        />
        {studyPlanStat}
      </div>

      {/* ── Activity Timeline ── */}
      {a && a.activity_timeline.length > 0 && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#151728]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-[#EDEDEE]">Activity (7 days)</h3>
            <span className="text-[9px] text-gray-400">Sessions per day</span>
          </div>
          <div className="flex items-end gap-1">
            {a.activity_timeline.map((day, i) => (
              <ActivityBar key={i} day={day} max={Math.max(...a.activity_timeline.map((d) => d.sessions), 1)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Quiz Performance ── */}
      {a && a.quizzes_completed > 0 && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#151728]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-[#EDEDEE]">Quiz Performance</h3>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span>Avg: <strong className="text-gray-700 dark:text-gray-300">{a.average_quiz_score ?? '—'}%</strong></span>
              <span>Best: <strong className="text-gray-700 dark:text-gray-300">{a.highest_quiz_score ?? '—'}%</strong></span>
              {a.quiz_streak > 0 && <span className="text-green-600 dark:text-green-400">Streak: {a.quiz_streak} 🏆</span>}
            </div>
          </div>
          <div className="space-y-2">
            {a.recent_quizzes.slice(0, 5).map((q) => (
              <div key={q.quiz_id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{q.topic}</p>
                  <p className="text-[9px] text-gray-400">{q.difficulty} · {q.score}/{q.total_points}</p>
                </div>
                <QuizScoreBar percentage={q.percentage} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Concept Mastery ── */}
      {a && a.total_concepts > 0 && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#151728]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-[#EDEDEE]">Concept Mastery</h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-green-600 dark:text-green-400">✅ {a.mastered_concepts} mastered</span>
              <span className="text-[9px] text-blue-600 dark:text-blue-400">📖 {a.learning_concepts} learning</span>
              <span className="text-[9px] text-gray-400">⚪ {a.undiscovered_concepts} new</span>
            </div>
          </div>
          {a.average_confidence !== null && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Avg confidence:</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${a.average_confidence * 100}%` }} />
              </div>
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                {Math.round(a.average_confidence * 100)}%
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {a.concept_mastery.slice(0, 9).map((c) => (
              <div key={c.concept_name} className="rounded-lg border border-gray-100 bg-gray-50/50 p-2 dark:border-gray-700 dark:bg-[#1C1E2B]/50">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[10px] font-medium text-gray-700 dark:text-gray-300">{c.concept_name}</p>
                  <MasteryBadge level={c.mastery_level} />
                </div>
                <p className="mt-0.5 text-[9px] text-gray-400">{c.subject} · {c.times_encountered}x</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Subject Breakdown ── */}
      {a && a.subjects.length > 0 && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#151728]">
          <h3 className="mb-3 text-xs font-semibold text-gray-900 dark:text-[#EDEDEE]">Subjects</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {a.subjects.map((s) => (
              <div key={s.subject} className="rounded-lg border border-gray-100 bg-gray-50/50 p-2 dark:border-gray-700 dark:bg-[#1C1E2B]/50">
                <p className="text-xs font-medium text-gray-700 capitalize dark:text-gray-300">{s.subject}</p>
                <p className="text-[9px] text-gray-400">{s.session_count} sessions · {s.message_count} messages</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Feature Cards Grid ── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.id} className="group relative">
            <a
              href={feature.href}
              onClick={(e) => { if (feature.status === 'coming_soon') e.preventDefault(); }}
              className={`block rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-700 dark:bg-[#151728] ${feature.status === 'coming_soon' ? 'opacity-60 hover:opacity-80' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg ${feature.status === 'ready' ? 'shadow-blue-500/20' : ''}`}>
                  <span className="text-xl">{feature.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">{feature.title}</h3>
                    {feature.status === 'coming_soon' && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">Coming Soon</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{feature.description}</p>
                </div>
                {feature.status === 'ready' && (
                  <svg className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </a>
          </div>
        ))}
      </div>

      {/* ── Study Plan Progress ── */}
      {studyPlans.length > 0 && <StudyPlanProgress plans={studyPlans} />}

      {/* ── Recent Sessions ── */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">Recent Sessions</h2>
          <a href="/learn" className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">View all →</a>
        </div>
        <RecentSessionsList sessions={recentSessions} />
      </section>

      {/* ── First learned date ── */}
      {a?.first_learning_date && (
        <p className="mb-8 text-center text-[10px] text-gray-400">
          Learning since {new Date(a.first_learning_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      )}
    </AppLayout>
  );
}
