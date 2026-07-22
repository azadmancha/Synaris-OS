'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Status = 'processing' | 'error' | 'success';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('processing');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const redirectRef = useRef(false);

  useEffect(() => {
    // Prevent double-fire in React strict mode
    if (redirectRef.current) return;

    async function attemptSessionRetrieval(attempts = 0): Promise<void> {
      const maxAttempts = 5;

      // Try immediate session fetch — Supabase may need a tick to parse the URL fragment
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (data.session) {
        // Got the session — redirect to learn page
        if (redirectRef.current) return;
        redirectRef.current = true;
        setStatus('success');
        setMessage('Signed in successfully!');
        setTimeout(() => router.push('/dashboard'), 500);
        return;
      }

      // No session yet — try again if we haven't exhausted retries
      if (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 300 * (attempts + 1)));
        return attemptSessionRetrieval(attempts + 1);
      }

      // Check if there's an error in the URL params (e.g. OAuth denied)
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      const errorDescription = params.get('error_description');

      if (errorParam) {
        throw new Error(errorDescription || 'Authentication denied');
      }

      // Check for hash parameters (Supabase email confirmation)
      const hash = window.location.hash;
      if (hash.includes('type=signup') || hash.includes('type=recovery') || hash.includes('type=email_change')) {
        if (redirectRef.current) return;
        redirectRef.current = true;
        setStatus('success');
        setMessage('Email confirmed! Redirecting to sign in...');
        setTimeout(() => router.push('/'), 1500);
        return;
      }

      // No session found after all attempts — user needs to sign in again
      throw new Error('No session found. Please try signing in again.');
    }

    // Also listen for auth state changes as a backup
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        if (redirectRef.current) return;
        redirectRef.current = true;
        setStatus('success');
        setMessage('Signed in successfully!');
        setTimeout(() => router.push('/dashboard'), 500);
      }
    });

    attemptSessionRetrieval().catch((err) => {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Authentication failed');
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-[#0F1117]">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDEE]">
            Sign In Failed
          </h2>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <p className="mt-1 text-xs text-gray-400">
            This usually happens if Google sign-in didn&apos;t complete properly.
            Try again from the home page.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a
              href="/"
              className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              Try Again
            </a>
            <a
              href="/?dev=1"
              className="rounded-full border border-gray-300 px-6 py-2 text-sm font-medium text-gray-600 transition-all hover:border-gray-400 dark:border-gray-600 dark:text-gray-400"
            >
              Continue as Guest
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'success') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/20">
            <span className="text-3xl">✅</span>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{message}</p>
          <p className="mt-1 text-xs text-gray-400">Taking you to your learning dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
      <div className="text-center">
        <div className="relative mx-auto mb-6 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-blue-500/10" />
        </div>
        <p className="text-sm text-gray-500">Completing sign-in...</p>
        <p className="mt-1 text-xs text-gray-400">Verifying your Google account</p>
      </div>
    </main>
  );
}
