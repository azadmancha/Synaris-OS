'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const GOALS = [
  {
    id: 'exam_prep',
    icon: '🎯',
    label: 'Exam Prep',
    desc: 'Ace your exams with adaptive study plans',
  },
  {
    id: 'curiosity',
    icon: '🧠',
    label: 'Curiosity',
    desc: 'Explore topics you find fascinating',
  },
  {
    id: 'skill_building',
    icon: '🛠️',
    label: 'Skill Building',
    desc: 'Develop practical skills step by step',
  },
  {
    id: 'research',
    icon: '🔬',
    label: 'Research',
    desc: 'Deep-dive into academic topics',
  },
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
  { value: 'beginner', label: '🌱 Beginner', desc: 'New to the subject' },
  { value: 'intermediate', label: '🌿 Intermediate', desc: 'Know the basics' },
  { value: 'advanced', label: '🌳 Advanced', desc: 'Comfortable with complex topics' },
  { value: 'expert', label: '🏆 Expert', desc: 'Deep understanding' },
];

const DEPTHS = [
  { value: 'quick', label: '⚡ Quick' },
  { value: 'balanced', label: '⚖️ Balanced' },
  { value: 'deep_dive', label: '🔬 Deep Dive' },
  { value: 'expert', label: '🧠 Expert' },
];

type Step = 'welcome' | 'goals' | 'subjects' | 'level' | 'preferences' | 'done';

// ─── Ambient Background ─────────────────────────────

function AmbientOrbs() {
  return (
    <div className="orb-container">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  // Onboarding state
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<string>('beginner');
  const [defaultDepth, setDefaultDepth] = useState<string>('balanced');
  const [userName, setUserName] = useState('');

  const totalSteps = 5;

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/');
        return;
      }
      if (user.user_metadata?.onboarding_completed) {
        router.push('/dashboard');
        return;
      }
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner');
      setIsLoading(false);
    }
    checkAuth();
  }, [router]);

  function goToStep(step: Step) {
    setCurrentStep(step);
    const stepOrder: Step[] = ['welcome', 'goals', 'subjects', 'level', 'preferences', 'done'];
    const idx = stepOrder.indexOf(step);
    setProgress(Math.round((idx / totalSteps) * 100));
  }

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  function toggleSubject(subject: string) {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  }

  async function handleComplete() {
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          goals: selectedGoals,
          subjects: selectedSubjects,
          experience_level: experienceLevel,
          default_mode: defaultDepth,
          onboarding_completed: true,
        },
      });
      if (error) throw error;

      goToStep('done');
      setTimeout(() => { router.push('/dashboard'); }, 2500);
    } catch (err) {
      console.error('Onboarding save error:', err);
      router.push('/dashboard');
    } finally {
      setIsSaving(false);
    }
  }

  function skipOnboarding() {
    supabase.auth.updateUser({ data: { onboarding_completed: true } }).then(() => {
      router.push('/dashboard');
    }).catch(() => { router.push('/dashboard'); });
  }

  if (isLoading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0F1117]">
        <AmbientOrbs />
        <div className="relative z-10 h-8 w-8 animate-spin rounded-full border-2 border-synapse-neon-blue border-t-transparent" />
      </main>
    );
  }

  return (
    <ErrorBoundary componentName="OnboardingPage">
    <main className="relative min-h-screen bg-gray-50 dark:bg-[#0F1117]">
      {/* Grid overlay */}
      <div className="grid-overlay pointer-events-none fixed inset-0 z-0" />
      <AmbientOrbs />

      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-synapse-neon-blue to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-12">
        {/* Skip button */}
        <button
          onClick={skipOnboarding}
          className="fixed right-4 top-4 z-40 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-glass-tertiary backdrop-blur-sm transition-colors hover:bg-white/[0.1] hover:text-glass-primary"
        >
          Skip →
        </button>

        {currentStep === 'welcome' && (
          <div className="w-full max-w-md text-center animate-fade-in">
            <div className="glass-card mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-synapse-neon-blue to-indigo-600 shadow-glow-blue">
                <span className="text-3xl">🧠</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-glass-primary">
              Welcome, {userName} 👋
            </h1>
            <p className="mt-3 text-base text-glass-secondary">
              Let&apos;s set up your learning profile so Synaris can adapt to <em>you</em>.
            </p>
            <p className="mt-1 text-sm text-glass-tertiary">
              This only takes a minute — you can change everything later.
            </p>
            <button
              onClick={() => goToStep('goals')}
              className="mt-8 rounded-xl bg-gradient-to-r from-synapse-neon-blue to-indigo-600 px-8 py-3 text-sm font-medium text-white shadow-glow-blue transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-[0.97]"
            >
              Get Started
            </button>
          </div>
        )}

        {currentStep === 'goals' && (
          <div className="w-full animate-fade-in">
            <StepIndicator step={1} total={totalSteps} title="What brings you here?" />
            <p className="mt-1 text-sm text-glass-tertiary">Choose all that apply</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                    selectedGoals.includes(goal.id)
                      ? 'border-synapse-neon-blue/50 bg-synapse-neon-blue/10 shadow-glow-sm'
                      : 'glass-card border-white/5 hover:border-white/20'
                  }`}
                >
                  <span className="text-2xl">{goal.icon}</span>
                  <h3 className="mt-2 text-sm font-semibold text-glass-primary">{goal.label}</h3>
                  <p className="mt-1 text-xs text-glass-tertiary">{goal.desc}</p>
                </button>
              ))}
            </div>
            <NavButtons
              back={false}
              next={selectedGoals.length > 0}
              onNext={() => goToStep('subjects')}
              onBack={() => goToStep('welcome')}
              nextLabel="Next →"
            />
          </div>
        )}

        {currentStep === 'subjects' && (
          <div className="w-full animate-fade-in">
            <StepIndicator step={2} total={totalSteps} title="What subjects interest you?" />
            <p className="mt-1 text-sm text-glass-tertiary">Select topics you want to learn about</p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SUBJECTS.map((subject) => (
                <button
                  key={subject.value}
                  onClick={() => toggleSubject(subject.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                    selectedSubjects.includes(subject.value)
                      ? 'border-synapse-neon-blue/50 bg-synapse-neon-blue/10 text-synapse-neon-blue shadow-glow-sm'
                      : 'border-gray-300 dark:border-white/10 text-glass-secondary hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  {subject.label}
                </button>
              ))}
            </div>
            <NavButtons
              back={true}
              next={selectedSubjects.length > 0}
              onNext={() => goToStep('level')}
              onBack={() => goToStep('goals')}
              nextLabel="Next →"
            />
          </div>
        )}

        {currentStep === 'level' && (
          <div className="w-full max-w-md animate-fade-in">
            <StepIndicator step={3} total={totalSteps} title="Your experience level" />
            <p className="mt-1 text-sm text-glass-tertiary">How familiar are you with these subjects?</p>
            <div className="mt-6 space-y-2">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setExperienceLevel(level.value)}
                  className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                    experienceLevel === level.value
                      ? 'border-synapse-neon-blue/50 bg-synapse-neon-blue/10 shadow-glow-sm'
                      : 'glass-card border-white/5 hover:border-white/20'
                  }`}
                >
                  <h3 className="text-sm font-semibold text-glass-primary">{level.label}</h3>
                  <p className="mt-0.5 text-xs text-glass-tertiary">{level.desc}</p>
                </button>
              ))}
            </div>
            <NavButtons
              back={true}
              next={true}
              onNext={() => goToStep('preferences')}
              onBack={() => goToStep('subjects')}
              nextLabel="Next →"
            />
          </div>
        )}

        {currentStep === 'preferences' && (
          <div className="w-full max-w-md animate-fade-in">
            <StepIndicator step={4} total={totalSteps} title="Learning preferences" />
            <p className="mt-1 text-sm text-glass-tertiary">How do you like to learn?</p>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-medium text-glass-secondary">Default learning depth</label>
              <div className="inline-flex rounded-xl border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/[0.03] p-1">
                {DEPTHS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDefaultDepth(d.value)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      defaultDepth === d.value
                        ? 'bg-gradient-to-r from-synapse-neon-blue to-indigo-600 text-white shadow-glow-sm'
                        : 'text-glass-tertiary hover:text-glass-primary'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-synapse-neon-blue/20 bg-synapse-neon-blue/[0.03] p-4">
              <h4 className="text-xs font-semibold text-glass-primary">✨ Recap</h4>
              <div className="mt-2 space-y-1 text-xs text-glass-secondary">
                <p>🎯 {selectedGoals.length > 0 ? selectedGoals.map((g) => GOALS.find((x) => x.id === g)?.label).join(', ') : 'No goals selected'}</p>
                <p>📚 {selectedSubjects.length > 0 ? selectedSubjects.length : 0} subjects selected</p>
                <p>🌱 Level: {LEVELS.find((l) => l.value === experienceLevel)?.label}</p>
                <p>⚙️ Default: {DEPTHS.find((d) => d.value === defaultDepth)?.label}</p>
              </div>
            </div>

            <NavButtons
              back={true}
              next={true}
              onNext={handleComplete}
              onBack={() => goToStep('level')}
              nextLabel={isSaving ? 'Saving...' : '✨ Start Learning'}
              disabled={isSaving}
            />
          </div>
        )}

        {currentStep === 'done' && (
          <div className="w-full max-w-md text-center animate-fade-in">
            <div className="glass-card mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] shadow-lg shadow-[#10B981]/20">
                <span className="text-3xl">🚀</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-glass-primary">Your profile is ready!</h1>
            <p className="mt-3 text-sm text-glass-secondary">
              Synaris is personalizing your learning experience...
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <a
                href="/dashboard"
                className="rounded-xl bg-gradient-to-r from-synapse-neon-blue to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-glow-blue transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-[0.97]"
              >
                Go to Dashboard
              </a>
              <a
                href="/study-plan"
                className="glass-card rounded-xl border-emerald-500/20 px-6 py-2.5 text-sm font-medium text-emerald-400 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.97]"
              >
                ✨ Generate Study Plan
              </a>
            </div>
            <p className="mt-4 text-xs text-glass-tertiary">
              You can always access your study plans from the dashboard sidebar.
            </p>
          </div>
        )}
      </div>

      {/* Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}} />
    </main>
    </ErrorBoundary>
  );
}

// ─── Sub-components ─────────────────────────

function StepIndicator({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-synapse-neon-blue">Step {step} of {total}</span>
      <h2 className="mt-1 text-xl font-bold text-glass-primary">{title}</h2>
    </div>
  );
}

function NavButtons({
  back,
  next,
  onBack,
  onNext,
  nextLabel = 'Continue',
  disabled = false,
}: {
  back: boolean;
  next: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      {back ? (
        <button
          onClick={onBack}
          className="rounded-lg px-4 py-2 text-sm text-glass-tertiary transition-colors hover:bg-white/[0.05] hover:text-glass-primary"
        >
          ← Back
        </button>
      ) : <div />}
      {next && (
        <button
          onClick={onNext}
          disabled={disabled}
          className="rounded-xl bg-gradient-to-r from-synapse-neon-blue to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-glow-blue transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
