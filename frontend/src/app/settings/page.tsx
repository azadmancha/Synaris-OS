'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const SUBJECTS = [
  { value: 'mathematics', label: '🧮 Mathematics', desc: 'Algebra, Calculus, Geometry, Statistics' },
  { value: 'physics', label: '🔬 Physics', desc: 'Mechanics, Thermodynamics, Quantum, Relativity' },
  { value: 'chemistry', label: '⚗️ Chemistry', desc: 'Organic, Inorganic, Physical, Biochemistry' },
  { value: 'biology', label: '🧬 Biology', desc: 'Genetics, Ecology, Cell Biology, Evolution' },
  { value: 'cs', label: '💻 Computer Science', desc: 'Programming, AI, Data Structures, Algorithms' },
  { value: 'economics', label: '📊 Economics', desc: 'Micro, Macro, Finance, Econometrics' },
  { value: 'philosophy', label: '🧠 Philosophy', desc: 'Logic, Ethics, Metaphysics, Epistemology' },
  { value: 'history', label: '📜 History', desc: 'World History, Ancient, Modern, Civilization' },
];

const DEPTHS = [
  { value: 'quick', label: '⚡ Quick', desc: 'Fast, concise responses' },
  { value: 'balanced', label: '⚖️ Balanced', desc: 'Standard explanations' },
  { value: 'deep_dive', label: '🔬 Deep Dive', desc: 'Thorough, detailed' },
  { value: 'expert', label: '🧠 Expert', desc: 'Advanced level' },
];

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

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <main className="relative flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0F1117]">
        <AmbientOrbs />
        <div className="relative z-10 h-8 w-8 animate-spin rounded-full border-2 border-synapse-neon-blue border-t-transparent" />
      </main>
    }>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isGuest = searchParams.get('dev') === '1';
  const { user, isLoading: authLoading, handleSignOut } = useAuth(isGuest);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [defaultMode, setDefaultMode] = useState('balanced');
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    async function loadProfile() {
      try {
        const authUser = await getCurrentUser();
        if (!authUser) { router.push('/'); return; }
        setEmail(authUser.email || '');
        setDisplayName(authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '');
        setAvatarUrl(authUser.user_metadata?.avatar_url || '');
        setBio(authUser.user_metadata?.bio || '');
        setSubjects(authUser.user_metadata?.subjects || []);
        setDefaultMode(authUser.user_metadata?.default_mode || 'balanced');

        try {
          const profile = await api.getProfile();
          if (profile.display_name) setDisplayName(profile.display_name);
          if (profile.bio) setBio(profile.bio);
          if (profile.default_mode) setDefaultMode(profile.default_mode);
        } catch { /* optional */ }
      } catch { setError('Failed to load profile'); }
      finally { setProfileLoading(false); }
    }
    loadProfile();
  }, [authLoading, router]);

  function toggleSubject(subject: string) {
    setSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: displayName, bio, subjects, default_mode: defaultMode },
      });
      if (updateError) throw updateError;

      try {
        await api.updateProfile({
          display_name: displayName,
          bio: bio || undefined,
          default_mode: defaultMode,
        });
      } catch { /* optional */ }

      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  const loading = authLoading || profileLoading;

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0F1117]">
        <AmbientOrbs />
        <div className="relative z-10 h-8 w-8 animate-spin rounded-full border-2 border-synapse-neon-blue border-t-transparent" />
      </main>
    );
  }

  return (
    <AppLayout activeNav="settings" user={user} isGuest={isGuest} onSignOut={handleSignOut}>
      <ErrorBoundary componentName="SettingsPage">
      <div className="relative">
        {/* Grid overlay */}
        <div className="grid-overlay pointer-events-none fixed inset-0" />

        <form onSubmit={handleSave} className="relative z-10 space-y-6">
          {/* Profile Section */}
          <section className="glass-card animate-slide-up overflow-hidden p-6">
            <div className="mb-6 flex items-center gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full ring-2 ring-white/10" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-glow-blue ring-2 ring-white/10">
                  {(displayName || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-glass-primary">Profile</h2>
                <p className="text-xs text-glass-tertiary">{email}</p>
                <a href="/onboarding" className="mt-1 inline-block text-[10px] text-synapse-neon-blue hover:text-blue-400 transition-colors">
                  Update learning profile →
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-glass-secondary">Display Name</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/[0.05] px-4 py-2.5 text-sm text-glass-primary outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-synapse-neon-blue/50 dark:focus:border-synapse-neon-blue/50 focus:bg-white dark:focus:bg-white/[0.08] focus:shadow-glow-blue"
                  placeholder="Your display name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-glass-secondary">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}
                  className="w-full resize-none rounded-xl border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/[0.05] px-4 py-2.5 text-sm text-glass-primary outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-synapse-neon-blue/50 dark:focus:border-synapse-neon-blue/50 focus:bg-white dark:focus:bg-white/[0.08] focus:shadow-glow-blue"
                  placeholder="Tell Synaris about yourself..."
                />
                <p className="mt-1 text-right text-[10px] text-glass-tertiary">{bio.length}/500</p>
              </div>
            </div>
          </section>

          {/* Learning Preferences */}
          <section className="glass-card animate-slide-up overflow-hidden p-6" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <h2 className="mb-5 text-lg font-semibold text-glass-primary">Learning Preferences</h2>

            <div className="mb-6">
              <label className="mb-3 block text-xs font-medium text-glass-secondary">Interested Subjects</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SUBJECTS.map((s) => (
                  <button key={s.value} type="button" onClick={() => toggleSubject(s.value)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-all duration-200 ${
                      subjects.includes(s.value)
                        ? 'border-synapse-neon-blue/50 bg-synapse-neon-blue/10 text-synapse-neon-blue shadow-glow-sm'
                        : 'border-gray-300 dark:border-white/10 text-glass-secondary hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="mt-0.5 text-[10px] opacity-60">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-xs font-medium text-glass-secondary">Default Learning Depth</label>
              <div className="inline-flex rounded-xl border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/[0.03] p-1">
                {DEPTHS.map((d) => (
                  <button key={d.value} type="button" onClick={() => setDefaultMode(d.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      defaultMode === d.value
                        ? 'bg-gradient-to-r from-synapse-neon-blue to-indigo-600 text-white shadow-glow-sm'
                        : 'text-glass-tertiary hover:text-glass-primary'
                    }`}
                    title={d.desc}
                  >{d.label}</button>
                ))}
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={isSaving}
              className="rounded-xl bg-gradient-to-r from-synapse-neon-blue to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-glow-blue transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </span>
              ) : 'Save Settings'}
            </button>

            {saveStatus && (
              <span className="inline-flex items-center gap-1 text-xs text-synapse-neon-green">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                {saveStatus}
              </span>
            )}
            {error && (
              <span className="inline-flex items-center gap-1 text-xs text-synapse-neon-red">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                {error}
              </span>
            )}
          </div>

          {/* Danger Zone */}
          <section className="glass-card animate-slide-up overflow-hidden border-red-500/20 p-6" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <h2 className="mb-2 text-sm font-semibold text-synapse-neon-red">Danger Zone</h2>
            <p className="mb-4 text-xs text-glass-tertiary">Permanently delete your profile and all learning data.</p>
            <button
              onClick={async () => {
                if (window.confirm('Are you sure? This will delete all your data and cannot be undone.')) {
                  await handleSignOut();
                  router.push('/');
                }
              }}
              className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-2 text-sm font-medium text-synapse-neon-red transition-all duration-200 hover:bg-red-500/10 hover:shadow-glow-sm active:scale-[0.97]"
            >
              Delete Account
            </button>
          </section>
        </form>
      </div>
      </ErrorBoundary>
    </AppLayout>
  );
}
