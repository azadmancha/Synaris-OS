'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, type StudyPlan, type Milestone } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';

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
    (m) => m.week <= Math.floor((Date.now() - new Date(plan.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000))
  ).length;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-900/20'
          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-[#151728] dark:hover:border-gray-500'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">{plan.title}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {plan.subjects?.join(', ') || 'General'} · {plan.estimated_duration_weeks} weeks
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ${
          plan.status === 'active'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : plan.status === 'completed'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {plan.status}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
            style={{ width: `${Math.min(100, (completed / plan.milestones.length) * 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-400">{completed}/{plan.milestones.length}</span>
      </div>
    </button>
  );
}

// ─── Milestone Card ───────────────────────────────────────

function MilestoneCard({ milestone }: { milestone: Milestone; index: number }) {
  return (
    <div className="group relative rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-md dark:border-gray-700 dark:bg-[#151728]">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
          {milestone.week}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">{milestone.title}</h3>
          <p className="text-[10px] text-gray-400">~{milestone.estimated_hours}h this week</p>
        </div>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{milestone.description}</p>

      {milestone.topics.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[9px] font-medium uppercase tracking-wider text-gray-400">Topics</p>
          <div className="flex flex-wrap gap-1.5">
            {milestone.topics.map((topic, i) => (
              <span key={i} className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{topic}</span>
            ))}
          </div>
        </div>
      )}

      {milestone.learning_objectives.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[9px] font-medium uppercase tracking-wider text-gray-400">Objectives</p>
          <ul className="space-y-1">
            {milestone.learning_objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                <span className="mt-0.5 text-blue-500">•</span>
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {milestone.practical_exercise && (
        <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/20 dark:bg-emerald-900/10">
          <p className="text-[9px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Practice</p>
          <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">{milestone.practical_exercise}</p>
        </div>
      )}

      {milestone.quiz_topic && (
        <a
          href={`/quiz?topic=${encodeURIComponent(milestone.quiz_topic)}`}
          className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-[10px] font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30"
        >
          📝 Take Quiz: {milestone.quiz_topic}
        </a>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function StudyPlanPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading study plans...</p>
        </div>
      </main>
    }>
      <StudyPlanContent />
    </Suspense>
  );
}

function StudyPlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
      } catch { /* ignore */ }
      finally { setDataLoading(false); }
    }
    loadPlans();
  }, [authLoading]);

  async function handleGenerate() {
    if (subjects.length === 0) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const plan = await api.generateStudyPlan({
        goal, subjects,
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
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading study plans...</p>
        </div>
      </main>
    );
  }

  return (
    <AppLayout activeNav="study-plan" user={user} isGuest={isGuest} onSignOut={handleSignOut}>
      {/* ── Hero ── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <span className="text-lg">🗺️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-[#EDEDEE]">Study Plans</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">AI-generated personalized learning paths</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { setView('generate'); setSelectedPlan(null); }}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.97]"
        >
          ✨ Generate New Plan
        </button>
      </div>

      {/* ── Generate Form ── */}
      {view === 'generate' && (
        <div className="mb-8 animate-fade-in rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#151728]">
          <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">Generate a Personalized Study Plan</h2>
          <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
            Tell us about your learning goals and we&apos;ll create a custom plan with weekly milestones.
          </p>

          <div className="mb-5">
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Learning Goal</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GOALS.map((g) => (
                <button key={g.value} onClick={() => setGoal(g.value)}
                  className={`rounded-xl border p-3 text-center text-xs transition-all ${
                    goal === g.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
                  }`}
                >{g.label}</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Subjects</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SUBJECTS.map((s) => (
                <button key={s.value} onClick={() => toggleSubject(s.value)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                    subjects.includes(s.value)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
                  }`}
                >{s.label}</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Experience Level</label>
            <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
              {LEVELS.map((l) => (
                <button key={l.value} onClick={() => setExperienceLevel(l.value)}
                  className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                    experienceLevel === l.value ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >{l.label}</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Duration</label>
            <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
              {DURATIONS.map((d) => (
                <button key={d} onClick={() => setDurationWeeks(d)}
                  className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                    durationWeeks === d ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >{d} weeks</button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Additional Goals (optional)</label>
            <textarea value={additionalGoals} onChange={(e) => setAdditionalGoals(e.target.value)}
              placeholder="e.g., I want to build a portfolio project, prepare for a certification..."
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-[#1C1E2B]/50 dark:text-gray-300 dark:placeholder:text-gray-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400"
            />
          </div>

          {generateError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">{generateError}</div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={handleGenerate} disabled={subjects.length === 0 || isGenerating}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating...
                </span>
              ) : '✨ Generate Plan'}
            </button>
            <button onClick={() => setView('list')}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300"
            >Cancel</button>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {studyPlans.length > 0 ? 'Your Plans' : 'No plans yet'}
            </h2>
            {studyPlans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-gray-600 dark:bg-[#1C1E2B]/50">
                <p className="text-sm text-gray-400">No study plans yet</p>
                <p className="mt-1 text-xs text-gray-400/60">Generate your first personalized learning path</p>
                <button onClick={() => setView('generate')}
                  className="mt-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.97]"
                >✨ Generate Plan</button>
              </div>
            ) : (
              <div className="space-y-2">
                {studyPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} isActive={selectedPlan?.id === plan.id} onClick={() => setSelectedPlan(plan)} />
                ))}
              </div>
            )}
          </div>

          {/* Plan Detail */}
          <div>
            {selectedPlan ? (
              <div>
                <div className="mb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-[#EDEDEE]">{selectedPlan.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>🎯 {GOALS.find((g) => g.value === selectedPlan.goal)?.label || selectedPlan.goal}</span>
                        <span>·</span>
                        <span>🌱 {selectedPlan.experience_level}</span>
                        <span>·</span>
                        <span>📅 {selectedPlan.estimated_duration_weeks} weeks</span>
                        {selectedPlan.model_used && <><span>·</span><span>🤖 {selectedPlan.model_used}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedPlan.status === 'active' && (
                        <button onClick={async () => {
                          await api.updateStudyPlan(selectedPlan.id, { status: 'completed' });
                          setStudyPlans((prev) => prev.map((p) => p.id === selectedPlan.id ? { ...p, status: 'completed' } : p));
                          setSelectedPlan({ ...selectedPlan, status: 'completed' });
                        }}
                          className="rounded-lg border border-green-200 px-3 py-1.5 text-[10px] font-medium text-green-700 transition-colors hover:bg-green-50 dark:border-green-900/20 dark:text-green-400 dark:hover:bg-green-900/10"
                        >✓ Mark Complete</button>
                      )}
                      <button onClick={async () => {
                        await api.updateStudyPlan(selectedPlan.id, { status: 'archived' });
                        setStudyPlans((prev) => prev.map((p) => p.id === selectedPlan.id ? { ...p, status: 'archived' } : p));
                        setSelectedPlan({ ...selectedPlan, status: 'archived' });
                      }}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-[#1C1E2B]"
                      >Archive</button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedPlan.subjects?.map((s, i) => (
                      <span key={i} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                        {SUBJECTS.find((sub) => sub.value === s)?.label || s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Milestones ({selectedPlan.milestones.length})
                  </h3>
                  {selectedPlan.milestones.map((milestone, i) => (
                    <MilestoneCard key={i} milestone={milestone} index={i} />
                  ))}
                </div>

                <p className="mt-6 text-center text-[10px] text-gray-400">
                  Created {new Date(selectedPlan.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  {selectedPlan.completed_at && ` · Completed ${new Date(selectedPlan.completed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-12 text-center dark:border-gray-600 dark:bg-[#1C1E2B]/50">
                <span className="text-4xl">🗺️</span>
                <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-[#EDEDEE]">
                  {studyPlans.length > 0 ? 'Select a plan' : 'No plan selected'}
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  {studyPlans.length > 0 ? 'Choose a study plan from the sidebar' : 'Generate your first personalized study plan'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}} />
    </AppLayout>
  );
}
