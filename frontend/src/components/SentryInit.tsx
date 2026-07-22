'use client';

import { useEffect } from 'react';
import { initSentry } from '@/lib/sentry';

/**
 * Client component that initializes Sentry error monitoring.
 *
 * This must be a client component (not a server component) because
 * Sentry initialization requires browser APIs and React hooks.
 *
 * Place this inside the root layout's body tag.
 */
export default function SentryInit() {
  useEffect(() => {
    initSentry();
  }, []);

  return null; // This component doesn't render anything
}
