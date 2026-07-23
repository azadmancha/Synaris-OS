import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnswerModeSelector, type AnswerMode } from './AnswerModeSelector';

const ALL_MODES: AnswerMode[] = ['teach', 'hint', 'exam', 'socratic', 'simplify'];

describe('AnswerModeSelector', () => {
  it('renders all 5 answer mode options', () => {
    const onChange = vi.fn();
    render(<AnswerModeSelector mode="teach" onChange={onChange} />);

    expect(screen.getByText('Teach')).toBeInTheDocument();
    expect(screen.getByText('Hint')).toBeInTheDocument();
    expect(screen.getByText('Exam')).toBeInTheDocument();
    expect(screen.getByText('Socratic')).toBeInTheDocument();
    expect(screen.getByText('Simplify')).toBeInTheDocument();
  });

  it('highlights the active mode with gradient background', () => {
    const onChange = vi.fn();
    const { container } = render(<AnswerModeSelector mode="hint" onChange={onChange} />);

    const buttons = container.querySelectorAll('button');
    const hintBtn = buttons[1]; // Hint is index 1
    expect(hintBtn?.className).toContain('from-synapse-neon-blue');
    expect(hintBtn?.className).toContain('text-white');
  });

  it('does not highlight inactive modes', () => {
    const onChange = vi.fn();
    const { container } = render(<AnswerModeSelector mode="hint" onChange={onChange} />);

    const buttons = container.querySelectorAll('button');
    const teachBtn = buttons[0];
    expect(teachBtn?.className).toContain('text-gray-500');
    expect(teachBtn?.className).not.toContain('from-synapse-neon-blue');
  });

  it('calls onChange with the clicked mode value', () => {
    const onChange = vi.fn();
    render(<AnswerModeSelector mode="teach" onChange={onChange} />);

    fireEvent.click(screen.getByText('Socratic'));
    expect(onChange).toHaveBeenCalledWith('socratic');
  });

  it.each(ALL_MODES)('handles click on %s mode', (mode) => {
    const onChange = vi.fn();
    render(<AnswerModeSelector mode="teach" onChange={onChange} />);

    const label = mode.charAt(0).toUpperCase() + mode.slice(1);
    fireEvent.click(screen.getByText(label));
    expect(onChange).toHaveBeenCalledWith(mode);
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<AnswerModeSelector mode="teach" onChange={onChange} disabled={true} />);

    fireEvent.click(screen.getByText('Exam'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables all buttons when disabled prop is true', () => {
    const onChange = vi.fn();
    const { container } = render(<AnswerModeSelector mode="teach" onChange={onChange} disabled={true} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('sets correct title attribute from desc on each option', () => {
    const onChange = vi.fn();
    render(<AnswerModeSelector mode="teach" onChange={onChange} />);

    expect(screen.getByTitle('Explain concepts clearly')).toBeInTheDocument();
    expect(screen.getByTitle('Give hints, not answers')).toBeInTheDocument();
    expect(screen.getByTitle('Quiz me with questions')).toBeInTheDocument();
    expect(screen.getByTitle('Guide with questions')).toBeInTheDocument();
    expect(screen.getByTitle('Explain simply')).toBeInTheDocument();
  });

  it('shows emoji icons for each mode', () => {
    const onChange = vi.fn();
    const { container } = render(<AnswerModeSelector mode="teach" onChange={onChange} />);

    // Get all buttons and check their text content includes both icon and label
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(5);

    const modeIcons: [string, string][] = [
      ['teach', '📖'],
      ['hint', '💡'],
      ['exam', '✍️'],
      ['socratic', '🔄'],
      ['simplify', '🔰'],
    ];

    modeIcons.forEach(([label, icon]) => {
      const btn = Array.from(buttons).find((b) => b.textContent?.toLowerCase().includes(label));
      expect(btn).toBeTruthy();
      expect(btn!.textContent).toContain(icon);
    });
  });

  it('applies large size classes when size is md', () => {
    const onChange = vi.fn();
    const { container } = render(<AnswerModeSelector mode="teach" onChange={onChange} size="md" />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.className).toContain('text-sm');
    });
  });

  it('applies small size classes by default', () => {
    const onChange = vi.fn();
    const { container } = render(<AnswerModeSelector mode="teach" onChange={onChange} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.className).toContain('text-xs');
    });
  });
});
