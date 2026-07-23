import { describe, it, expect, vi, type MockInstance, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuizView from './QuizView';

import * as apiModule from '@/lib/api';
import type { Quiz, QuizStreamCallbacks } from '@/lib/api';

const QUESTION_MULTI: apiModule.Question = {
  id: 'q1',
  question: 'What is Planck length?',
  type: 'multiple_choice',
  options: ['1.6e-35 m', '6.6e-34 m', '3.0e-8 m', '1.0e-15 m'],
  correct_answer: '1.6e-35 m',
  user_answer: null,
  is_correct: null,
  explanation: 'Planck length is B.',
};

const QUESTION_TF: apiModule.Question = {
  id: 'q2',
  question: 'Is light a wave?',
  type: 'true_false',
  options: ['True', 'False'],
  correct_answer: 'True',
  user_answer: null,
  is_correct: null,
  explanation: 'Light is both wave and particle.',
};

const QUESTION_SHORT: apiModule.Question = {
  id: 'q3',
  question: 'Explain quantum entanglement',
  type: 'short_answer',
  options: null,
  correct_answer: 'When particles are correlated',
  user_answer: null,
  is_correct: null,
  explanation: 'Entanglement links particles.',
};

const MOCK_QUIZ: Quiz = {
  id: 'quiz-1',
  session_id: 'session-1',
  topic: 'Quantum Physics',
  difficulty: 'balanced',
  question_count: 3,
  status: 'completed',
  score: 0,
  total_points: 3,
  correct_count: 0,
  answered_count: 0,
  is_complete: false,
  questions: [QUESTION_MULTI, QUESTION_TF, QUESTION_SHORT],
  model_used: 'gemini-2.0-flash',
  created_at: '2024-01-15T10:00:00Z',
  completed_at: null,
};

const MOCK_QUIZ_SINGLE: Quiz = {
  ...MOCK_QUIZ,
  question_count: 1,
  questions: [QUESTION_MULTI],
};

const SUBMITTED_QUIZ: Quiz = {
  ...MOCK_QUIZ,
  score: 2,
  total_points: 3,
  correct_count: 2,
  answered_count: 3,
  is_complete: true,
  questions: MOCK_QUIZ.questions.map((q) => ({
    ...q,
    user_answer:
      q.id === 'q1' ? '1.6e-35 m' : q.id === 'q2' ? 'True' : 'When particles are correlated',
    is_correct: q.id !== 'q3',
  })),
};

describe('QuizView', () => {
  const defaultProps = {
    sessionId: 'session-1',
    onError: vi.fn(),
    onClose: vi.fn(),
    prefillTopic: '',
  };

  let generateQuizStreamSpy: MockInstance;
  let submitQuizAnswersSpy: MockInstance;

  function setupGenerateMock(result: Partial<Quiz> = MOCK_QUIZ) {
    generateQuizStreamSpy.mockImplementation(
      (
        _sid: string,
        _topic: string,
        _diff: string,
        _count: number,
        callbacks: QuizStreamCallbacks,
      ) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            callbacks.onDone?.(result as Quiz);
            resolve();
          }, 10);
        });
      },
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    generateQuizStreamSpy = vi.spyOn(apiModule.api, 'generateQuizStream');
    submitQuizAnswersSpy = vi.spyOn(apiModule.api, 'submitQuizAnswers');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the idle form initially', () => {
    render(<QuizView {...defaultProps} />);
    expect(screen.getByText('Quiz Mode')).toBeInTheDocument();
    expect(screen.getByText('Generate Quiz')).toBeInTheDocument();
  });

  it('renders with prefill topic', () => {
    render(<QuizView {...defaultProps} prefillTopic="World History" />);
    const topicInput = screen.getByPlaceholderText(/e.g./);
    expect(topicInput).toHaveValue('World History');
  });

  it('transitions to generating phase when Generate Quiz is clicked', async () => {
    generateQuizStreamSpy.mockImplementation(() => {
      return new Promise<void>(() => {});
    });

    render(<QuizView {...defaultProps} prefillTopic="Quantum Physics" />);
    fireEvent.click(screen.getByText('Generate Quiz'));

    await waitFor(
      () => {
        expect(screen.getByText(/Creating questions/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('transitions to answering phase when generation completes', async () => {
    setupGenerateMock(MOCK_QUIZ_SINGLE);

    render(<QuizView {...defaultProps} prefillTopic="Physics" />);
    fireEvent.click(screen.getByText('Generate Quiz'));

    await waitFor(
      () => {
        expect(screen.getByText('Submit Answers')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('shows the generated quiz topic in the header', async () => {
    setupGenerateMock();

    render(<QuizView {...defaultProps} prefillTopic="Quantum Physics" />);
    fireEvent.click(screen.getByText('Generate Quiz'));

    await waitFor(
      () => {
        expect(screen.getByText('Quantum Physics')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('shows question count in answering phase', async () => {
    setupGenerateMock();

    render(<QuizView {...defaultProps} prefillTopic="Math" />);
    fireEvent.click(screen.getByText('Generate Quiz'));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('handles API error during generation', async () => {
    generateQuizStreamSpy.mockImplementation(
      (
        _sid: string,
        _topic: string,
        _diff: string,
        _count: number,
        callbacks: QuizStreamCallbacks,
      ) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            callbacks.onError?.('API rate limit exceeded');
            resolve();
          }, 10);
        });
      },
    );

    render(<QuizView {...defaultProps} prefillTopic="Physics" />);
    fireEvent.click(screen.getByText('Generate Quiz'));

    await waitFor(
      () => {
        expect(defaultProps.onError).toHaveBeenCalledWith('API rate limit exceeded');
      },
      { timeout: 3000 },
    );
  });

  it('calls onClose when close button is clicked in idle', () => {
    render(<QuizView {...defaultProps} />);

    const closeBtn = screen.getByTitle('Close quiz');
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('selects an answer in answering phase', async () => {
    setupGenerateMock();

    render(<QuizView {...defaultProps} prefillTopic="Physics" />);
    fireEvent.click(screen.getByText('Generate Quiz'));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    fireEvent.click(screen.getByText('A'));
    expect(screen.getByText(/Next/)).toBeInTheDocument();
  });

  it('submits answers and transitions to reviewing', async () => {
    setupGenerateMock();
    submitQuizAnswersSpy.mockResolvedValue(SUBMITTED_QUIZ);

    render(<QuizView {...defaultProps} prefillTopic="Physics" />);
    fireEvent.click(screen.getByText('Generate Quiz'));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Use getAllByRole to find option buttons, then pick the first one by text content
    const optionButtons = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.includes('6e-35') || b.textContent?.includes('6e-34'));
    fireEvent.click(optionButtons[0]!);
    fireEvent.click(screen.getByText(/Next/));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    fireEvent.click(screen.getByText('True'));
    fireEvent.click(screen.getByText(/Next/));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 3 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
      target: { value: 'When particles are correlated' },
    });
    fireEvent.click(screen.getByText('Submit Answers'));

    await waitFor(
      () => {
        expect(submitQuizAnswersSpy).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('shows review phase after submission', async () => {
    setupGenerateMock();
    submitQuizAnswersSpy.mockResolvedValue({
      ...SUBMITTED_QUIZ,
      questions: SUBMITTED_QUIZ.questions.map((q) => ({
        ...q,
        user_answer: q.id === 'q1' ? '1.6e-35 m' : q.id === 'q2' ? 'True' : 'wrong answer',
        is_correct: q.id !== 'q3',
      })),
    });

    render(<QuizView {...defaultProps} prefillTopic="Physics" />);
    fireEvent.click(screen.getByText('Generate Quiz'));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const optionButtons = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.includes('6e-35') || b.textContent?.includes('6e-34'));
    fireEvent.click(optionButtons[0]!);
    fireEvent.click(screen.getByText(/Next/));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    fireEvent.click(screen.getByText('True'));
    fireEvent.click(screen.getByText(/Next/));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 3 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
      target: { value: 'wrong answer' },
    });
    fireEvent.click(screen.getByText('Submit Answers'));

    await waitFor(
      () => {
        expect(screen.getByText(/2.*3 Correct/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('has New Quiz button in review phase', async () => {
    setupGenerateMock();
    submitQuizAnswersSpy.mockResolvedValue(SUBMITTED_QUIZ);

    render(<QuizView {...defaultProps} prefillTopic="Physics" />);
    fireEvent.click(screen.getByText('Generate Quiz'));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const optionButtons = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.includes('6e-35') || b.textContent?.includes('6e-34'));
    fireEvent.click(optionButtons[0]!);
    fireEvent.click(screen.getByText(/Next/));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    fireEvent.click(screen.getByText('True'));
    fireEvent.click(screen.getByText(/Next/));

    await waitFor(
      () => {
        expect(screen.getByText(/Question 3 of 3/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
      target: { value: 'answer' },
    });
    fireEvent.click(screen.getByText('Submit Answers'));

    await waitFor(
      () => {
        expect(screen.getByText('New Quiz')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('handles submit API error gracefully', async () => {
    setupGenerateMock(MOCK_QUIZ_SINGLE);
    submitQuizAnswersSpy.mockRejectedValue(new Error('Network error'));

    render(<QuizView {...defaultProps} prefillTopic="Physics" />);
    fireEvent.click(screen.getByText('Generate Quiz'));

    await waitFor(
      () => {
        expect(screen.getByText('Submit Answers')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const optionButtons = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.includes('6e-35') || b.textContent?.includes('6e-34'));
    fireEvent.click(optionButtons[0]!);
    fireEvent.click(screen.getByText('Submit Answers'));

    await waitFor(
      () => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Network error');
      },
      { timeout: 3000 },
    );
  });
});
