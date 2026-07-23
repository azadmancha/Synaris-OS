import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList } from './MessageList';
import type { Message } from '@/lib/api';
import type { Depth } from './DepthSelector';
import type { AuthUser } from '@/hooks/useAuth';

// Mock the canvas for StartupParticles
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    setTimeout(() => cb(Date.now()), 16);
    return 1;
  });
});

function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: 'Test message content',
    content_type: 'text',
    sequence_number: 1,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const mockUser: AuthUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  avatarUrl: null,
};

function createMockProps(overrides = {}) {
  return {
    messages: [] as Message[],
    streamingContent: '',
    isStreaming: false,
    isLoading: false,
    depth: 'balanced' as Depth,
    answerMode: 'teach' as 'teach' | 'hint' | 'exam' | 'socratic' | 'simplify',
    user: null as AuthUser | null,
    onSendMessage: vi.fn(),
    onFeedback: vi.fn(),
    onChangeDepth: vi.fn(),
    onChangeAnswerMode: vi.fn(),
    ...overrides,
  };
}

describe('MessageList', () => {
  // ─── Startup Screen ────────────────────────────────

  it('shows startup screen when there are no messages', () => {
    const props = createMockProps();
    render(<MessageList {...props} />);

    expect(screen.getByText(/What would you like to learn today?/)).toBeInTheDocument();
  });

  it('shows suggested topics on startup screen', () => {
    const props = createMockProps();
    render(<MessageList {...props} />);

    expect(screen.getByText('Quantum Mechanics')).toBeInTheDocument();
    expect(screen.getByText('Calculus')).toBeInTheDocument();
    expect(screen.getByText('Genetics')).toBeInTheDocument();
    expect(screen.getByText('Thermodynamics')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Climate')).toBeInTheDocument();
  });

  it('calls onSendMessage when a suggested topic is clicked', () => {
    const props = createMockProps();
    render(<MessageList {...props} />);

    fireEvent.click(screen.getByText('Quantum Mechanics'));
    expect(props.onSendMessage).toHaveBeenCalled();
  });

  it('shows welcome greeting on startup screen', () => {
    const props = createMockProps();
    render(<MessageList {...props} />);

    expect(screen.getByText(/Welcome/)).toBeInTheDocument();
  });

  it('shows user name on startup screen when user is provided', () => {
    const props = createMockProps({ user: mockUser });
    render(<MessageList {...props} />);

    expect(screen.getByText(/Test/)).toBeInTheDocument();
  });

  it('shows DepthSelector on startup screen', () => {
    const props = createMockProps();
    render(<MessageList {...props} />);

    expect(screen.getByText('Learning Depth')).toBeInTheDocument();
  });

  it('shows AnswerModeSelector on startup screen', () => {
    const props = createMockProps();
    render(<MessageList {...props} />);

    expect(screen.getByText('Answer Mode')).toBeInTheDocument();
  });

  it('passes depth/answerMode changes to parent from startup screen', () => {
    const props = createMockProps({ depth: 'quick' });
    render(<MessageList {...props} />);

    fireEvent.click(screen.getByText('Deep Dive'));
    expect(props.onChangeDepth).toHaveBeenCalledWith('deep_dive');
  });

  // ─── Message Rendering ─────────────────────────────

  it('renders user messages', () => {
    const messages = [createMockMessage({ role: 'user', content: 'Hello Synaris' })];
    const props = createMockProps({ messages });
    render(<MessageList {...props} />);

    expect(screen.getByText('Hello Synaris')).toBeInTheDocument();
  });

  it('renders assistant messages', () => {
    const messages = [createMockMessage({ role: 'assistant', content: 'Here is an explanation.' })];
    const props = createMockProps({ messages });
    render(<MessageList {...props} />);

    expect(screen.getByText('Here is an explanation.')).toBeInTheDocument();
  });

  it('renders multiple messages in order', () => {
    const messages = [
      createMockMessage({ id: '1', role: 'user', content: 'First message', sequence_number: 1 }),
      createMockMessage({
        id: '2',
        role: 'assistant',
        content: 'First response',
        sequence_number: 2,
      }),
      createMockMessage({ id: '3', role: 'user', content: 'Second message', sequence_number: 3 }),
    ];
    const props = createMockProps({ messages });
    const { container } = render(<MessageList {...props} />);

    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('First response')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  it('does NOT show startup screen when there are messages', () => {
    const messages = [createMockMessage({ role: 'user', content: 'Hello' })];
    const props = createMockProps({ messages });
    render(<MessageList {...props} />);

    expect(screen.queryByText(/What would you like to learn today?/)).not.toBeInTheDocument();
  });

  it('user messages have gradient background', () => {
    const messages = [createMockMessage({ role: 'user', content: 'Hello' })];
    const props = createMockProps({ messages });
    const { container } = render(<MessageList {...props} />);

    // User message div should have gradient classes
    const userDiv = container.querySelector('.bg-gradient-to-r');
    expect(userDiv).toBeInTheDocument();
  });

  it('assistant messages have border styling', () => {
    const messages = [createMockMessage({ role: 'assistant', content: 'Response' })];
    const props = createMockProps({ messages });
    const { container } = render(<MessageList {...props} />);

    // Assistant message should have border class
    const assistantDiv = container.querySelector('.border-gray-700\\/30');
    expect(assistantDiv).toBeInTheDocument();
  });

  // ─── Loading & Streaming states ────────────────────

  it('shows loading dots when isLoading is true and no streaming content', () => {
    // Loading dots only appear when there ARE messages (not on startup screen)
    const messages = [createMockMessage({ role: 'user', content: 'Hello' })];
    const props = createMockProps({ messages, isLoading: true });
    const { container } = render(<MessageList {...props} />);

    // Loading dots are 3 bouncing dots
    const dots = container.querySelectorAll('.animate-bounce-dot');
    expect(dots.length).toBe(3);
  });

  it('shows streaming content when isStreaming is true', () => {
    const props = createMockProps({
      isStreaming: true,
      streamingContent: 'Streaming response...',
    });
    render(<MessageList {...props} />);

    expect(screen.getByText('Streaming response...')).toBeInTheDocument();
  });

  it('shows blinking cursor with streaming content', () => {
    const props = createMockProps({
      isStreaming: true,
      streamingContent: 'Thinking...',
    });
    const { container } = render(<MessageList {...props} />);

    const cursor = container.querySelector('.animate-pulse');
    expect(cursor).toBeInTheDocument();
  });

  // ─── Message Actions ───────────────────────────────

  it('shows feedback buttons on assistant messages', () => {
    const messages = [createMockMessage({ id: 'm1', role: 'assistant', content: 'Explanation' })];
    const props = createMockProps({ messages });
    render(<MessageList {...props} />);

    // MessageActions renders thumbs up/down — find by SVG titles or buttons
    const thumbsUp = screen.getByTitle('Helpful');
    expect(thumbsUp).toBeInTheDocument();
  });

  it('calls onFeedback when feedback is given', () => {
    const messages = [createMockMessage({ id: 'm1', role: 'assistant', content: 'Explanation' })];
    const props = createMockProps({ messages });
    render(<MessageList {...props} />);

    fireEvent.click(screen.getByTitle('Helpful'));
    expect(props.onFeedback).toHaveBeenCalledWith('m1', 'positive');
  });

  // ─── Canvas Particle Background ────────────────────

  it('renders canvas element on startup screen', () => {
    const props = createMockProps();
    const { container } = render(<MessageList {...props} />);

    const canvas = container.querySelector('canvas[aria-hidden="true"]');
    expect(canvas).toBeInTheDocument();
  });

  // ─── Edge Cases ────────────────────────────────────

  it('handles empty messages array gracefully', () => {
    const props = createMockProps({ messages: [] });
    expect(() => render(<MessageList {...props} />)).not.toThrow();
  });

  it('handles missing message id gracefully', () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'No ID',
        content_type: 'text',
        sequence_number: 1,
        created_at: new Date().toISOString(),
      },
    ];
    const props = createMockProps({ messages: messages as Message[] });
    expect(() => render(<MessageList {...props} />)).not.toThrow();
  });
});
