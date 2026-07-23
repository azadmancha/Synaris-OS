import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';
import type { Depth } from './DepthSelector';
import type { AnswerMode } from './AnswerModeSelector';

function createMockProps(overrides = {}) {
  const ref = { current: null } as React.RefObject<HTMLInputElement>;
  return {
    value: '',
    onChange: vi.fn(),
    onSend: vi.fn(),
    onKeyDown: vi.fn(),
    depth: 'balanced' as Depth,
    onChangeDepth: vi.fn(),
    answerMode: 'teach' as AnswerMode,
    onChangeAnswerMode: vi.fn(),
    isLoading: false,
    showControls: false,
    inputRef: ref,
    ...overrides,
  };
}

describe('ChatInput', () => {
  it('renders the input with placeholder', () => {
    const props = createMockProps();
    render(<ChatInput {...props} />);

    const input = screen.getByPlaceholderText('Ask anything...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('renders the send button', () => {
    const props = createMockProps();
    render(<ChatInput {...props} />);

    const sendBtn = screen.getByText('Send');
    expect(sendBtn).toBeInTheDocument();
  });

  it('send button is disabled when input is empty', () => {
    const props = createMockProps({ value: '' });
    render(<ChatInput {...props} />);

    const sendBtn = screen.getByText('Send').closest('button');
    expect(sendBtn).toBeDisabled();
  });

  it('send button is enabled when input has text', () => {
    const props = createMockProps({ value: 'Hello' });
    render(<ChatInput {...props} />);

    const sendBtn = screen.getByText('Send').closest('button');
    expect(sendBtn).not.toBeDisabled();
  });

  it('send button is disabled when loading', () => {
    const props = createMockProps({ value: 'Hello', isLoading: true });
    render(<ChatInput {...props} />);

    const sendBtn = screen.getByText('Send').closest('button');
    expect(sendBtn).toBeDisabled();
  });

  it('calls onChange when input value changes', () => {
    const props = createMockProps();
    render(<ChatInput {...props} />);

    const input = screen.getByPlaceholderText('Ask anything...');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(props.onChange).toHaveBeenCalledWith('test');
  });

  it('calls onSend when form is submitted', () => {
    const props = createMockProps({ value: 'Hello' });
    render(<ChatInput {...props} />);

    const form = screen.getByPlaceholderText('Ask anything...').closest('form');
    expect(form).toBeInTheDocument();
    fireEvent.submit(form!);
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  it('calls onSend when Send button is clicked', () => {
    const props = createMockProps({ value: 'Hello' });
    render(<ChatInput {...props} />);

    fireEvent.click(screen.getByText('Send'));
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  it('calls onKeyDown when a key is pressed on input', () => {
    const props = createMockProps();
    render(<ChatInput {...props} />);

    const input = screen.getByPlaceholderText('Ask anything...');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onKeyDown).toHaveBeenCalled();
  });

  it('disables input when loading', () => {
    const props = createMockProps({ isLoading: true });
    render(<ChatInput {...props} />);

    const input = screen.getByPlaceholderText('Ask anything...');
    expect(input).toBeDisabled();
  });

  it('shows DepthSelector and AnswerModeSelector when showControls is true', () => {
    const props = createMockProps({ showControls: true });
    render(<ChatInput {...props} />);

    expect(screen.getByText('Quick')).toBeInTheDocument(); // DepthSelector option
    expect(screen.getByText('Hint')).toBeInTheDocument(); // AnswerModeSelector option
  });

  it('hides controls when showControls is false', () => {
    const props = createMockProps({ showControls: false });
    render(<ChatInput {...props} />);

    expect(screen.queryByText('Quick')).not.toBeInTheDocument();
    expect(screen.queryByText('Hint')).not.toBeInTheDocument();
  });

  it('renders keyboard shortcut hint text', () => {
    const props = createMockProps();
    render(<ChatInput {...props} />);

    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.getByText('Shift+Enter')).toBeInTheDocument();
  });

  it('passes depth and answerMode to child selectors', () => {
    const props = createMockProps({
      showControls: true,
      depth: 'deep_dive' as Depth,
      answerMode: 'socratic' as AnswerMode,
    });
    render(<ChatInput {...props} />);

    // Active depth should show with gradient class
    const buttons = screen.getAllByRole('button');
    const deepDiveBtns = buttons.filter((b) => b.textContent?.includes('Deep Dive'));
    expect(deepDiveBtns.length).toBeGreaterThan(0);
  });

  it('passes disabled state to child selectors when loading', () => {
    const props = createMockProps({
      showControls: true,
      isLoading: true,
    });
    render(<ChatInput {...props} />);

    // Buttons in DepthSelector should be disabled
    const quickBtn = screen.getByText('Quick').closest('button');
    expect(quickBtn).toBeDisabled();
  });
});
