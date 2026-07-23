/**
 * Supabase Client
 *
 * Browser-side Supabase client for Google OAuth authentication.
 * Uses lazy initialization so it doesn't crash Next.js static page
 * generation (SSG) when environment variables are unavailable in CI.
 *
 * All helpers (signInWithGoogle, getCurrentSession, etc.) call
 * getSupabaseClient() internally, so callers don't need to import
 * the client directly.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Get or create the Supabase client instance.
 * Returns null if credentials are not configured (safe for SSG).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      console.warn(
        'Supabase credentials not found. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env',
      );
    }
    return null;
  }

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _client;
}

/**
 * Legacy direct export for backwards compatibility.
 * Throws if called before Supabase is configured.
 * Prefer getSupabaseClient() instead.
 */
export const supabase = new Proxy<SupabaseClient>({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error(
        'Supabase client not initialized. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }
    return Reflect.get(client, prop);
  },
});

// ─── Helpers ───────────────────────────────────────────

/** Get the base site URL for auth redirects. */
function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  );
}

// ─── Auth helpers ─────────────────────────────────────

// ─── Google OAuth ────────────────────────────────────

export async function signInWithGoogle() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured');

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Google sign-in error:', error.message);
    throw error;
  }

  return data;
}

// ─── Email / Password ─────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Email sign-in error:', error.message);
    throw error;
  }

  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured');

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    console.error('Email sign-up error:', error.message);
    throw error;
  }

  return data;
}

export async function sendPasswordResetEmail(email: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured');

  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback`,
  });

  if (error) {
    console.error('Password reset error:', error.message);
    throw error;
  }

  return data;
}

export async function signOut() {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.auth.signOut();
  if (error) {
    console.error('Sign out error:', error.message);
  }
}

export async function getCurrentSession() {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error('Get session error:', error.message);
    return null;
  }
  return data.session;
}

export async function getCurrentUser() {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
}

// ─── Types ─────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  accessToken: string;
}
