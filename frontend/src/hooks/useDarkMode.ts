'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'synaris_theme';

/**
 * Shared dark mode hook — eliminates dark mode boilerplate from every page.
 *
 * Usage:
 *   const { dark, toggleDark } = useDarkMode();
 */
export function useDarkMode(): { dark: boolean; toggleDark: () => void } {
  const [dark, setDark] = useState(false);

  // Restore preference on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
    if (shouldBeDark) {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return { dark, toggleDark };
}
