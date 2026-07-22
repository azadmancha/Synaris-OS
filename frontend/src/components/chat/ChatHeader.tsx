'use client';

import { SynarisWordmark } from '@/components/brand/SynarisLogo';
import type { Depth } from '@/components/chat/DepthSelector';
import type { AuthUser } from '@/hooks/useAuth';

interface ChatHeaderProps {
  depth: Depth;
  user: AuthUser | null;
  isGuest: boolean;
  dark: boolean;
  onToggleSidebar: () => void;
  onToggleDark: () => void;
  onSignOut: () => void;
}

const DEPTH_LABELS: Record<Depth, string> = {
  quick: '⚡ Quick',
  balanced: '⚖️ Balanced',
  deep_dive: '🔬 Deep Dive',
  expert: '🧠 Expert',
};

export function ChatHeader({ depth, user, isGuest, dark, onToggleSidebar, onToggleDark, onSignOut }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-gray-700 dark:bg-[#0F1117]/80">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300 lg:hidden"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <SynarisWordmark size="sm" />
        <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400">Adaptive learning</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 sm:inline-block">
          {DEPTH_LABELS[depth]}
        </span>

        {user && (
          <a href="/settings" className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full ring-2 ring-gray-200 dark:ring-gray-700" />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-medium text-white ring-2 ring-gray-200 dark:ring-gray-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden text-xs text-gray-500 sm:inline">{user.name}</span>
          </a>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
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
    </header>
  );
}
