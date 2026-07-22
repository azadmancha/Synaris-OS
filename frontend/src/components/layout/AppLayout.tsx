'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { useDarkMode } from '@/hooks/useDarkMode';
import { SynarisWordmark } from '@/components/brand/SynarisLogo';
import type { AuthUser } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Learn', href: '/learn' },
  { label: 'Quiz', href: '/quiz' },
  { label: 'Study Plan', href: '/study-plan' },
  { label: 'Settings', href: '/settings' },
];

interface AppLayoutProps {
  children: ReactNode;
  /** The currently active nav link slug (e.g., 'dashboard', 'learn', 'quiz') */
  activeNav: string;
  /** User info for displaying avatar/name */
  user: AuthUser | null;
  /** Whether the user is in guest mode (hides Sign Out button) */
  isGuest: boolean;
  /** Sign out handler */
  onSignOut: () => void;
  /** Optional max-width override (default max-w-5xl) */
  maxWidth?: string;
}

/**
 * Shared layout with SynarisWordmark header, nav links, dark mode toggle, and footer.
 * Eliminates ~80 lines of duplicated header markup from every page.
 */
export function AppLayout({ children, activeNav, user, isGuest, onSignOut, maxWidth = 'max-w-5xl' }: AppLayoutProps) {
  const { dark, toggleDark } = useDarkMode();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-[#0F1117] dark:to-[#13172B]">
      {/* ── Top Nav ── */}
      <header className="border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-gray-700 dark:bg-[#0F1117]/80 sm:px-6">
        <div className={`mx-auto flex items-center justify-between ${maxWidth}`}>
          <div className="flex items-center gap-4">
            <SynarisWordmark size="sm" />
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_ITEMS.map((item) => {
                const isActive = activeNav === item.href.split('/')[1];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <div className="flex items-center gap-2">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full ring-2 ring-gray-200 dark:ring-gray-700" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-medium text-white ring-2 ring-gray-200 dark:ring-gray-700">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden text-xs text-gray-500 sm:inline">{user.name}</span>
              </div>
            )}
            <button
              onClick={toggleDark}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300"
              title={dark ? 'Light mode' : 'Dark mode'}
              aria-label="Toggle dark mode"
            >
              {dark ? (
                <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {!isGuest && (
              <button
                onClick={onSignOut}
                className="rounded-lg px-2.5 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className={`mx-auto px-4 py-8 sm:px-6 ${maxWidth}`}>
        {children}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400 dark:border-gray-700">
        <p>Synaris by Azad · Aeris Labs</p>
      </footer>
    </main>
  );
}
