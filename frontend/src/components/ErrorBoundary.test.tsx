import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Spy on the sentry module using real import (works with alias), then mock the function
import * as sentry from '@/lib/sentry';

// Component that throws on render
function BuggyComponent({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>I render fine</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error from React's error logging during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Spy on sentry's captureException
    vi.spyOn(sentry, 'captureException').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('catches errors and shows fallback UI', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('does not render children after an error', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
        <div>Should not appear</div>
      </ErrorBoundary>
    );
    expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
  });

  it('shows error icon emoji in fallback', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('renders children normally without throw', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('I render fine')).toBeInTheDocument();
  });

  it('has a refresh button that reloads the page', () => {
    const reloadFn = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadFn },
      configurable: true,
      writable: true,
    });

    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Refresh Page'));
    expect(reloadFn).toHaveBeenCalledTimes(1);
  });

  it('does not show error details in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.queryByText(/Test error message/)).not.toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    vi.stubEnv('NODE_ENV', 'development');

    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Error details')).toBeInTheDocument();
  });

  it('passes componentName to sentry tags', () => {
    render(
      <ErrorBoundary componentName="MyComponent">
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(sentry.captureException).toHaveBeenCalled();
    const callArg = (sentry.captureException as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as { tags: { component: string } };
    expect(callArg?.tags?.component).toBe('MyComponent');
  });

  it('uses default ErrorBoundary tag when no componentName given', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(sentry.captureException).toHaveBeenCalled();
    const callArg = (sentry.captureException as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as { tags: { component: string } };
    expect(callArg?.tags?.component).toBe('ErrorBoundary');
  });

  it('keeps showing error after re-render with non-throwing children', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
