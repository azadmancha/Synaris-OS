'use client';

import { useEffect } from 'react';
import { captureException } from '@/lib/sentry';

/**
 * Next.js global error boundary.
 * Displayed when a page-level render error occurs.
 * Replaces the generic white screen with a helpful error UI.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, {
      tags: { page: 'global', error_digest: error.digest || 'unknown' },
    });
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-white p-4 dark:bg-[#0F1117]">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-[#EDEDEE]">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            An unexpected error occurred. Please try again.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.97]"
            >
              Try Again
            </button>
            <a
              href="/"
              className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-gray-400 dark:border-gray-600 dark:text-gray-400"
            >
              Go Home
            </a>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-left dark:border-red-800 dark:bg-red-900/10">
              <summary className="cursor-pointer text-xs font-medium text-red-600 dark:text-red-400">
                Error details
              </summary>
              <pre className="mt-2 overflow-auto text-[10px] text-red-700 dark:text-red-300">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}
