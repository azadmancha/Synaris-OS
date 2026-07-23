/**
 * Synaris API Client
 *
 * Centralized HTTP client for all backend API calls.
 * Sends auth token automatically when available for per-user session isolation.
 * Sends errors to Sentry when enabled.
 *
 * Usage:
 *   const { user, ai } = await api.sendMessage(sessionId, "Explain entropy");
 *   const sessions = await api.listSessions();
 */

import { captureException } from '@/lib/sentry';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1';

// Stored auth token — set after login, sent with every request
let _authToken: string | null = null;

/** Set the auth token to send with subsequent requests. */
export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Send auth token if available (ensures correct user ID on backend)
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      const apiError = new ApiError(error, response.status);

      // Report HTTP errors to Sentry (ignore 4xx client errors for monitoring)
      if (response.status >= 500) {
        captureException(apiError, {
          tags: { endpoint: path, method: options.method || 'GET' },
          extra: { status_code: response.status, response_body: error.slice(0, 500) },
        });
      }

      throw apiError;
    }

    return response.json();
  } catch (err) {
    // Report network/timeout errors to Sentry
    if (err instanceof TypeError || (err instanceof Error && err.message.includes('fetch'))) {
      captureException(err, {
        tags: { endpoint: path, error_type: 'network' },
        extra: { url },
      });
    }
    throw err;
  }
}

// ─── Types ─────────────────────────────────────────────

export interface Session {
  id: string;
  title: string | null;
  mode: string;
  subject: string | null;
  status: string;
  message_count: number;
  created_at: string;
  topics: string[] | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_type: string;
  sequence_number: number;
  created_at: string;
}

export interface ChatResponse {
  user_message: Message;
  ai_message: Message;
  mode: string;
}

export interface LoginResponse {
  user_id: string;
  email: string;
  display_name: string | null;
  token: string;
  created_at: string;
}

// ─── Feedback ──────────────────────────────────────────

export async function rateMessage(
  messageId: string,
  rating: 'positive' | 'negative' | 'reset',
): Promise<{ message_id: string; rating: string; success: boolean }> {
  return request('/feedback/message', {
    method: 'POST',
    body: { message_id: messageId, rating },
  });
}

export async function getMessageFeedback(
  messageId: string,
): Promise<{ message_id: string; rating: string | null }> {
  return request(`/feedback/message/${messageId}`);
}

// ─── User Profile ───────────────────────────────────────

export async function getProfile(): Promise<{
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  theme_preference: string;
  default_mode: string;
  onboarding_completed: boolean;
  created_at: string;
}> {
  return request('/user/profile');
}

export async function updateProfile(data: {
  display_name?: string;
  bio?: string;
  avatar_url?: string | null;
  theme_preference?: string;
  default_mode?: string;
  onboarding_completed?: boolean;
}): Promise<{
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  theme_preference: string;
  default_mode: string;
  onboarding_completed: boolean;
  created_at: string;
}> {
  return request('/user/profile', {
    method: 'PATCH',
    body: data,
  });
}

// ─── Health ────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string; version: string }> {
  return request('/health');
}

// ─── Auth ──────────────────────────────────────────────

export async function login(email: string, displayName?: string): Promise<LoginResponse> {
  return request('/auth/login', {
    method: 'POST',
    body: { email, display_name: displayName },
  });
}

export async function supabaseLogin(
  accessToken: string,
  email: string,
  name?: string,
  avatarUrl?: string,
): Promise<LoginResponse> {
  return request('/auth/supabase', {
    method: 'POST',
    body: {
      access_token: accessToken,
      email,
      name,
      avatar_url: avatarUrl,
    },
  });
}

export async function logout(): Promise<{ message: string }> {
  return request('/auth/logout', { method: 'POST' });
}

// ─── Sessions ──────────────────────────────────────────

export async function createSession(mode = 'balanced', subject?: string): Promise<Session> {
  return request('/sessions', {
    method: 'POST',
    body: { mode, subject },
  });
}

export async function listSessions(): Promise<{ sessions: Session[]; total: number }> {
  return request('/sessions');
}

export async function getSession(sessionId: string): Promise<Session> {
  return request(`/sessions/${sessionId}`);
}

export async function deleteSession(sessionId: string): Promise<{ message: string }> {
  return request(`/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<Session> {
  return request(`/sessions/${sessionId}`, {
    method: 'PATCH',
    body: { title },
  });
}

// ─── Messages ──────────────────────────────────────────

export async function sendMessage(
  sessionId: string,
  content: string,
  mode = 'balanced',
  answerMode = 'teach',
): Promise<ChatResponse> {
  return request(`/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: { content, mode, answer_mode: answerMode },
  });
}

export async function getMessages(
  sessionId: string,
): Promise<{ messages: Message[]; total: number }> {
  return request(`/sessions/${sessionId}/messages`);
}

// ─── Streaming (SSE) ───────────────────────────────────

export interface StreamCallbacks {
  onUserMessage?: (message: Message) => void;
  onToken?: (token: string) => void;
  onDone?: (data: { ai_message: Message; mode: string }) => void;
  onError?: (error: string) => void;
}

/**
 * Send a message and stream the AI response via Server-Sent Events.
 *
 * Parses SSE events and calls the appropriate callbacks:
 * - `onUserMessage`: The saved user message (for displaying it)
 * - `onToken`: Individual tokens from the AI response
 * - `onDone`: Streaming complete, includes the full AI message
 * - `onError`: Something went wrong
 */
export async function sendMessageStream(
  sessionId: string,
  content: string,
  mode: string = 'balanced',
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  answerMode: string = 'teach',
): Promise<void> {
  const url = `${API_BASE}/sessions/${sessionId}/messages/stream`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content, mode, answer_mode: answerMode }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Stream request failed');
    callbacks.onError?.(errorText);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.('Response body is not readable');
    return;
  }

  await parseSSEStream(reader, {
    user_message: (data) => {
      const parsed = JSON.parse(data) as Message;
      callbacks.onUserMessage?.(parsed);
    },
    token: (data) => {
      const parsed = JSON.parse(data) as string;
      callbacks.onToken?.(parsed);
    },
    done: (data) => {
      const parsed = JSON.parse(data) as {
        ai_message: Message;
        mode: string;
      };
      callbacks.onDone?.(parsed);
    },
    error: (data) => {
      const parsed = JSON.parse(data) as string;
      callbacks.onError?.(parsed);
    },
  });
}

// ─── Quiz Types ────────────────────────────────────────

export interface Question {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_answer: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  explanation: string | null;
}

export interface Quiz {
  id: string;
  session_id: string;
  topic: string;
  difficulty: string;
  question_count: number;
  status: string;
  score: number | null;
  total_points: number | null;
  correct_count: number;
  answered_count: number;
  is_complete: boolean;
  questions: Question[];
  model_used: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface QuizListResponse {
  quizzes: Quiz[];
  total: number;
}

// ─── SSE Helper ────────────────────────────────────────────

/**
 * Parse a Server-Sent Events stream and call the appropriate event handlers.
 *
 * Shared by sendMessageStream and generateQuizStream to avoid duplicating
 * the SSE parsing logic.
 */
async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: Record<string, (data: string) => void>,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      // Each event looks like:
      //   event: token\n
      //   data: "content"\n\n
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;

        const lines = eventBlock.split('\n');
        let eventType = '';
        let data = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            data = line.slice(6).trim();
          }
        }

        if (!eventType || !data) continue;

        const handler = handlers[eventType];
        if (handler) {
          try {
            handler(data);
          } catch {
            // Skip malformed events
          }
        }
      }
    }
  } catch (err) {
    const errorHandler = handlers['error'];
    if (errorHandler && (err as Error)?.name !== 'AbortError') {
      errorHandler(err instanceof Error ? err.message : 'Stream read error');
    }
  }
}

// ─── Quiz Stream Callbacks ──────────────────────────────

export interface QuizStreamCallbacks {
  onToken?: (token: string) => void;
  onDone?: (quiz: Quiz) => void;
  onError?: (error: string) => void;
}

// ─── Quizzes ────────────────────────────────────────────

export async function generatePracticeQuiz(
  sessionId: string,
  topic?: string,
  difficulty: string = 'balanced',
  questionCount: number = 5,
): Promise<Quiz> {
  return request(`/sessions/${sessionId}/quizzes/practice`, {
    method: 'POST',
    body: { topic: topic || null, difficulty, question_count: questionCount },
  });
}

export async function generateQuiz(
  sessionId: string,
  topic: string,
  difficulty: string = 'balanced',
  questionCount: number = 5,
): Promise<Quiz> {
  return request(`/sessions/${sessionId}/quizzes/generate`, {
    method: 'POST',
    body: { topic, difficulty, question_count: questionCount },
  });
}

/**
 * Generate a quiz via Server-Sent Events streaming.
 *
 * Streams the AI response tokens as they arrive, providing
 * a live preview of the quiz being generated. When complete,
 * the quiz is saved server-side and returned via onDone.
 *
 * Returns faster perceived latency than the non-streaming
 * generateQuiz() because tokens start arriving immediately.
 */
export async function generateQuizStream(
  sessionId: string,
  topic: string,
  difficulty: string = 'balanced',
  questionCount: number = 5,
  callbacks: QuizStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${API_BASE}/sessions/${sessionId}/quizzes/generate/stream`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ topic, difficulty, question_count: questionCount }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Stream request failed');
    callbacks.onError?.(errorText);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.('Response body is not readable');
    return;
  }

  await parseSSEStream(reader, {
    token: (data) => {
      const parsed = JSON.parse(data) as string;
      callbacks.onToken?.(parsed);
    },
    done: (data) => {
      const parsed = JSON.parse(data) as { quiz: Quiz };
      callbacks.onDone?.(parsed.quiz);
    },
    error: (data) => {
      const parsed = JSON.parse(data) as string;
      callbacks.onError?.(parsed);
    },
  });
}

export async function listQuizzes(sessionId: string): Promise<QuizListResponse> {
  return request(`/sessions/${sessionId}/quizzes`);
}

export async function getQuiz(sessionId: string, quizId: string): Promise<Quiz> {
  return request(`/sessions/${sessionId}/quizzes/${quizId}`);
}

export async function submitQuizAnswers(
  sessionId: string,
  quizId: string,
  answers: { question_id: string; user_answer: string }[],
): Promise<Quiz> {
  return request(`/sessions/${sessionId}/quizzes/${quizId}/answer`, {
    method: 'POST',
    body: { answers },
  });
}

// ─── Mistake Types ─────────────────────────────────────

export interface MistakeSummary {
  question: string;
  topic: string;
  difficulty: string;
  user_answer: string;
  correct_answer: string;
  explanation: string | null;
  quiz_id: string;
  quiz_completed_at: string | null;
}

export interface WeakTopic {
  topic: string;
  mistake_count: number;
  total_questions: number;
  accuracy: number;
}

// ─── Analytics Types ───────────────────────────────────

export interface ConceptMasterySummary {
  concept_name: string;
  subject: string;
  mastery_level: string;
  confidence_score: number | null;
  times_encountered: number;
  times_correct: number | null;
  times_incorrect: number | null;
  last_reviewed_at: string | null;
}

export interface QuizPerformanceSummary {
  quiz_id: string;
  topic: string;
  difficulty: string;
  score: number | null;
  total_points: number | null;
  percentage: number | null;
  completed_at: string | null;
}

export interface SubjectBreakdown {
  subject: string;
  session_count: number;
  message_count: number;
  total_time_minutes: number;
}

export interface ActivityDay {
  date: string;
  sessions: number;
  messages: number;
}

export interface AnalyticsResponse {
  total_sessions: number;
  total_messages: number;
  total_quizzes: number;
  total_concepts: number;
  active_sessions: number;
  average_messages_per_session: number;
  quizzes_completed: number;
  average_quiz_score: number | null;
  highest_quiz_score: number | null;
  quiz_streak: number;
  mastered_concepts: number;
  learning_concepts: number;
  undiscovered_concepts: number;
  average_confidence: number | null;
  top_subject: string | null;
  subjects: SubjectBreakdown[];
  recent_quizzes: QuizPerformanceSummary[];
  concept_mastery: ConceptMasterySummary[];
  activity_timeline: ActivityDay[];
  learning_streak_days: number;
  session_count_today: number;
  is_active_today: boolean;
  first_learning_date: string | null;
  // Mistake analysis
  total_mistakes: number;
  weakest_topics: WeakTopic[];
  recent_mistakes: MistakeSummary[];
}

// ─── Analytics ──────────────────────────────────────────

export async function getAnalytics(): Promise<AnalyticsResponse> {
  return request('/user/analytics');
}

// ─── Study Plan Types ────────────────────────────────

export interface Milestone {
  week: number;
  title: string;
  description: string;
  topics: string[];
  estimated_hours: number;
  learning_objectives: string[];
  quiz_topic: string | null;
  practical_exercise: string | null;
}

export interface StudyPlan {
  id: string;
  title: string;
  goal: string;
  subjects: string[];
  experience_level: string;
  estimated_duration_weeks: number;
  milestones: Milestone[];
  status: string;
  model_used: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface StudyPlanListResponse {
  study_plans: StudyPlan[];
  total: number;
}

export interface StudyPlanGenerateRequest {
  goal: string;
  subjects: string[];
  experience_level: string;
  duration_weeks: number;
  additional_goals?: string;
}

// ─── Study Plan API ─────────────────────────────────────

export async function generateStudyPlan(data: StudyPlanGenerateRequest): Promise<StudyPlan> {
  return request('/study-plans/generate', {
    method: 'POST',
    body: data,
  });
}

export async function listStudyPlans(
  limit: number = 10,
  offset: number = 0,
): Promise<StudyPlanListResponse> {
  return request(`/study-plans?limit=${limit}&offset=${offset}`);
}

export async function getStudyPlan(planId: string): Promise<StudyPlan> {
  return request(`/study-plans/${planId}`);
}

export async function updateStudyPlan(
  planId: string,
  data: { title?: string; status?: string },
): Promise<StudyPlan> {
  return request(`/study-plans/${planId}`, {
    method: 'PATCH',
    body: data,
  });
}

// ─── Spaced Repetition (Phase 3) ─────────────────────

export interface ConceptForReview {
  concept_name: string;
  subject: string;
  mastery_level: string;
  confidence_score: number | null;
  times_encountered: number;
  next_review_at: string | null;
  days_until_review: number | null;
}

export interface ConceptsDueResponse {
  concepts: ConceptForReview[];
  total_due: number;
}

export async function getConceptsDue(limit: number = 10): Promise<ConceptsDueResponse> {
  return request(`/user/memory/concepts-due?limit=${limit}`);
}

export async function recordConceptReview(data: {
  concept_name: string;
  subject: string;
  correct: boolean;
  response_time_seconds?: number | null;
  requested_hint?: boolean;
}): Promise<{
  concept_name: string;
  subject: string;
  quality: number;
  new_mastery_level: string;
  new_confidence_score: number;
  next_review_at: string;
  next_interval_days: number;
  passed: boolean;
}> {
  return request('/user/memory/concepts/review', {
    method: 'POST',
    body: data,
  });
}

// ─── Convenience ───────────────────────────────────────

export const api = {
  healthCheck,
  login,
  supabaseLogin,
  logout,
  createSession,
  listSessions,
  getSession,
  deleteSession,
  updateSessionTitle,
  sendMessage,
  sendMessageStream,
  getMessages,
  rateMessage,
  getMessageFeedback,
  getProfile,
  updateProfile,
  generateQuiz,
  generateQuizStream,
  generatePracticeQuiz,
  listQuizzes,
  getQuiz,
  submitQuizAnswers,
  getConceptsDue,
  recordConceptReview,
  getAnalytics,
  generateStudyPlan,
  listStudyPlans,
  getStudyPlan,
  updateStudyPlan,
  setAuthToken,
  getAuthToken,
};
