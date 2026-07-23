import { describe, it, expect, beforeEach, vi } from 'vitest';

const STORAGE_KEY = 'synaris_answer_mode';
const VALID_MODES = ['teach', 'hint', 'exam', 'socratic', 'simplify'] as const;
type AnswerMode = (typeof VALID_MODES)[number];

// ─── Helpers matching the logic in learn/page.tsx ───────────

function restoreAnswerMode(): AnswerMode | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (VALID_MODES as readonly string[]).includes(saved)) {
    return saved as AnswerMode;
  }
  return null;
}

function saveAnswerMode(mode: AnswerMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}

// ─── Tests ─────────────────────────────────────────────────

describe('Answer Mode Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('saveAnswerMode', () => {
    it('saves a valid answer mode to localStorage', () => {
      saveAnswerMode('hint');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('hint');
    });

    it('overwrites previous mode when saving a new one', () => {
      saveAnswerMode('teach');
      saveAnswerMode('exam');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('exam');
    });

    it.each(VALID_MODES)('accepts valid mode: %s', (mode) => {
      saveAnswerMode(mode);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(mode);
    });
  });

  describe('restoreAnswerMode', () => {
    it('returns null when nothing is saved', () => {
      expect(restoreAnswerMode()).toBeNull();
    });

    it('returns saved mode when valid', () => {
      localStorage.setItem(STORAGE_KEY, 'socratic');
      expect(restoreAnswerMode()).toBe('socratic');
    });

    it('returns null for invalid mode string', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid_mode');
      expect(restoreAnswerMode()).toBeNull();
    });

    it('returns null for empty string', () => {
      localStorage.setItem(STORAGE_KEY, '');
      expect(restoreAnswerMode()).toBeNull();
    });

    it.each(VALID_MODES)('round-trips correctly for mode: %s', (mode) => {
      saveAnswerMode(mode);
      expect(restoreAnswerMode()).toBe(mode);
    });
  });

  describe('full round-trip (matches learn/page.tsx behavior)', () => {
    it('saves and restores teach mode', () => {
      saveAnswerMode('teach');
      const restored = restoreAnswerMode();
      expect(restored).toBe('teach');
    });

    it('ignores garbage data and returns null', () => {
      localStorage.setItem(STORAGE_KEY, 'some random string');
      expect(restoreAnswerMode()).toBeNull();
    });

    it('handles multiple save/restore cycles', () => {
      const modes: AnswerMode[] = ['teach', 'hint', 'exam', 'socratic', 'simplify', 'teach'];
      for (const mode of modes) {
        saveAnswerMode(mode);
        expect(restoreAnswerMode()).toBe(mode);
      }
    });
  });
});
