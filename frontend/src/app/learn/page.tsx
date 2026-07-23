'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, type Message, type Session } from '@/lib/api';
import { type Depth } from '@/components/chat/DepthSelector';
import { type AnswerMode } from '@/components/chat/AnswerModeSelector';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';

/** Wrapper that provides a Suspense boundary for useSearchParams. */
export default function LearnPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F1117]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading Synaris...</p>
        </div>
      </main>
    }>
      <LearnPageContent />
    </Suspense>
  );
}

function LearnPageContent() {
  const searchParams = useSearchParams();
  const isGuest = searchParams.get('dev') === '1';

  // ── State ─────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [depth, setDepth] = useState<Depth>('balanced');
  const [answerMode, setAnswerMode] = useState<AnswerMode>('teach');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading, handleSignOut } = useAuth(isGuest, true);
  const { dark, toggleDark } = useDarkMode();
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Phase 3: Spaced Repetition ──────────────────────
  const [conceptsDue, setConceptsDue] = useState<{concepts: {concept_name: string; subject: string; mastery_level: string; confidence_score: number | null; times_encountered: number; next_review_at: string | null; days_until_review: number | null}[]; total_due: number} | null>(null);
  const [reviewingConcept, setReviewingConcept] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<{concept_name: string; passed: boolean; new_mastery_level: string; quality: number} | null>(null);

  // ── Persist answer mode to localStorage ────────────
  // Restore on mount, save on change
  useEffect(() => {
    const saved = localStorage.getItem('synaris_answer_mode');
    if (saved && ['teach', 'hint', 'exam', 'socratic', 'simplify'].includes(saved)) {
      setAnswerMode(saved as AnswerMode);
    }
  }, []);

  const handleChangeAnswerMode = useCallback((mode: AnswerMode) => {
    setAnswerMode(mode);
    localStorage.setItem('synaris_answer_mode', mode);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    return () => { streamAbortRef.current?.abort(); };
  }, []);

  // ── Lazy Session Creation ────────────────────────────
  // Show the chat UI immediately (no spinner), create the session
  // in the background. The input stays disabled until session is ready.
  useEffect(() => {
    async function init() {
      // Show UI skeleton immediately
      setIsInitializing(false);

      try {
        const [newSession, sessionList, concepts] = await Promise.all([
          api.createSession('balanced', 'learning'),
          api.listSessions().catch(() => ({ sessions: [], total: 0 })),
          api.getConceptsDue(5).catch(() => null),
        ]);
        setSession(newSession);
        setSessions(sessionList.sessions || []);
        setConceptsDue(concepts);
        setSessionReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setSessionReady(true); // Allow UI to become interactive even on error
      }
    }
    if (!authLoading) init();
  }, [authLoading]);

  async function refreshSessions() {
    try {
      const sessionList = await api.listSessions();
      setSessions(sessionList.sessions || []);
    } catch { /* silent */ }
  }

  // ── Phase 3: Review a concept ─────────────────────────
  async function handleReviewConcept(conceptName: string, subject: string) {
    // Send a message asking to review this concept
    const text = `Let me review ${conceptName} (${subject})`;
    setReviewingConcept(conceptName);
    setReviewResult(null);
    await handleSend(undefined, text);
    setReviewingConcept(null);
  }

  async function handleSend(e?: React.FormEvent, customText?: string) {
    e?.preventDefault();
    const text = (customText || input).trim();
    if (!text || isLoading || !session) return;

    setInput('');
    setError(null);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      content_type: 'text',
      sequence_number: messages.length + 1,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      await api.sendMessageStream(session.id, text, depth, {
        onUserMessage: (userMsg) => {
          setMessages((prev) => {
            const updated = [...prev];
            const tempIdx = updated.findIndex((m) => m.id === tempUserMsg.id);
            if (tempIdx !== -1) updated[tempIdx] = userMsg;
            else updated.push(userMsg);
            return updated;
          });
        },
        onToken: (token) => setStreamingContent((prev) => prev + token),
        onDone: ({ ai_message }) => {
          setMessages((prev) => [...prev, ai_message]);
          setStreamingContent('');
          setIsStreaming(false);
          setIsLoading(false);
          const isDefaultTitle = !session.title || session.title === 'New Session' || session.title === 'Untitled' || session.title === session.subject;
          if (isDefaultTitle && text) {
            const newTitle = text.length > 60 ? text.slice(0, 60) + '...' : text;
            api.updateSessionTitle(session.id, newTitle).then((updated) => {
              setSession(updated);
              refreshSessions();
            }).catch(() => {});
          } else {
            refreshSessions();
          }
        },
        onError: (errMsg) => {
          setError(errMsg);
          setIsStreaming(false);
          setIsLoading(false);
          setStreamingContent('');
        },
      }, abortController.signal, answerMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingContent('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleFeedback(_messageId: string, _rating: 'positive' | 'negative') {
    // Track for analytics
  }

  async function handleLoadSession(sessionId: string) {
    try {
      streamAbortRef.current?.abort();
      setError(null);
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingContent('');

      const [sessionData, messagesData] = await Promise.all([
        api.getSession(sessionId),
        api.getMessages(sessionId),
      ]);

      setSession(sessionData);
      setMessages(messagesData.messages || []);
      setSidebarOpen(false);
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    }
  }

  async function handleDeleteSession(sessionId: string) {
    try {
      await api.deleteSession(sessionId);
      if (session?.id === sessionId) {
        setMessages([]);
        setStreamingContent('');
        setError(null);
        const newSession = await api.createSession('balanced', 'learning');
        setSession(newSession);
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      await refreshSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }

  async function handleNewChat() {
    try {
      streamAbortRef.current?.abort();
      setMessages([]);
      setStreamingContent('');
      setError(null);
      setIsStreaming(false);
      setIsLoading(false);

      const newSession = await api.createSession('balanced', 'learning');
      setSession(newSession);
      setSessions((prev) => [newSession, ...prev]);
      setSidebarOpen(false);
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    }
  }

  // ─── Skeleton Chat Layout (while session initializes) ──
  if (isInitializing) {
    return (
      <div className="flex h-screen overflow-hidden bg-white dark:bg-[#0F1117]">
        {/* Sidebar skeleton */}
        <div className="hidden w-72 flex-col border-r border-gray-200 p-4 dark:border-gray-800 lg:flex animate-pulse">
          <div className="mb-6 h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="mb-4 h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 w-full rounded-lg bg-gray-200 dark:bg-gray-800/50" />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col min-w-0">
          {/* Header skeleton */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-800" />
              <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="h-7 w-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>

          {/* Message area skeleton */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-600/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
                </div>
              </div>
              <div className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-synapse-neon-green/20 to-emerald-600/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
                </div>
              </div>
            </div>
          </div>

          {/* Input skeleton */}
          <div className="border-t border-gray-200 p-4 dark:border-gray-800 animate-pulse">
            <div className="mx-auto flex max-w-3xl items-center gap-2">
              <div className="flex-1 h-12 rounded-xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────
  if (error && !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white to-blue-50 dark:from-[#0F1117] dark:to-[#13172B]">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDEE]">Connection Error</h2>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => window.location.reload()} className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.98]">
              Retry
            </button>
            <a href="/" className="rounded-full border border-gray-300 px-6 py-2 text-sm font-medium text-gray-600 transition-all hover:border-gray-400 dark:border-gray-600 dark:text-gray-400">
              Go Home
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ─── Main UI ────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#0F1117]">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={session?.id ?? null}
        isLoading={isLoading}
        sidebarOpen={sidebarOpen}
        user={user}
        onNewChat={handleNewChat}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={(id, title) => {
          api.updateSessionTitle(id, title).then(() => {
            setSessions((prev) => prev.map((x) => x.id === id ? { ...x, title } : x));
            if (session?.id === id) setSession({ ...session, title });
          }).catch(() => {});
        }}
        onCloseSidebar={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <ChatHeader
          depth={depth}
          user={user}
          isGuest={isGuest}
          dark={dark}
          onToggleSidebar={() => setSidebarOpen(true)}
          onToggleDark={toggleDark}
          onSignOut={handleSignOut}
        />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Phase 3: Spaced Repetition Review Banner */}
          {conceptsDue && conceptsDue.total_due > 0 && (
            <div className="mx-auto mt-3 w-full max-w-3xl px-4 animate-[fadeUp_0.5s_ease-out]">
              <div className="group rounded-xl border border-synapse-neon-amber/30 bg-gradient-to-r from-synapse-neon-amber/5 to-transparent p-4 transition-all duration-200 hover:border-synapse-neon-amber/50 hover:shadow-glow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-synapse-neon-amber/20 to-synapse-neon-amber/5">
                    <svg className="h-4 w-4 text-synapse-neon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-glass-primary">
                        <span className="text-synapse-neon-amber">{conceptsDue.total_due}</span> concept{conceptsDue.total_due !== 1 ? 's' : ''} due for review
                      </p>
                      <button
                        onClick={() => setConceptsDue(null)}
                        className="shrink-0 rounded-lg p-1 text-gray-500 transition-colors hover:bg-white/[0.08] hover:text-gray-300"
                        title="Dismiss"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-500">
                      Spaced repetition helps you retain knowledge longer.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {conceptsDue.concepts.slice(0, 5).map((c) => (
                        <button
                          key={c.concept_name}
                          onClick={() => handleReviewConcept(c.concept_name, c.subject)}
                          disabled={reviewingConcept !== null}
                          className="group/chip inline-flex items-center gap-1.5 rounded-lg border border-synapse-neon-amber/20 bg-synapse-neon-amber/5 px-2.5 py-1 text-[11px] font-medium text-synapse-neon-amber transition-all hover:border-synapse-neon-amber/40 hover:bg-synapse-neon-amber/10 active:scale-[0.97] disabled:opacity-50"
                        >
                          {c.concept_name}
                          <span className="text-[9px] text-synapse-neon-amber/60">→</span>
                        </button>
                      ))}
                    </div>
                    {reviewingConcept && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-synapse-neon-amber border-t-transparent" />
                        <span className="text-[10px] text-synapse-neon-amber/70">Reviewing {reviewingConcept}...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phase 3: Review Result Notification */}
          {reviewResult && (
            <div className="mx-auto mt-2 w-full max-w-3xl px-4 animate-[fadeUp_0.3s_ease-out]">
              <div className={`rounded-xl border p-3 transition-all ${
                reviewResult.passed
                  ? 'border-synapse-neon-green/30 bg-gradient-to-r from-synapse-neon-green/5 to-transparent'
                  : 'border-synapse-neon-red/30 bg-gradient-to-r from-synapse-neon-red/5 to-transparent'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{reviewResult.passed ? '✅' : '🔄'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-glass-primary">
                      {reviewResult.passed
                        ? `Great job reviewing "${reviewResult.concept_name}"!`
                        : `Keep practicing "${reviewResult.concept_name}"`}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Mastery: <span className="font-medium text-synapse-neon-amber">{reviewResult.new_mastery_level}</span>
                      {' · '}Quality: <span className="font-medium">{reviewResult.quality.toFixed(1)}/5.0</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setReviewResult(null)}
                    className="shrink-0 rounded-lg p-1 text-gray-500 transition-colors hover:bg-white/[0.08]"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          <MessageList
            ref={messagesEndRef}
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            isLoading={isLoading}
          depth={depth}
          user={user}
          onSendMessage={(text) => handleSend(undefined, text)}
          onFeedback={handleFeedback}
          onChangeDepth={setDepth}
          answerMode={answerMode}
          onChangeAnswerMode={handleChangeAnswerMode}
        />
        </div>

        {/* Error banner */}
        {error && session && (
          <div className="mx-auto mb-2 w-full max-w-3xl px-4">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session connecting indicator */}
        {!sessionReady && !error && (
          <div className="mx-auto mb-1 flex w-full max-w-3xl items-center justify-center gap-2 px-4">
            <div className="flex items-center gap-2 rounded-lg border border-synapse-neon-blue/20 bg-synapse-neon-blue/5 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-synapse-neon-blue shadow-glow-sm" />
              <span className="text-[10px] text-synapse-neon-blue/70">Connecting...</span>
            </div>
          </div>
        )}

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          onKeyDown={handleKeyDown}
          depth={depth}
          onChangeDepth={setDepth}
          answerMode={answerMode}
          onChangeAnswerMode={handleChangeAnswerMode}
          isLoading={isLoading || !sessionReady}
          showControls={messages.length > 0}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
