'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';

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

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
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
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </main>
    );
  }

  return (
    <AppLayout activeNav="settings" user={user} isGuest={isGuest} onSignOut={handleSignOut}>
      <form onSubmit={handleSave} className="space-y-10">
        {/* Profile Section */}
        <section>
          <div className="mb-6 flex items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full ring-2 ring-gray-200 dark:ring-gray-700" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white ring-2 ring-gray-200 dark:ring-gray-700">
                {(displayName || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDEE]">Profile</h2>
              <p className="text-xs text-gray-500">{email}</p>
              <a href="/onboarding" className="mt-1 inline-block text-[10px] text-blue-500 hover:text-blue-600">
                Update learning profile →
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Display Name</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#1C1E2B] dark:text-[#EDEDEE] dark:focus:border-blue-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}
                className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#1C1E2B] dark:text-[#EDEDEE] dark:focus:border-blue-400"
                placeholder="Tell Synaris about yourself..."
              />
              <p className="mt-1 text-right text-[10px] text-gray-400">{bio.length}/500</p>
            </div>
          </div>
        </section>

        {/* Learning Preferences */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-[#EDEDEE]">Learning Preferences</h2>

          <div className="mb-4">
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Interested Subjects</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SUBJECTS.map((s) => (
                <button key={s.value} type="button" onClick={() => toggleSubject(s.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${
                    subjects.includes(s.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium">{s.label}</div>
                  <div className="mt-0.5 text-[10px] opacity-60">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Default Learning Depth</label>
            <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
              {DEPTHS.map((d) => (
                <button key={d.value} type="button" onClick={() => setDefaultMode(d.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    defaultMode === d.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  title={d.desc}
                >{d.label}</button>
              ))}
            </div>
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSaving}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </span>
            ) : 'Save Settings'}
          </button>

          {saveStatus && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {saveStatus}
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1 text-xs text-red-500">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              {error}
            </span>
          )}
        </div>
      </form>

      {/* Danger Zone */}
      <section className="mt-16 border-t border-gray-200 pt-8 dark:border-gray-700">
        <h2 className="mb-4 text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
        <p className="mb-4 text-xs text-gray-500">Permanently delete your profile and all learning data.</p>
        <button
          onClick={async () => {
            if (window.confirm('Are you sure? This will delete all your data and cannot be undone.')) {
              await handleSignOut();
              router.push('/');
            }
          }}
          className="rounded-xl border border-red-300 px-5 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50 active:scale-[0.97] dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Delete Account
        </button>
      </section>
    </AppLayout>
  );
}
