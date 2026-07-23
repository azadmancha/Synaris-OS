'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { captureException } from '@/lib/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback UI. Defaults to a generic error card. */
  fallback?: ReactNode;
  /** Optional component name for Sentry tags */
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches render errors in child components
 * and displays a fallback UI instead of crashing the whole page.
 *
 * Reports errors to Sentry when enabled.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureException(error, {
      tags: { component: this.props.componentName || 'ErrorBoundary' },
      extra: { componentStack: errorInfo.componentStack?.slice(0, 500) },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDEE]">
              Something went wrong
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.97]"
              >
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-left dark:border-red-800 dark:bg-red-900/10">
                <summary className="cursor-pointer text-xs font-medium text-red-600 dark:text-red-400">
                  Error details
                </summary>
                <pre className="mt-2 overflow-auto text-[10px] text-red-700 dark:text-red-300">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
