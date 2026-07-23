'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, type Session, type AnalyticsResponse, type StudyPlan } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import Link from 'next/link';

// ─── Ambient Background ─────────────────────────────────

function AmbientBackground() {
  return (
    <>
      {/* Grid overlay */}
      <div className="grid-overlay" />
      {/* Floating orbs */}
      <div className="orb-container">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>
    </>
  );
}

// ─── Animated Counter ────────────────────────────────────

function AnimatedCounter({
  value,
  suffix = '',
  duration = 1200,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

// ─── Feature Cards ───────────────────────────────────────

interface FeatureCardData {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  status: 'ready' | 'coming_soon';
  gradient: string;
  glow: string;
  accent: string;
}

const FEATURES: FeatureCardData[] = [
  {
    id: 'learn',
    icon: '🧠',
    title: 'Start Learning',
    description: 'Chat with your AI tutor. Ask questions, explore topics, and build understanding.',
    href: '/learn',
    status: 'ready',
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'shadow-glow-blue',
    accent: 'border-synapse-neon-blue/30',
  },
  {
    id: 'quiz',
    icon: '📝',
    title: 'Take a Quiz',
    description: 'Test your knowledge with AI-generated quizzes on any topic at any difficulty.',
    href: '/quiz',
    status: 'ready',
    gradient: 'from-purple-500 to-pink-600',
    glow: 'shadow-glow-purple',
    accent: 'border-synapse-neon-purple/30',
  },
  {
    id: 'study-plan',
    icon: '🗺️',
    title: 'Study Plan',
    description:
      'AI-generated personalized learning paths with weekly milestones and practice exercises.',
    href: '/study-plan',
    status: 'ready',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-glow-green',
    accent: 'border-synapse-neon-green/30',
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Settings',
    description: 'Customize your learning preferences, subjects, and account settings.',
    href: '/settings',
    status: 'ready',
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-glow-sm',
    accent: 'border-synapse-neon-amber/30',
  },
  {
    id: 'roadmap',
    icon: '🚀',
    title: 'Coming Features',
    description:
      'Knowledge maps, study groups, spaced repetition, handwriting recognition, and more.',
    href: '#',
    status: 'coming_soon',
    gradient: 'from-synapse-neon-cyan to-synapse-neon-blue',
    glow: 'shadow-glow-sm',
    accent: 'border-synapse-neon-cyan/20',
  },
];

// ─── Stat Card (Neon Edition) ────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent = 'blue',
  subtitle,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: string;
  subtitle?: string;
  delay?: number;
}) {
  const accentColors: Record<string, string> = {
    blue: 'border-synapse-neon-blue/20 group-hover:border-synapse-neon-blue/40',
    purple: 'border-synapse-neon-purple/20 group-hover:border-synapse-neon-purple/40',
    green: 'border-synapse-neon-green/20 group-hover:border-synapse-neon-green/40',
    amber: 'border-synapse-neon-amber/20 group-hover:border-synapse-neon-amber/40',
    cyan: 'border-synapse-neon-cyan/20 group-hover:border-synapse-neon-cyan/40',
    pink: 'border-synapse-neon-pink/20 group-hover:border-synapse-neon-pink/40',
  };
  const glowColors: Record<string, string> = {
    blue: 'shadow-glow-blue',
    purple: 'shadow-glow-purple',
    green: 'shadow-glow-green',
    amber: 'shadow-glow-sm',
    cyan: 'shadow-glow-cyan',
    pink: 'shadow-glow-pink',
  };

  return (
    <div
      className="group animate-card-enter opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div
        className={`glass-card relative overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover ${accentColors[accent]} ${glowColors[accent]}`}
      >
        {/* Hover glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${
              accent === 'green'
                ? 'from-emerald-500 to-teal-600'
                : accent === 'purple'
                  ? 'from-purple-500 to-pink-600'
                  : accent === 'amber'
                    ? 'from-amber-500 to-orange-600'
                    : accent === 'cyan'
                      ? 'from-cyan-500 to-blue-600'
                      : accent === 'pink'
                        ? 'from-pink-500 to-rose-600'
                        : 'from-blue-500 to-indigo-600'
            }`}
          >
            <span className="text-lg">{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight text-glass-primary">
              {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400/80">
              {label}
            </p>
            {subtitle && <p className="mt-0.5 text-[9px] text-gray-500/60">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Bar ────────────────────────────────────────

function ActivityBar({
  day,
  max,
  index,
}: {
  day: { date: string; sessions: number; messages: number };
  max: number;
  index: number;
}) {
  const height = max > 0 ? (day.sessions / max) * 100 : 0;
  const [animHeight, setAnimHeight] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimHeight(height), 100 + index * 60);
    return () => clearTimeout(timer);
  }, [height, index]);

  return (
    <div className="group flex flex-1 flex-col items-center gap-1.5">
      <span
        className={`text-[9px] font-medium transition-all duration-300 ${day.sessions > 0 ? 'text-synapse-neon-blue/70' : 'text-gray-600'}`}
      >
        {day.sessions}
      </span>
      <div className="flex h-20 w-full items-end justify-center">
        <div
          className={`w-5 rounded-t-md transition-all duration-700 ease-out ${
            day.sessions > 0
              ? day.sessions >= max * 0.5
                ? 'bg-gradient-to-t from-synapse-neon-blue to-synapse-neon-cyan shadow-glow-sm'
                : 'bg-gradient-to-t from-blue-500/40 to-blue-400/20'
              : 'bg-gray-800/30'
          }`}
          style={{ height: `${Math.max(animHeight, 3)}%` }}
        />
      </div>
      <span className="text-[8px] text-gray-600">{day.date}</span>
    </div>
  );
}

// ─── Mastery Badge ───────────────────────────────────────

function MasteryBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    mastered: 'border-synapse-neon-green/30 bg-synapse-neon-green/10 text-synapse-neon-green',
    familiar: 'border-synapse-neon-blue/30 bg-synapse-neon-blue/10 text-synapse-neon-blue',
    practicing: 'border-synapse-neon-amber/30 bg-synapse-neon-amber/10 text-synapse-neon-amber',
    introduced: 'border-synapse-neon-purple/30 bg-synapse-neon-purple/10 text-synapse-neon-purple',
    undiscovered: 'border-gray-600 bg-gray-800/50 text-gray-500',
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${colors[level] || colors.undiscovered}`}
    >
      {level}
    </span>
  );
}

// ─── Quiz Score Bar ─────────────────────────────────────

function QuizScoreBar({ percentage }: { percentage: number | null }) {
  if (percentage === null) return <span className="text-[10px] text-gray-500">—</span>;
  const color =
    percentage >= 80
      ? 'from-synapse-neon-green to-emerald-400'
      : percentage >= 50
        ? 'from-synapse-neon-amber to-amber-400'
        : 'from-synapse-neon-red to-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} shadow-sm transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-gray-400">{Math.round(percentage)}%</span>
    </div>
  );
}

// ─── Mistake Analysis ────────────────────────────────────

function MistakeAnalysisSection({ analytics }: { analytics: AnalyticsResponse }) {
  const { total_mistakes, weakest_topics, recent_mistakes } = analytics;
  const [expanded, setExpanded] = useState<string | null>(null);

  if (total_mistakes === 0 && weakest_topics.length === 0) return null;

  const worstTopic = weakest_topics[0];

  return (
    <section className="glass-card animate-slide-up overflow-hidden p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/10">
            <span className="text-sm">🎯</span>
          </div>
          <h3 className="text-sm font-semibold text-glass-primary">Mistake Analysis</h3>
          {total_mistakes > 0 && (
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-red-400">
              {total_mistakes} mistake{total_mistakes !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-[9px] text-gray-500">Last 10 shown</span>
      </div>

      {/* Summary cards */}
      {worstTopic && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Weakest Topic',
              value: worstTopic.topic,
              color: 'border-red-500/20 bg-red-500/5',
              textColor: 'text-red-400',
            },
            {
              label: 'Accuracy',
              value: `${Math.round(worstTopic.accuracy * 100)}%`,
              color: 'border-orange-500/20 bg-orange-500/5',
              textColor: 'text-orange-400',
            },
            {
              label: 'Mistakes',
              value: `${worstTopic.mistake_count}/${worstTopic.total_questions}`,
              color: 'border-amber-500/20 bg-amber-500/5',
              textColor: 'text-amber-400',
            },
            {
              label: 'Weak Topics',
              value: weakest_topics.length,
              color: 'border-gray-600/30 bg-gray-800/30',
              textColor: 'text-gray-300',
            },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border ${item.color} p-3`}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">
                {item.label}
              </p>
              <p className={`mt-1 text-sm font-bold ${item.textColor} capitalize`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Weak topics list */}
      {weakest_topics.length > 1 && (
        <div className="mb-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Topics by weakness
          </p>
          <div className="space-y-2">
            {weakest_topics.map((t) => {
              const pct = Math.round(t.accuracy * 100);
              const barColor =
                pct >= 80
                  ? 'from-synapse-neon-green to-emerald-400'
                  : pct >= 50
                    ? 'from-synapse-neon-amber to-amber-400'
                    : 'from-synapse-neon-red to-red-400';
              return (
                <div key={t.topic} className="flex items-center gap-3">
                  <span className="w-24 truncate text-xs font-medium text-gray-300 capitalize sm:w-32">
                    {t.topic}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-[10px] text-gray-500">
                    {t.mistake_count}/{t.total_questions}
                  </span>
                  <span
                    className={`w-10 text-right text-[10px] font-semibold ${
                      pct >= 80
                        ? 'text-synapse-neon-green'
                        : pct >= 50
                          ? 'text-synapse-neon-amber'
                          : 'text-synapse-neon-red'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent mistakes */}
      {recent_mistakes.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Recent Mistakes
          </p>
          <div className="space-y-2">
            {recent_mistakes.map((m, i) => {
              const isExpanded = expanded === `mistake-${i}`;
              return (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-gray-700/50 transition-all duration-200"
                >
                  <button
                    onClick={() => setExpanded(isExpanded ? null : `mistake-${i}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="text-sm">❌</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-300">{m.question}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[9px] text-gray-500">
                        <span className="capitalize">{m.topic}</span>
                        <span className="h-2.5 w-px bg-gray-700" />
                        <span className="capitalize">{m.difficulty}</span>
                        {m.quiz_completed_at && (
                          <>
                            <span className="h-2.5 w-px bg-gray-700" />
                            <span>{new Date(m.quiz_completed_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <svg
                      className={`h-3 w-3 shrink-0 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-700/50 px-4 py-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-widest text-red-400">
                            Your Answer
                          </p>
                          <p className="mt-1 text-xs text-gray-300">{m.user_answer}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-widest text-synapse-neon-green">
                            Correct Answer
                          </p>
                          <p className="mt-1 text-xs text-gray-300">{m.correct_answer}</p>
                        </div>
                      </div>
                      {m.explanation && (
                        <div className="mt-3">
                          <p className="text-[9px] font-semibold uppercase tracking-widest text-synapse-neon-blue">
                            Explanation
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-gray-400">
                            {m.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Study Plan Progress ──────────────────────────────

function StudyPlanProgress({ plans }: { plans: StudyPlan[] }) {
  const router = useRouter();
  const activePlan = plans.find((p) => p.status === 'active') || plans[0];
  if (!activePlan) return null;

  const weeksElapsed = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(activePlan.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000),
    ),
  );
  const completedMilestones = activePlan.milestones.filter((m) => m.week <= weeksElapsed);
  const progress =
    activePlan.milestones.length > 0
      ? Math.min(1, completedMilestones.length / activePlan.milestones.length)
      : 0;
  const nextMilestone = activePlan.milestones.find((m) => m.week > weeksElapsed);
  const goalLabel =
    activePlan.goal === 'exam_prep'
      ? '🎯 Exam Prep'
      : activePlan.goal === 'skill_building'
        ? '🛠️ Skill Building'
        : activePlan.goal === 'research'
          ? '🔬 Research'
          : '🧠 Curiosity';

  return (
    <section className="glass-card animate-slide-up overflow-hidden border-synapse-neon-green/20 p-5 shadow-glow-green">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-synapse-neon-green to-emerald-600 shadow-glow-green">
            <span className="text-lg">🗺️</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-glass-primary">{activePlan.title}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
              <span>{goalLabel}</span>
              <span className="h-3 w-px bg-gray-700" />
              <span>{activePlan.estimated_duration_weeks} weeks</span>
              <span className="h-3 w-px bg-gray-700" />
              <span>{activePlan.milestones.length} milestones</span>
            </div>
          </div>
        </div>
        <a
          href="/study-plan"
          className="shrink-0 rounded-xl bg-gradient-to-r from-synapse-neon-green to-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-glow-green transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-[0.97]"
        >
          Continue →
        </a>
      </div>

      {/* Progress bar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-synapse-neon-green to-emerald-400 shadow-sm transition-all duration-700 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <span className="text-xs font-bold text-synapse-neon-green">
          {Math.round(progress * 100)}%
        </span>
      </div>

      {/* Next milestone */}
      {nextMilestone && (
        <div className="rounded-xl border border-synapse-neon-green/10 bg-white/[0.02] p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-synapse-neon-green/20 text-[9px] font-bold text-synapse-neon-green">
              {nextMilestone.week}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Next Milestone
            </span>
          </div>
          <p className="text-sm font-medium text-glass-primary">{nextMilestone.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-400 line-clamp-2">
            {nextMilestone.description}
          </p>
          {nextMilestone.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {nextMilestone.topics.slice(0, 4).map((topic, i) => (
                <span
                  key={i}
                  className="rounded-lg border border-synapse-neon-green/20 bg-synapse-neon-green/5 px-2 py-0.5 text-[9px] font-medium text-synapse-neon-green"
                >
                  {topic}
                </span>
              ))}
              {nextMilestone.topics.length > 4 && (
                <span className="text-[9px] text-gray-500">
                  +{nextMilestone.topics.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Recent Sessions ─────────────────────────────────────

function RecentSessionsList({ sessions }: { sessions: Session[] }) {
  const router = useRouter();

  if (sessions.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center py-10">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800/50">
          <span className="text-xl">💬</span>
        </div>
        <p className="text-sm font-medium text-gray-400">No learning sessions yet</p>
        <p className="mt-1 text-xs text-gray-500/60">Start a new chat to begin learning</p>
        <Link
          href="/learn"
          className="mt-4 rounded-xl bg-gradient-to-r from-synapse-neon-blue to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-glow-sm transition-all hover:shadow-glow-blue active:scale-[0.97]"
        >
          Start Learning →
        </Link>
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
            onMouseEnter={() => router.prefetch('/learn')}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/[0.03]"
          >
            <span className="text-base">
              {s.subject === 'mathematics' ? '📐' : s.subject === 'science' ? '🔬' : '💬'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-300 group-hover:text-glass-primary">
                {s.title || 'Untitled'}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                {timeStr} · {s.message_count} messages
              </p>
            </div>
            <svg
              className="h-4 w-4 shrink-0 text-gray-600 transition-all group-hover:translate-x-0.5 group-hover:text-synapse-neon-blue"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// ─── Study Plan Stat Card Helper ──────────────────────────

function getStudyPlanStatCard(studyPlans: StudyPlan[]): React.ReactNode {
  const activePlan = studyPlans.find((p) => p.status === 'active') || studyPlans[0];
  if (!activePlan || activePlan.milestones.length === 0) return null;

  const weeksElapsed = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(activePlan.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000),
    ),
  );
  const completedCount = activePlan.milestones.filter((m) => m.week <= weeksElapsed).length;
  const progressPct = Math.round((completedCount / activePlan.milestones.length) * 100);
  const nextMilestone = activePlan.milestones.find((m) => m.week > weeksElapsed);
  const nextDueDate = nextMilestone
    ? new Date(
        new Date(activePlan.created_at).getTime() + nextMilestone.week * 7 * 24 * 60 * 60 * 1000,
      )
    : null;
  const dueStr = nextDueDate
    ? nextDueDate <= new Date()
      ? 'Due now!'
      : `Due ${nextDueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : 'Complete!';

  return (
    <StatCard
      label="Study Plan"
      value={`${progressPct}%`}
      icon="🗺️"
      accent="green"
      subtitle={
        nextMilestone
          ? `Week ${nextMilestone.week}: ${nextMilestone.title.slice(0, 24)}${nextMilestone.title.length > 24 ? '…' : ''} · ${dueStr}`
          : dueStr
      }
    />
  );
}

// ─── Section Container ─────────────────────────────────

function SectionContainer({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-card animate-slide-up overflow-hidden p-5 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({
  icon,
  title,
  right,
}: {
  icon: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-600/10">
          <span className="text-sm">{icon}</span>
        </div>
        <h3 className="text-sm font-semibold text-glass-primary">{title}</h3>
      </div>
      {right}
    </div>
  );
}

// ─── Section Divider ───────────────────────────────────

function SectionDivider() {
  return (
    <div className="my-2 h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />
  );
}

// ─── Main Dashboard ──────────────────────────────────────

/** Wrapper that provides a Suspense boundary for useSearchParams. */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center bg-[#0F1117]">
          <AmbientBackground />
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <div className="relative">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-synapse-neon-blue border-t-transparent" />
                <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-synapse-neon-blue/10" />
              </div>
            </div>
            <p className="text-sm text-gray-400">Loading your learning dashboard...</p>
          </div>
        </main>
      }
    >
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
  const [conceptsDue, setConceptsDue] = useState<{
    concepts: {
      concept_name: string;
      subject: string;
      mastery_level: string;
      confidence_score: number | null;
      times_encountered: number;
      next_review_at: string | null;
      days_until_review: number | null;
    }[];
    total_due: number;
  } | null>(null);
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // ── Aggressive route prefetching ─────────────────────
  // Prefetch learn and quiz pages immediately so navigation feels instant.
  useEffect(() => {
    router.prefetch('/learn');
    router.prefetch('/quiz');
    router.prefetch('/study-plan');
    router.prefetch('/settings');
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    async function loadData() {
      try {
        const [sessionList, analyticsData, plansData, conceptsDueData] = await Promise.all([
          api.listSessions().catch(() => ({ sessions: [], total: 0 })),
          api.getAnalytics().catch(() => null),
          api.listStudyPlans().catch(() => ({ study_plans: [], total: 0 })),
          api.getConceptsDue(5).catch(() => null),
        ]);
        setRecentSessions(sessionList.sessions || []);
        setAnalytics(analyticsData);
        setStudyPlans(plansData.study_plans || []);
        setConceptsDue(conceptsDueData);
      } catch {
        /* ignore */
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, [authLoading]);

  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <AppLayout activeNav="dashboard" user={null} isGuest={isGuest} onSignOut={handleSignOut}>
        <AmbientBackground />
        <div className="relative z-10 animate-[fadeIn_0.5s_ease-out]">
          {/* Greeting skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gray-800/50" />
              <div className="flex-1">
                <div className="h-8 w-64 rounded-lg bg-gray-800/40" />
                <div className="mt-2 h-4 w-48 rounded-md bg-gray-800/30" />
              </div>
            </div>
          </div>
          {/* Stat cards skeleton */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass-card animate-pulse p-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gray-800/40" />
                  <div className="flex-1">
                    <div className="h-6 w-16 rounded bg-gray-800/30" />
                    <div className="mt-1 h-3 w-20 rounded bg-gray-800/20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Content skeleton */}
          <div className="grid gap-6">
            <div className="glass-card animate-pulse p-5">
              <div className="mb-4 h-5 w-32 rounded bg-gray-800/30" />
              <div className="flex items-end gap-1">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ height: `${20 + Math.random() * 60}px` }}
                  >
                    <div className="h-full w-5 rounded-t-md bg-gray-800/20" />
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card animate-pulse p-5">
              <div className="mb-4 h-5 w-40 rounded bg-gray-800/30" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-800/30" />
                    <div className="flex-1">
                      <div className="h-4 w-48 rounded bg-gray-800/30" />
                      <div className="mt-1 h-3 w-32 rounded bg-gray-800/20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const a = analytics;
  const studyPlanStat = studyPlans.length > 0 ? getStudyPlanStatCard(studyPlans) : null;

  return (
    <AppLayout activeNav="dashboard" user={user} isGuest={isGuest} onSignOut={handleSignOut}>
      {/* ── Ambient Background ── */}
      <AmbientBackground />

      {/* ── Content ── */}
      <div className="relative z-10">
        {/* ── Greeting ── */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-synapse-neon-blue to-indigo-600 shadow-glow-blue">
              <span className="text-2xl">🧠</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-gradient">
                  {greeting}
                  {user ? `, ${user.name.split(' ')[0]}` : ''}
                </span>
              </h1>
              {a && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                    <span
                      className={`h-2 w-2 rounded-full ${a.is_active_today ? 'bg-synapse-neon-green shadow-glow-sm' : 'bg-gray-600'}`}
                    />
                    {a.is_active_today ? 'Learned today' : 'Start a session'}
                  </span>
                  {a.learning_streak_days > 0 && (
                    <>
                      <span className="h-3 w-px bg-gray-700" />
                      <span className="inline-flex items-center gap-1 text-xs text-synapse-neon-amber">
                        🔥 {a.learning_streak_days} day streak
                      </span>
                    </>
                  )}
                  {a.top_subject && (
                    <>
                      <span className="h-3 w-px bg-gray-700" />
                      <span className="text-xs text-gray-500">
                        Focus: <span className="text-gray-400 capitalize">{a.top_subject}</span>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="ml-auto hidden sm:block">
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-synapse-neon-blue to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm transition-all duration-200 hover:shadow-glow-blue hover:brightness-110 active:scale-[0.97]"
              >
                <span>Start Learning</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            label="Learning Streak"
            value={a?.learning_streak_days ?? 0}
            icon="🔥"
            accent="amber"
            subtitle={a ? (a.is_active_today ? 'Active today' : 'Start learning!') : undefined}
            delay={0}
          />
          <StatCard
            label="Quizzes Taken"
            value={a?.total_quizzes ?? 0}
            icon="📝"
            accent="purple"
            subtitle={a?.quizzes_completed ? `${a.quizzes_completed} completed` : undefined}
            delay={60}
          />
          <StatCard
            label="Concepts"
            value={a?.total_concepts ?? 0}
            icon="🧠"
            accent="green"
            subtitle={
              a ? `${a.mastered_concepts} mastered · ${a.learning_concepts} learning` : undefined
            }
            delay={120}
          />
          <StatCard
            label="Subjects"
            value={a?.subjects.length ?? 0}
            icon="📚"
            accent="blue"
            subtitle={a?.top_subject ? `Top: ${a.top_subject}` : undefined}
            delay={180}
          />
          <div
            style={{ animationDelay: '240ms', animationFillMode: 'forwards' }}
            className="animate-card-enter opacity-0"
          >
            {studyPlanStat || (
              <div className="glass-card flex h-full items-center justify-center p-4">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    Study Plan
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600">Not started</p>
                  <Link
                    href="/study-plan"
                    className="mt-2 inline-block text-[10px] text-synapse-neon-blue hover:underline"
                  >
                    Create one →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Activity Timeline ── */}
        {a && a.activity_timeline.length > 0 && (
          <SectionContainer className="mb-6">
            <SectionHeader
              icon="📊"
              title="Activity (7 days)"
              right={<span className="text-[9px] text-gray-500">Sessions per day</span>}
            />
            <div className="flex items-end gap-1">
              {a.activity_timeline.map((day, i) => (
                <ActivityBar
                  key={i}
                  day={day}
                  max={Math.max(...a.activity_timeline.map((d) => d.sessions), 1)}
                  index={i}
                />
              ))}
            </div>
          </SectionContainer>
        )}

        {/* ── Quiz Performance ── */}
        {a && a.quizzes_completed > 0 && (
          <SectionContainer className="mb-6">
            <SectionHeader
              icon="📝"
              title="Quiz Performance"
              right={
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span>
                    Avg: <strong className="text-gray-300">{a.average_quiz_score ?? '—'}%</strong>
                  </span>
                  <span>
                    Best: <strong className="text-gray-300">{a.highest_quiz_score ?? '—'}%</strong>
                  </span>
                  {a.quiz_streak > 0 && (
                    <span className="text-synapse-neon-amber">Streak: {a.quiz_streak} 🏆</span>
                  )}
                </div>
              }
            />
            <div className="space-y-2.5">
              {a.recent_quizzes.slice(0, 5).map((q) => (
                <div
                  key={q.quiz_id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-all hover:bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-300">{q.topic}</p>
                    <p className="text-[9px] text-gray-500">
                      {q.difficulty} · {q.score}/{q.total_points}
                    </p>
                  </div>
                  <QuizScoreBar percentage={q.percentage} />
                </div>
              ))}
            </div>
          </SectionContainer>
        )}

        {/* ── Mistake Analysis ── */}
        {a && (
          <div className="mb-6">
            <MistakeAnalysisSection analytics={a} />
          </div>
        )}

        {/* ── Concept Mastery ── */}
        {a && a.total_concepts > 0 && (
          <SectionContainer className="mb-6">
            <SectionHeader
              icon="🧠"
              title="Concept Mastery"
              right={
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-synapse-neon-green">
                    ✅ {a.mastered_concepts} mastered
                  </span>
                  <span className="text-[9px] text-synapse-neon-blue">
                    📖 {a.learning_concepts} learning
                  </span>
                  <span className="text-[9px] text-gray-500">⚪ {a.undiscovered_concepts} new</span>
                </div>
              }
            />
            {a.average_confidence !== null && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Avg confidence:</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-synapse-neon-blue to-synapse-neon-cyan transition-all duration-700 ease-out shadow-glow-sm"
                    style={{ width: `${a.average_confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-synapse-neon-blue">
                  {Math.round(a.average_confidence * 100)}%
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {a.concept_mastery.slice(0, 9).map((c) => (
                <div
                  key={c.concept_name}
                  className="group rounded-xl border border-gray-700/40 bg-white/[0.02] p-3 transition-all duration-200 hover:border-synapse-neon-blue/20 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[10px] font-medium text-gray-300 group-hover:text-glass-primary">
                      {c.concept_name}
                    </p>
                    <MasteryBadge level={c.mastery_level} />
                  </div>
                  <p className="mt-1 text-[9px] text-gray-500">
                    {c.subject} · {c.times_encountered}x
                  </p>
                </div>
              ))}
            </div>
          </SectionContainer>
        )}

        {/* ── Spaced Repetition (Phase 3) ── */}
        {conceptsDue && conceptsDue.total_due > 0 && (
          <SectionContainer className="mb-6 border-synapse-neon-amber/20">
            <SectionHeader
              icon="🔄"
              title="Spaced Repetition"
              right={
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-synapse-neon-amber/30 bg-synapse-neon-amber/10 px-2.5 py-0.5 text-[9px] font-semibold text-synapse-neon-amber">
                    {conceptsDue.total_due} due
                  </span>
                  <Link
                    href="/learn"
                    className="rounded-lg bg-gradient-to-r from-synapse-neon-amber to-orange-600 px-3 py-1.5 text-[10px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
                  >
                    Review Now →
                  </Link>
                </div>
              }
            />
            <div className="space-y-2">
              {conceptsDue.concepts.slice(0, 5).map((c) => {
                const daysOverdue =
                  c.days_until_review !== null && c.days_until_review < 0
                    ? Math.abs(c.days_until_review)
                    : 0;
                const dueLabel =
                  daysOverdue > 0
                    ? `${daysOverdue}d overdue`
                    : c.days_until_review === 0
                      ? 'Due today'
                      : c.days_until_review !== null && c.days_until_review > 0
                        ? `Due in ${c.days_until_review}d`
                        : 'Due now';
                const urgencyColor =
                  daysOverdue >= 7
                    ? 'text-red-400'
                    : daysOverdue >= 3
                      ? 'text-synapse-neon-amber'
                      : 'text-gray-500';

                return (
                  <Link
                    key={c.concept_name}
                    href="/learn"
                    className="flex items-center gap-3 rounded-xl border border-gray-700/40 bg-white/[0.02] px-4 py-3 transition-all duration-200 hover:border-synapse-neon-amber/30 hover:bg-white/[0.04]"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        daysOverdue >= 7
                          ? 'bg-red-500/10'
                          : daysOverdue >= 3
                            ? 'bg-synapse-neon-amber/10'
                            : 'bg-blue-500/10'
                      }`}
                    >
                      <span className="text-sm">
                        {daysOverdue >= 7 ? '🔴' : daysOverdue >= 3 ? '🟡' : '🟢'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-300">{c.concept_name}</p>
                      <p className="text-[10px] text-gray-500 capitalize">
                        {c.subject} · {c.mastery_level}
                      </p>
                    </div>
                    <span className={`whitespace-nowrap text-[10px] font-medium ${urgencyColor}`}>
                      {dueLabel}
                    </span>
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </SectionContainer>
        )}

        {/* ── Subject Breakdown ── */}
        {a && a.subjects.length > 0 && (
          <SectionContainer className="mb-6">
            <SectionHeader icon="📚" title="Subjects" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {a.subjects.map((s) => (
                <div
                  key={s.subject}
                  className="rounded-xl border border-gray-700/40 bg-white/[0.02] p-3 transition-all duration-200 hover:border-synapse-neon-blue/20 hover:bg-white/[0.04]"
                >
                  <p className="text-xs font-medium text-gray-300 capitalize">{s.subject}</p>
                  <p className="mt-0.5 text-[9px] text-gray-500">
                    {s.session_count} sessions · {s.message_count} messages
                  </p>
                </div>
              ))}
            </div>
          </SectionContainer>
        )}

        {/* ── Feature Cards Grid ── */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.id}
              className="animate-card-enter opacity-0 group"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
            >
              <Link
                href={feature.href}
                onClick={(e) => {
                  if (feature.status === 'coming_soon') e.preventDefault();
                }}
                className={`glass-card relative block overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${feature.glow} ${feature.status === 'coming_soon' ? 'opacity-60 hover:opacity-80' : ''}`}
              >
                {/* Hover shine */}
                <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg ${feature.status === 'ready' ? feature.glow : ''}`}
                  >
                    <span className="text-xl">{feature.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-glass-primary">{feature.title}</h3>
                      {feature.status === 'coming_soon' && (
                        <span className="rounded-full border border-gray-600/50 bg-gray-800/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                  {feature.status === 'ready' && (
                    <svg
                      className="mt-1 h-4 w-4 shrink-0 text-gray-500 transition-all group-hover:translate-x-1 group-hover:text-synapse-neon-blue"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* ── Study Plan Progress ── */}
        {studyPlans.length > 0 && (
          <div className="mb-6">
            <StudyPlanProgress plans={studyPlans} />
          </div>
        )}

        {/* ── Recent Sessions ── */}
        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-600/10">
                <span className="text-sm">📋</span>
              </div>
              <h2 className="text-sm font-semibold text-glass-primary">Recent Sessions</h2>
            </div>
            <Link
              href="/learn"
              className="text-xs font-medium text-synapse-neon-blue transition-all hover:text-synapse-neon-cyan"
            >
              View all →
            </Link>
          </div>
          <div className="glass-card overflow-hidden p-4">
            <RecentSessionsList sessions={recentSessions} />
          </div>
        </section>

        {/* ── First learned date ── */}
        {a?.first_learning_date && (
          <p className="mb-8 text-center text-[10px] text-gray-600">
            Learning since{' '}
            {new Date(a.first_learning_date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>
    </AppLayout>
  );
}
