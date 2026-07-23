import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnswerOption, ShortAnswerInput, QuizSkeleton, answerLetter } from './QuizComponents';

// ─── answerLetter ──────────────────────────────────────

describe('answerLetter', () => {
  it('returns A for index 0', () => {
    expect(answerLetter(0)).toBe('A');
  });

  it('returns B for index 1', () => {
    expect(answerLetter(1)).toBe('B');
  });

  it('returns C for index 2', () => {
    expect(answerLetter(2)).toBe('C');
  });

  it('returns D for index 3', () => {
    expect(answerLetter(3)).toBe('D');
  });

  it('returns E for index 4', () => {
    expect(answerLetter(4)).toBe('E');
  });

  it('returns F for index 5', () => {
    expect(answerLetter(5)).toBe('F');
  });

  it('returns fallback for index beyond range', () => {
    expect(answerLetter(6)).toBe('Option 7');
    expect(answerLetter(99)).toBe('Option 100');
  });
});

// ─── AnswerOption ──────────────────────────────────────

describe('AnswerOption', () => {
  const baseProps = {
    label: 'A',
    text: 'Paris is the capital of France',
    selected: false,
    revealed: false,
    isCorrect: false,
    disabled: false,
    onSelect: vi.fn(),
  };

  it('renders the label and text', () => {
    render(<AnswerOption {...baseProps} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Paris is the capital of France')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<AnswerOption {...baseProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('A'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn();
    render(<AnswerOption {...baseProps} disabled={true} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('A'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not call onSelect when revealed', () => {
    const onSelect = vi.fn();
    render(<AnswerOption {...baseProps} revealed={true} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('A'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows selected state styling when selected and not revealed', () => {
    const { container } = render(<AnswerOption {...baseProps} selected={true} />);

    const btn = container.querySelector('button');
    expect(btn?.className).toContain('border-synapse-neon-purple/50');
    expect(btn?.className).toContain('bg-synapse-neon-purple/10');
  });

  it('shows correct answer styling when revealed and correct', () => {
    const { container } = render(<AnswerOption {...baseProps} revealed={true} isCorrect={true} />);

    const btn = container.querySelector('button');
    expect(btn?.className).toContain('border-synapse-neon-green/40');
    expect(btn?.className).toContain('bg-synapse-neon-green/5');
  });

  it('shows incorrect styling when revealed, selected, and wrong', () => {
    const { container } = render(
      <AnswerOption {...baseProps} revealed={true} selected={true} isCorrect={false} />,
    );

    const btn = container.querySelector('button');
    expect(btn?.className).toContain('border-synapse-neon-red/40');
    expect(btn?.className).toContain('bg-synapse-neon-red/5');
  });

  it('renders HTML disabled attribute when disabled', () => {
    const { container } = render(<AnswerOption {...baseProps} disabled={true} />);

    const btn = container.querySelector('button');
    expect(btn).toBeDisabled();
  });

  it('shows checkmark icon when revealed and correct', () => {
    const { container } = render(<AnswerOption {...baseProps} revealed={true} isCorrect={true} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows X icon when revealed, selected, and wrong', () => {
    const { container } = render(
      <AnswerOption {...baseProps} revealed={true} selected={true} isCorrect={false} />,
    );

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('shows checkmark icon when selected and not revealed', () => {
    const { container } = render(<AnswerOption {...baseProps} selected={true} />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
  });

  it('has default styling when not selected, not revealed', () => {
    const { container } = render(<AnswerOption {...baseProps} />);

    const btn = container.querySelector('button');
    expect(btn?.className).toContain('border-gray-700/40');
    expect(btn?.className).toContain('bg-white/[0.03]');
  });
});

// ─── ShortAnswerInput ─────────────────────────────────

describe('ShortAnswerInput', () => {
  const baseProps = {
    value: '',
    revealed: false,
    isCorrect: false,
    correctAnswer: null,
    disabled: false,
    onChange: vi.fn(),
  };

  it('renders a textarea when not revealed', () => {
    render(<ShortAnswerInput {...baseProps} />);

    const textarea = screen.getByPlaceholderText('Type your answer...');
    expect(textarea).toBeInTheDocument();
  });

  it('renders the display value when revealed', () => {
    render(<ShortAnswerInput {...baseProps} revealed={true} value="My answer" />);

    expect(screen.getByText('My answer')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type your answer...')).not.toBeInTheDocument();
  });

  it('shows (no answer) when revealed with empty value', () => {
    render(<ShortAnswerInput {...baseProps} revealed={true} value="" />);

    expect(screen.getByText('(no answer)')).toBeInTheDocument();
  });

  it('shows correct answer when revealed and correctAnswer provided', () => {
    render(
      <ShortAnswerInput
        {...baseProps}
        revealed={true}
        value="My ans"
        correctAnswer="The correct one"
      />,
    );

    expect(screen.getByText('My ans')).toBeInTheDocument();
    expect(screen.getByText('The correct one')).toBeInTheDocument();
  });

  it('calls onChange when textarea value changes', () => {
    const onChange = vi.fn();
    render(<ShortAnswerInput {...baseProps} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
      target: { value: 'new value' },
    });
    expect(onChange).toHaveBeenCalledWith('new value');
  });

  it('disables textarea when disabled', () => {
    render(<ShortAnswerInput {...baseProps} disabled={true} />);

    expect(screen.getByPlaceholderText('Type your answer...')).toBeDisabled();
  });

  it('shows correct border when revealed and correct', () => {
    const { container } = render(
      <ShortAnswerInput {...baseProps} revealed={true} isCorrect={true} />,
    );

    const displayDiv = container.querySelector('.border-synapse-neon-green\\/30');
    expect(displayDiv).toBeInTheDocument();
  });

  it('shows incorrect border when revealed and wrong', () => {
    const { container } = render(
      <ShortAnswerInput {...baseProps} revealed={true} isCorrect={false} />,
    );

    const displayDiv = container.querySelector('.border-synapse-neon-red\\/30');
    expect(displayDiv).toBeInTheDocument();
  });

  it('shows expected answer label when revealed with correctAnswer', () => {
    render(
      <ShortAnswerInput
        {...baseProps}
        revealed={true}
        value="wrong"
        correctAnswer="right answer"
      />,
    );

    expect(screen.getByText('Expected answer')).toBeInTheDocument();
  });

  it('highlights textarea border purple when value is not empty', () => {
    const { container } = render(<ShortAnswerInput {...baseProps} value="something written" />);

    const textarea = container.querySelector('textarea');
    expect(textarea?.className).toContain('border-synapse-neon-purple/30');
  });
});

// ─── QuizSkeleton ─────────────────────────────────────

describe('QuizSkeleton', () => {
  it('renders the skeleton loader', () => {
    const { container } = render(<QuizSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders multiple skeleton bars', () => {
    const { container } = render(<QuizSkeleton />);

    const bars = container.querySelectorAll('.rounded-xl');
    expect(bars.length).toBeGreaterThanOrEqual(4);
  });

  it('renders skeleton without crashing', () => {
    expect(() => render(<QuizSkeleton />)).not.toThrow();
  });
});
