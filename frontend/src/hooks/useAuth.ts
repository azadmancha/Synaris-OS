'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser, signOut } from '@/lib/supabase';
import { api } from '@/lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface UseAuthResult {
  /** The authenticated user (or guest user) — null while loading or if auth fails */
  user: AuthUser | null;
  /** True while auth is being initialized */
  isLoading: boolean;
  /** Any auth error that occurred */
  error: string | null;
  /** Whether the user is in guest (dev) mode */
  isGuest: boolean;
  /** Call to sign out */
  handleSignOut: () => Promise<void>;
}

/**
 * Shared auth hook — handles both Supabase authenticated and guest (dev) mode.
 *
 * Eliminates ~50 lines of duplicated auth boilerplate from every page.
 *
 * @param isGuest - Whether guest mode is active (from `?dev=1` param)
 * @param requireOnboarding - If true, redirects un-onboarded users to /onboarding
 */
export function useAuth(isGuest: boolean, requireOnboarding = false): UseAuthResult {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        if (!isGuest) {
          // ── Authenticated user flow ──
          const authUser = await getCurrentUser();
          if (!authUser) {
            if (!cancelled) router.push('/');
            return;
          }

          const email = authUser.email || `${authUser.id}@synaris.app`;
          const displayName =
            authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Learner';
          const avatarUrl = authUser.user_metadata?.avatar_url || null;

          // Check onboarding (learn page only)
          if (requireOnboarding && !authUser.user_metadata?.onboarding_completed) {
            if (!cancelled) router.push('/onboarding');
            return;
          }

          if (!cancelled) setUser({ id: authUser.id, name: displayName, email, avatarUrl });

          // Set auth token
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session?.access_token) {
              const loginResult = await api.supabaseLogin(
                session.access_token,
                email,
                displayName,
                avatarUrl,
              );
              if (!cancelled) api.setAuthToken(loginResult.token);
            }
          } catch {
            /* ok */
          }
        } else {
          // ── Guest mode flow ──
          let guestId = sessionStorage.getItem('synaris_guest_id');
          if (!guestId) {
            guestId =
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID().slice(0, 8)
                : Math.random().toString(36).slice(2, 10);
            sessionStorage.setItem('synaris_guest_id', guestId);
          }
          const guestEmail = `guest-${guestId}@synaris.app`;
          const guestName = `Guest-${guestId}`;

          const loginResult = await api.login(guestEmail, guestName);
          if (!cancelled) {
            api.setAuthToken(loginResult.token);
            setUser({
              id: loginResult.user_id,
              name: guestName,
              email: guestEmail,
              avatarUrl: null,
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Authentication failed');
          if (!isGuest) router.push('/');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    initAuth();
    return () => {
      cancelled = true;
    };
  }, [isGuest, router, requireOnboarding]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push('/');
  }, [router]);

  return { user, isLoading, error, isGuest, handleSignOut };
}
