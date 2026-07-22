'use client';

import { useState, useRef, useEffect } from 'react';
import type { Session } from '@/lib/api';
import type { AuthUser } from '@/hooks/useAuth';

// ─── Session Item (with inline rename) ────────────────

function SessionItem({ session, isActive, isLoading, onLoad, onDelete, onRename }: {
  session: Session;
  isActive: boolean;
  isLoading: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setEditValue(session.title || '');
  }, [session.title, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const date = new Date(session.created_at);
  const isToday = new Date().toDateString() === date.toDateString();
  const timeStr = isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const handleSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    } else {
      setEditValue(session.title || '');
    }
    setEditing(false);
  };

  return (
    <div className="group relative">
      <button
        onClick={onLoad}
        disabled={isActive || isLoading}
        className={`w-full rounded-lg px-3 py-2 pr-8 text-left text-xs transition-colors ${
          isActive
            ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300'
        } disabled:cursor-default`}
      >
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[10px] opacity-50">
            {session.subject === 'mathematics' ? '📐' : session.subject === 'science' ? '🔬' : '💬'}
          </span>
          <div className="min-w-0 flex-1" onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setEditValue(session.title || ''); }}>
            {editing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                  if (e.key === 'Escape') { setEditValue(session.title || ''); setEditing(false); }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-md border border-blue-300 bg-white px-1.5 py-0.5 text-xs outline-none dark:border-blue-600 dark:bg-[#0F1117]"
              />
            ) : (
              <span className="line-clamp-1 block cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
                {session.title || 'Untitled'}
              </span>
            )}
            <span className="text-[9px] text-gray-400/60">{timeStr}</span>
          </div>
          {session.message_count > 0 && (
            <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-400 dark:bg-gray-700">
              {session.message_count}
            </span>
          )}
        </div>
      </button>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); setEditValue(session.title || ''); }}
          className="rounded-md p-1 text-gray-300 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
          title="Rename chat"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this chat? This cannot be undone.')) onDelete(); }}
          className="rounded-md p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          title="Delete chat"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Chat Sidebar ─────────────────────────────────────

interface ChatSidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  isLoading: boolean;
  sidebarOpen: boolean;
  user: AuthUser | null;
  onNewChat: () => void;
  onLoadSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onCloseSidebar: () => void;
}

export function ChatSidebar({
  sessions, activeSessionId, isLoading, sidebarOpen, user,
  onNewChat, onLoadSession, onDeleteSession, onRenameSession, onCloseSidebar,
}: ChatSidebarProps) {
  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white/95 backdrop-blur-xl transition-all duration-300 dark:border-gray-700 dark:bg-[#0F1117]/95 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
          <a href="/dashboard" className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Synaris</a>
          <button onClick={onCloseSidebar} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300 lg:hidden">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button onClick={onNewChat} className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-[#1C1E2B]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Chat
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Recent Chats</p>
          {sessions.length === 0 ? (
            <div className="px-2 text-center">
              <p className="text-xs text-gray-400">No previous chats</p>
              <p className="mt-1 text-[10px] text-gray-400/60">Start a new conversation above</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {sessions.slice(0, 20).map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isActive={activeSessionId === s.id}
                  isLoading={isLoading}
                  onLoad={() => onLoadSession(s.id)}
                  onDelete={() => onDeleteSession(s.id)}
                  onRename={(title) => onRenameSession(s.id, title)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-100 p-3 dark:border-gray-800">
          {user && (
            <div className="space-y-2">
              <a href="/settings" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Settings
              </a>
              <div className="flex items-center gap-2">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full ring-2 ring-gray-200 dark:ring-gray-700" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-medium text-white ring-2 ring-gray-200 dark:ring-gray-700">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 truncate">
                  <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{user.name}</p>
                  <p className="truncate text-[10px] text-gray-400">{user.email}</p>
                </div>
              </div>
              <a href="/onboarding" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-[#1C1E2B] dark:hover:text-gray-300">
                <span>⚙️</span> Update learning profile
              </a>
            </div>
          )}
        </div>
      </aside>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={onCloseSidebar} />
      )}
    </>
  );
}
