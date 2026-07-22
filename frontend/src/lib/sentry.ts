/**
 * Synaris Frontend — Sentry Error Monitoring Configuration.
 *
 * Initializes Sentry for browser-side error tracking and performance monitoring.
 * This is configured to be safe regardless of env — if SENTRY_DSN is not set,
 * Sentry is a no-op.
 *
 * Usage:
 *   import { captureException } from '@/lib/sentry';
 *
 *   try {
 *     await riskyOperation();
 *   } catch (err) {
 *     captureException(err, { context: 'sendMessage' });
 *   }
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || '';

let _sentryInitialized = false;

/**
 * Initialize Sentry on the client side.
 * Called once at app layout mount.
 */
export function initSentry(): void {
  if (_sentryInitialized || !SENTRY_DSN) return;

  try {
    // Dynamic import so Sentry is never bundled if DSN is missing
    const Sentry = require('@sentry/nextjs');

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
      release: `synaris-frontend@${process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'}`,
      tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_RATE
        ? parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_RATE)
        : process.env.NODE_ENV === 'production'
          ? 0.1
          : 0.0,
      // Don't send PII
      sendDefaultPii: false,
      // Replay for session debugging (only in dev)
      replaysSessionSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.0,
      replaysOnErrorSampleRate: 1.0,
    });

    _sentryInitialized = true;
    console.debug('[Sentry] Initialized for browser error tracking');
  } catch (err) {
    // Sentry not installed — that's fine, degrade gracefully
    console.debug('[Sentry] Not available (install @sentry/nextjs to enable)');
  }
}

/**
 * Send an exception to Sentry with optional context.
 *
 * Safe to call even if Sentry is not initialized (no-op).
 *
 * @param error - The error to report
 * @param context - Optional structured context (tags, extra data)
 */
export function captureException(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): void {
  if (!SENTRY_DSN) return;

  try {
    const Sentry = require('@sentry/nextjs');

    if (context?.tags) {
      Sentry.setTags(context.tags);
    }
    if (context?.extra) {
      Sentry.setExtras(context.extra);
    }

    Sentry.captureException(error);
  } catch {
    // Sentry not available — no-op
  }
}

/**
 * Set the current user for Sentry error tracking.
 * Call after login/authentication to link errors to users.
 */
export function setSentryUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!SENTRY_DSN) return;

  try {
    const Sentry = require('@sentry/nextjs');

    if (user) {
      Sentry.setUser({ id: user.id, email: user.email, username: user.username });
    } else {
      Sentry.setUser(null);
    }
  } catch {
    // Sentry not available — no-op
  }
}
