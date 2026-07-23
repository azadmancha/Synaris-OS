'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, type StudyPlan, type Milestone } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';

// ─── Ambient Background ─────────────────────────────────

function AmbientBackground() {
  return (
    <>
      <div className="grid-overlay" />
      <div className="orb-container">
        <div
          className="orb orb-1"
          style={{ width: '350px', height: '350px', background: '#10B981', top: '-5%', left: '5%' }}
        />
        <div
          className="orb orb-2"
          style={{
            width: '300px',
            height: '300px',
            background: '#06B6D4',
            bottom: '-5%',
            right: '10%',
          }}
        />
        <div
          className="orb orb-3"
          style={{
            width: '200px',
            height: '200px',
            background: '#059669',
            top: '40%',
            left: '50%',
          }}
        />
      </div>
    </>
  );
}

// ─── Constants ────────────────────────────────────────────

const GOALS = [
  { value: 'exam_prep', label: '🎯 Exam Prep' },
  { value: 'curiosity', label: '🧠 Curiosity' },
  { value: 'skill_building', label: '🛠️ Skill Building' },
  { value: 'research', label: '🔬 Research' },
];

const SUBJECTS = [
  { value: 'mathematics', label: '🧮 Mathematics' },
  { value: 'physics', label: '🔬 Physics' },
  { value: 'chemistry', label: '⚗️ Chemistry' },
  { value: 'biology', label: '🧬 Biology' },
  { value: 'cs', label: '💻 Computer Science' },
  { value: 'economics', label: '📊 Economics' },
  { value: 'philosophy', label: '🧠 Philosophy' },
  { value: 'history', label: '📜 History' },
  { value: 'literature', label: '📖 Literature' },
  { value: 'engineering', label: '⚙️ Engineering' },
  { value: 'psychology', label: '🧘 Psychology' },
  { value: 'art', label: '🎨 Art & Design' },
];

const LEVELS = [
  { value: 'beginner', label: '🌱 Beginner' },
  { value: 'intermediate', label: '🌿 Intermediate' },
  { value: 'advanced', label: '🌳 Advanced' },
];

const DURATIONS = [2, 4, 6, 8, 12];

// ─── Section Header ────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/10">
        <span className="text-sm">{icon}</span>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{title}</p>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────

function PlanCard({
  plan,
  isActive,
  onClick,
}: {
  plan: StudyPlan;
  isActive: boolean;
  onClick: () => void;
}) {
  const completed = plan.milestones.filter(
    (m) =>
      m.week <=
      Math.floor((Date.now() - new Date(plan.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)),
  ).length;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
        isActive
          ? 'border-synapse-neon-green/40 bg-synapse-neon-green/5 shadow-glow-sm'
          : 'border-gray-700/40 bg-white/[0.02] hover:border-gray-600/60 hover:bg-white/[0.04] hover:shadow-card-hover'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-glass-primary">{plan.title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {plan.subjects?.join(', ') || 'General'} · {plan.estimated_duration_weeks} weeks
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
            plan.status === 'active'
              ? 'border-synapse-neon-green/30 bg-synapse-neon-green/10 text-synapse-neon-green'
              : plan.status === 'completed'
                ? 'border-synapse-neon-blue/30 bg-synapse-neon-blue/10 text-synapse-neon-blue'
                : 'border-gray-600/30 bg-gray-800/30 text-gray-500'
          }`}
        >
          {plan.status}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-synapse-neon-green to-emerald-400 transition-all duration-700"
            style={{ width: `${Math.min(100, (completed / plan.milestones.length) * 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-500">
          {completed}/{plan.milestones.length}
        </span>
      </div>
    </button>
  );
}

// ─── Milestone Card ───────────────────────────────────────

function MilestoneCard({ milestone }: { milestone: Milestone; index: number }) {
  return (
    <div className="glass-card overflow-hidden p-5 transition-all duration-200 hover:border-synapse-neon-green/20 hover:shadow-card-hover">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-synapse-neon-green to-emerald-600 text-xs font-bold text-glass-primary shadow-glow-sm">
          {milestone.week}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-glass-primary">{milestone.title}</h3>
          <p className="text-[10px] text-gray-500">~{milestone.estimated_hours}h this week</p>
        </div>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-gray-400">{milestone.description}</p>

      {milestone.topics.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-gray-500">
            Topics
          </p>
          <div className="flex flex-wrap gap-1.5">
            {milestone.topics.map((topic, i) => (
              <span
                key={i}
                className="rounded-lg border border-synapse-neon-green/20 bg-synapse-neon-green/5 px-2 py-0.5 text-[10px] font-medium text-synapse-neon-green"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {milestone.learning_objectives.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-gray-500">
            Objectives
          </p>
          <ul className="space-y-1">
            {milestone.learning_objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-400">
                <span className="mt-0.5 text-synapse-neon-green">•</span>
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {milestone.practical_exercise && (
        <div className="mb-3 rounded-xl border border-synapse-neon-green/15 bg-synapse-neon-green/5 p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-synapse-neon-green">
            Practice
          </p>
          <p className="mt-0.5 text-[11px] text-synapse-neon-green/80">
            {milestone.practical_exercise}
          </p>
        </div>
      )}

      {milestone.quiz_topic && (
        <a
          href={`/quiz?topic=${encodeURIComponent(milestone.quiz_topic)}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-synapse-neon-purple/20 bg-synapse-neon-purple/5 px-3 py-1.5 text-[10px] font-medium text-synapse-neon-purple transition-all hover:bg-synapse-neon-purple/10"
        >
          📝 Take Quiz: {milestone.quiz_topic}
        </a>
      )}
    </div>
  );
}

// ─── Generate Form ────────────────────────────────────────

function GenerateForm({
  goal,
  subjects,
  experienceLevel,
  durationWeeks,
  additionalGoals,
  isGenerating,
  generateError,
  onGoalChange,
  onToggleSubject,
  onLevelChange,
  onDurationChange,
  onGoalsChange,
  onGenerate,
  onCancel,
}: {
  goal: string;
  subjects: string[];
  experienceLevel: string;
  durationWeeks: number;
  additionalGoals: string;
  isGenerating: boolean;
  generateError: string | null;
  onGoalChange: (g: string) => void;
  onToggleSubject: (s: string) => void;
  onLevelChange: (l: string) => void;
  onDurationChange: (d: number) => void;
  onGoalsChange: (g: string) => void;
  onGenerate: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="glass-card animate-scale-in overflow-hidden p-6">
      <h2 className="mb-1 text-sm font-semibold text-glass-primary">
        Generate a Personalized Study Plan
      </h2>
      <p className="mb-6 text-xs text-gray-400">
        Tell us about your learning goals and we&apos;ll create a custom plan with weekly
        milestones.
      </p>

      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-gray-500">Learning Goal</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GOALS.map((g) => (
            <button
              key={g.value}
              onClick={() => onGoalChange(g.value)}
              className={`rounded-xl border p-3 text-center text-xs transition-all ${
                goal === g.value
                  ? 'border-synapse-neon-green/40 bg-synapse-neon-green/10 text-synapse-neon-green shadow-glow-sm'
                  : 'border-gray-700/40 bg-white/[0.02] text-gray-500 hover:border-gray-600/60 hover:text-gray-300'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-gray-500">Subjects</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SUBJECTS.map((s) => (
            <button
              key={s.value}
              onClick={() => onToggleSubject(s.value)}
              className={`rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                subjects.includes(s.value)
                  ? 'border-synapse-neon-green/40 bg-synapse-neon-green/10 text-synapse-neon-green'
                  : 'border-gray-700/40 bg-white/[0.02] text-gray-500 hover:border-gray-600/60 hover:text-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-gray-500">Experience Level</label>
        <div className="inline-flex rounded-xl border border-gray-700/50 bg-[#1a1d2e]/80 p-1">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => onLevelChange(l.value)}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                experienceLevel === l.value
                  ? 'bg-gradient-to-r from-synapse-neon-green to-emerald-600 text-white shadow-glow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-gray-500">Duration</label>
        <div className="inline-flex rounded-xl border border-gray-700/50 bg-[#1a1d2e]/80 p-1">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => onDurationChange(d)}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                durationWeeks === d
                  ? 'bg-gradient-to-r from-synapse-neon-green to-emerald-600 text-white shadow-glow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {d} weeks
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-xs font-medium text-gray-500">
          Additional Goals (optional)
        </label>
        <textarea
          value={additionalGoals}
          onChange={(e) => onGoalsChange(e.target.value)}
          placeholder="e.g., I want to build a portfolio project, prepare for a certification..."
          rows={2}
          className="w-full resize-none rounded-xl border border-gray-700/50 bg-[#1a1d2e] px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-synapse-neon-green/30 focus:outline-none focus:ring-2 focus:ring-synapse-neon-green/10"
        />
      </div>

      {generateError && (
        <div className="mb-4 rounded-xl border border-synapse-neon-red/20 bg-synapse-neon-red/5 px-4 py-3 text-xs text-synapse-neon-red">
          {generateError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onGenerate}
          disabled={subjects.length === 0 || isGenerating}
          className="rounded-xl bg-gradient-to-r from-synapse-neon-green to-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-glow-sm transition-all duration-200 hover:shadow-glow-green hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{' '}
              Generating...
            </span>
          ) : (
            '✨ Generate Plan'
          )}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-gray-700/50 px-4 py-2.5 text-xs font-medium text-gray-400 transition-all hover:bg-white/[0.05] hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function StudyPlanPage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center bg-[#0F1117]">
          <AmbientBackground />
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <div className="relative">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-synapse-neon-green border-t-transparent" />
                <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-synapse-neon-green/10" />
              </div>
            </div>
            <p className="text-sm text-gray-400">Loading study plans...</p>
          </div>
        </main>
      }
    >
      <StudyPlanContent />
    </Suspense>
  );
}

function StudyPlanContent() {
  const searchParams = useSearchParams();
  const isGuest = searchParams.get('dev') === '1';
  const { user, isLoading: authLoading, handleSignOut } = useAuth(isGuest);

  const [isGenerating, setIsGenerating] = useState(false);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [view, setView] = useState<'list' | 'generate'>('list');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Form state
  const [goal, setGoal] = useState('curiosity');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [additionalGoals, setAdditionalGoals] = useState('');

  // Load existing plans after auth
  useEffect(() => {
    if (authLoading) return;
    async function loadPlans() {
      try {
        const plansData = await api.listStudyPlans().catch(() => ({ study_plans: [], total: 0 }));
        setStudyPlans(plansData.study_plans);
        if (plansData.study_plans.length > 0) {
          setSelectedPlan(plansData.study_plans[0] ?? null);
        }
      } catch {
        /* ignore */
      } finally {
        setDataLoading(false);
      }
    }
    loadPlans();
  }, [authLoading]);

  async function handleGenerate() {
    if (subjects.length === 0) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const plan = await api.generateStudyPlan({
        goal,
        subjects,
        experience_level: experienceLevel,
        duration_weeks: durationWeeks,
        additional_goals: additionalGoals || undefined,
      });
      setStudyPlans((prev) => [plan, ...prev]);
      setSelectedPlan(plan);
      setView('list');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate study plan');
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleSubject(s: string) {
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-[#0F1117]">
        <AmbientBackground />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <div className="relative">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-synapse-neon-green border-t-transparent" />
              <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-synapse-neon-green/10" />
            </div>
          </div>
          <p className="text-sm text-gray-400">Loading study plans...</p>
        </div>
      </main>
    );
  }

  return (
    <AppLayout activeNav="study-plan" user={user} isGuest={isGuest} onSignOut={handleSignOut}>
      <AmbientBackground />
      <div className="relative z-10">
        {/* ── Hero ── */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-synapse-neon-green to-emerald-600 shadow-glow-green">
                <span className="text-2xl">🗺️</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  <span className="text-gradient-blue">Study Plans</span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">
                  AI-generated personalized learning paths
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setView('generate');
                setSelectedPlan(null);
              }}
              className="shrink-0 rounded-xl bg-gradient-to-r from-synapse-neon-green to-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-glow-sm transition-all duration-200 hover:shadow-glow-green hover:brightness-110 active:scale-[0.97]"
            >
              ✨ Generate New Plan
            </button>
          </div>
        </div>

        {/* ── Generate Form ── */}
        {view === 'generate' && (
          <div className="mb-8">
            <GenerateForm
              goal={goal}
              subjects={subjects}
              experienceLevel={experienceLevel}
              durationWeeks={durationWeeks}
              additionalGoals={additionalGoals}
              isGenerating={isGenerating}
              generateError={generateError}
              onGoalChange={setGoal}
              onToggleSubject={toggleSubject}
              onLevelChange={setExperienceLevel}
              onDurationChange={setDurationWeeks}
              onGoalsChange={setAdditionalGoals}
              onGenerate={handleGenerate}
              onCancel={() => setView('list')}
            />
          </div>
        )}

        {view === 'list' && (
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            {/* Sidebar */}
            <div>
              <SectionHeader
                icon="📋"
                title={studyPlans.length > 0 ? 'Your Plans' : 'No plans yet'}
              />
              {studyPlans.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center py-10">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800/50">
                    <span className="text-xl">🗺️</span>
                  </div>
                  <p className="text-sm font-medium text-gray-400">No study plans yet</p>
                  <p className="mt-1 text-xs text-gray-500/60">
                    Generate your first personalized learning path
                  </p>
                  <button
                    onClick={() => setView('generate')}
                    className="mt-4 rounded-xl bg-gradient-to-r from-synapse-neon-green to-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-glow-sm transition-all hover:shadow-glow-green hover:brightness-110 active:scale-[0.97]"
                  >
                    ✨ Generate Plan
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {studyPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isActive={selectedPlan?.id === plan.id}
                      onClick={() => setSelectedPlan(plan)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Plan Detail */}
            <div>
              {selectedPlan ? (
                <div>
                  <div className="mb-6 animate-slide-up">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-glass-primary">
                          {selectedPlan.title}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>
                            🎯{' '}
                            {GOALS.find((g) => g.value === selectedPlan.goal)?.label ||
                              selectedPlan.goal}
                          </span>
                          <span className="text-gray-700">·</span>
                          <span>🌱 {selectedPlan.experience_level}</span>
                          <span className="text-gray-700">·</span>
                          <span>📅 {selectedPlan.estimated_duration_weeks} weeks</span>
                          {selectedPlan.model_used && (
                            <>
                              <span className="text-gray-700">·</span>
                              <span>🤖 {selectedPlan.model_used}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {selectedPlan.status === 'active' && (
                          <button
                            onClick={async () => {
                              await api.updateStudyPlan(selectedPlan.id, { status: 'completed' });
                              setStudyPlans((prev) =>
                                prev.map((p) =>
                                  p.id === selectedPlan.id ? { ...p, status: 'completed' } : p,
                                ),
                              );
                              setSelectedPlan({ ...selectedPlan, status: 'completed' });
                            }}
                            className="rounded-lg border border-synapse-neon-green/20 px-3 py-1.5 text-[10px] font-medium text-synapse-neon-green transition-all hover:bg-synapse-neon-green/10"
                          >
                            ✓ Mark Complete
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            await api.updateStudyPlan(selectedPlan.id, { status: 'archived' });
                            setStudyPlans((prev) =>
                              prev.map((p) =>
                                p.id === selectedPlan.id ? { ...p, status: 'archived' } : p,
                              ),
                            );
                            setSelectedPlan({ ...selectedPlan, status: 'archived' });
                          }}
                          className="rounded-lg border border-gray-700/50 px-3 py-1.5 text-[10px] font-medium text-gray-500 transition-all hover:bg-white/[0.05] hover:text-gray-300"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedPlan.subjects?.map((s, i) => (
                        <span
                          key={i}
                          className="rounded-lg border border-synapse-neon-green/20 bg-synapse-neon-green/5 px-2 py-0.5 text-[10px] font-medium text-synapse-neon-green"
                        >
                          {SUBJECTS.find((sub) => sub.value === s)?.label || s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionHeader
                      icon="📅"
                      title={`Milestones (${selectedPlan.milestones.length})`}
                    />
                    {selectedPlan.milestones.length === 0 ? (
                      <div className="glass-card py-8 text-center">
                        <p className="text-sm text-gray-500">No milestones defined yet</p>
                      </div>
                    ) : (
                      selectedPlan.milestones.map((milestone, i) => (
                        <MilestoneCard key={i} milestone={milestone} index={i} />
                      ))
                    )}
                  </div>

                  <p className="mt-6 text-center text-[10px] text-gray-600">
                    Created{' '}
                    {new Date(selectedPlan.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {selectedPlan.completed_at &&
                      ` · Completed ${new Date(selectedPlan.completed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`}
                  </p>
                </div>
              ) : (
                <div className="glass-card flex flex-col items-center justify-center py-16">
                  <span className="text-5xl mb-4">🗺️</span>
                  <h3 className="text-base font-semibold text-glass-primary">
                    {studyPlans.length > 0 ? 'Select a plan' : 'No plan selected'}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {studyPlans.length > 0
                      ? 'Choose a study plan from the sidebar'
                      : 'Generate your first personalized study plan'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
