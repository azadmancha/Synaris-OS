'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

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
      // Check if onboarding already completed
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
    setProgress(Math.round((idx / (totalSteps)) * 100));
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
      // Save onboarding data to Supabase user metadata
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
      setTimeout(() => {
        router.push('/dashboard');
      }, 2500);
    } catch (err) {
      console.error('Onboarding save error:', err);
      // Even on error, go to dashboard
      router.push('/dashboard');
    } finally {
      setIsSaving(false);
    }
  }

  function skipOnboarding() {
    // Mark as completed anyway so they don't see it again
    supabase.auth.updateUser({ data: { onboarding_completed: true } }).then(() => {
      router.push('/dashboard');
    }).catch(() => {
      router.push('/dashboard');
    });
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-[#0F1117] dark:to-[#13172B]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-[#0F1117] dark:to-[#13172B]">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-12">
        {/* Skip button */}
        <button
          onClick={skipOnboarding}
          className="fixed right-4 top-4 z-40 rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300"
        >
          Skip →
        </button>

        {currentStep === 'welcome' && (
          <div className="w-full max-w-md text-center animate-fade-in">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20">
              <span className="text-3xl">🧠</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#EDEDEE]">
              Welcome, {userName} 👋
            </h1>
            <p className="mt-3 text-base text-gray-500 dark:text-gray-400">
              Let&apos;s set up your learning profile so Synaris can adapt to <em>you</em>.
            </p>
            <p className="mt-1 text-sm text-gray-400">
              This only takes a minute — you can change everything later.
            </p>
            <button
              onClick={() => goToStep('goals')}
              className="mt-8 rounded-xl bg-blue-600 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-xl active:scale-[0.97]"
            >
              Get Started
            </button>
          </div>
        )}

        {currentStep === 'goals' && (
          <div className="w-full animate-fade-in">
            <StepIndicator step={1} total={totalSteps} title="What brings you here?" />
            <p className="mt-1 text-sm text-gray-400">Choose all that apply</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selectedGoals.includes(goal.id)
                      ? 'border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-[#1C1E2B] dark:hover:border-gray-500'
                  }`}
                >
                  <span className="text-2xl">{goal.icon}</span>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">{goal.label}</h3>
                  <p className="mt-1 text-xs text-gray-400">{goal.desc}</p>
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
            <p className="mt-1 text-sm text-gray-400">Select topics you want to learn about</p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SUBJECTS.map((subject) => (
                <button
                  key={subject.value}
                  onClick={() => toggleSubject(subject.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                    selectedSubjects.includes(subject.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
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
            <p className="mt-1 text-sm text-gray-400">How familiar are you with these subjects?</p>
            <div className="mt-6 space-y-2">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setExperienceLevel(level.value)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    experienceLevel === level.value
                      ? 'border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-[#1C1E2B] dark:hover:border-gray-500'
                  }`}
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">{level.label}</h3>
                  <p className="mt-0.5 text-xs text-gray-400">{level.desc}</p>
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
            <p className="mt-1 text-sm text-gray-400">How do you like to learn?</p>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Default learning depth
              </label>
              <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
                {DEPTHS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDefaultDepth(d.value)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      defaultDepth === d.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/20 dark:bg-blue-900/10">
              <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400">✨ Recap</h4>
              <div className="mt-2 space-y-1 text-xs text-blue-600 dark:text-blue-300">
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
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-green-400 to-emerald-500 shadow-xl shadow-green-500/20">
              <span className="text-3xl">🚀</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDEE]">
              Your profile is ready!
            </h1>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Synaris is personalizing your learning experience...
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <a
                href="/dashboard"
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-xl active:scale-[0.97]"
              >
                Go to Dashboard
              </a>
              <a
                href="/study-plan"
                className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-6 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 hover:shadow-md active:scale-[0.97] dark:border-emerald-900/20 dark:bg-emerald-900/10 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
              >
                ✨ Generate Study Plan
              </a>
            </div>
            <p className="mt-4 text-xs text-gray-400">
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
  );
}

// ─── Sub-components ─────────────────────────

function StepIndicator({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
        Step {step} of {total}
      </span>
      <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-[#EDEDEE]">{title}</h2>
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
          className="rounded-lg px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300"
        >
          ← Back
        </button>
      ) : (
        <div />
      )}
      {next && (
        <button
          onClick={onNext}
          disabled={disabled}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-xl active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
