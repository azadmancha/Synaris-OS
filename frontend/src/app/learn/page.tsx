'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, type Message, type Session } from '@/lib/api';
import { type Depth } from '@/components/chat/DepthSelector';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading, handleSignOut } = useAuth(isGuest, true);
  const { dark, toggleDark } = useDarkMode();
  const [isInitializing, setIsInitializing] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Create session + load chat history after auth
  useEffect(() => {
    async function init() {
      try {
        const [newSession, sessionList] = await Promise.all([
          api.createSession('balanced', 'learning'),
          api.listSessions().catch(() => ({ sessions: [], total: 0 })),
        ]);
        setSession(newSession);
        setSessions(sessionList.sessions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect');
      } finally {
        setIsInitializing(false);
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
      }, abortController.signal);
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

  // ─── Loading State ──────────────────────────────
  if (isInitializing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white to-blue-50 dark:from-[#0F1117] dark:to-[#13172B]">
        <div className="text-center">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <div className="relative">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-blue-500/10" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#EDEDEE]">Synaris</h2>
          <p className="mt-2 text-sm text-gray-500">Initializing your learning environment...</p>
          <div className="mx-auto mt-6 h-1 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full w-full origin-left animate-load-bar rounded-full bg-blue-600" />
          </div>
        </div>
        <style>{`
          @keyframes load-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
          .animate-load-bar { animation: load-bar 2s ease-in-out infinite; }
        `}</style>
      </main>
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

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          onKeyDown={handleKeyDown}
          depth={depth}
          onChangeDepth={setDepth}
          isLoading={isLoading}
          showDepthSelector={messages.length > 0}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
