'use client';

/**
 * Animated Theme Toggle — polished sun/moon toggle with smooth rotation.
 *
 * Usage:
 *   <ThemeToggle dark={dark} onToggle={toggleDark} />
 *
 * States:
 *   - Dark mode: Shows moon with orbiting stars
 *   - Light mode: Shows sun with glowing rays
 *   - Hover: Subtle glow border appears
 */
export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="group relative flex h-8 w-14 items-center rounded-full border border-white/10 bg-white/[0.05] p-1 transition-all duration-300 hover:border-synapse-neon-blue/30 hover:shadow-glow-sm focus-visible:outline-2 focus-visible:outline-synapse-neon-blue"
      title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Track background */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-500 ${
          dark
            ? 'bg-gradient-to-r from-indigo-900/60 to-slate-800/60'
            : 'bg-gradient-to-r from-sky-200/80 to-amber-200/80'
        }`}
      />

      {/* Toggle knob */}
      <div
        className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-lg transition-all duration-500 ${
          dark
            ? 'translate-x-7 bg-gradient-to-br from-indigo-400 to-slate-600 shadow-indigo-500/20'
            : 'translate-x-0 bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/20'
        }`}
      >
        {/* Sun icon (light mode) */}
        <div
          className={`absolute transition-all duration-500 ${
            dark ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>

        {/* Moon icon (dark mode) */}
        <div
          className={`absolute transition-all duration-500 ${
            dark ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          }`}
        >
          <svg className="h-3.5 w-3.5 text-indigo-200" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </div>
      </div>

      {/* Hover glow ring */}
      <div className="absolute inset-0 rounded-full opacity-0 ring-1 ring-synapse-neon-blue/0 transition-all duration-300 group-hover:opacity-100 group-hover:ring-synapse-neon-blue/30" />
    </button>
  );
}
