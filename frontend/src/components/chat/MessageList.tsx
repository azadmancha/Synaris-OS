'use client';

import { forwardRef, useEffect, useRef } from 'react';
import type { Message } from '@/lib/api';
import type { Depth } from '@/components/chat/DepthSelector';
import type { AuthUser } from '@/hooks/useAuth';
import { DepthSelector } from '@/components/chat/DepthSelector';
import { AnswerModeSelector, type AnswerMode } from '@/components/chat/AnswerModeSelector';
import { MessageActions, stripFollowUpSection } from '@/components/chat/MessageActions';
import MarkdownRenderer from '@/components/MarkdownRenderer';

const SUGGESTED_TOPICS = [
  { emoji: '🔬', label: 'Quantum Mechanics', query: 'Explain quantum mechanics simply', gradient: 'from-blue-500 to-indigo-600', glow: 'shadow-glow-blue' },
  { emoji: '🧮', label: 'Calculus', query: 'What is calculus and why is it important?', gradient: 'from-purple-500 to-pink-600', glow: 'shadow-glow-purple' },
  { emoji: '🧬', label: 'Genetics', query: 'Explain DNA replication step by step', gradient: 'from-synapse-neon-green to-emerald-600', glow: 'shadow-glow-green' },
  { emoji: '⚡', label: 'Thermodynamics', query: 'What are the laws of thermodynamics?', gradient: 'from-amber-500 to-orange-600', glow: 'shadow-glow-sm' },
  { emoji: '🐍', label: 'Python', query: 'Teach me Python programming basics', gradient: 'from-synapse-neon-cyan to-blue-600', glow: 'shadow-glow-cyan' },
  { emoji: '🌍', label: 'Climate', query: 'What causes climate change?', gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-glow-green' },
];

// ─── Subtle Particle Background ─────────────────────────

function StartupParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cvs = canvas; // TypeScript narrowing for closure

    let animId: number;
    let mouseX = 0;
    let mouseY = 0;

    const resize = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Fewer particles for subtle effect (30 instead of 80)
    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * cvs.width,
      y: Math.random() * cvs.height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.25 + 0.05,
      hue: Math.random() * 60 + 200,
    }));

    const onMouse = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    window.addEventListener('mousemove', onMouse);

    const canvas2d = ctx; // TypeScript narrowing fix
    function draw() {
      canvas2d.clearRect(0, 0, cvs.width, cvs.height);
      for (const p of particles) {
        const dx = mouseX - p.x, dy = mouseY - p.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) { const force = (150 - dist) / 150 * 0.015; p.vx -= dx * force; p.vy -= dy * force; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = cvs.width; if (p.x > cvs.width) p.x = 0;
        if (p.y < 0) p.y = cvs.height; if (p.y > cvs.height) p.y = 0;
        p.vx *= 0.999; p.vy *= 0.999;
        canvas2d.beginPath(); canvas2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        canvas2d.fillStyle = `hsla(${p.hue}, 50%, 50%, ${p.opacity})`;
        canvas2d.fill();
      }
      // Subtle connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if (!a) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          if (!b) continue;
          const dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            canvas2d.beginPath(); canvas2d.moveTo(a.x, a.y); canvas2d.lineTo(b.x, b.y);
            canvas2d.strokeStyle = `hsla(210, 50%, 55%, ${(1 - dist / 80) * 0.04})`;
            canvas2d.lineWidth = 0.5; canvas2d.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMouse); };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />;
}

// ─── Startup Screen (Enhanced) ───────────────────────────

function StartupScreen({ user, depth, onChangeDepth, answerMode, onChangeAnswerMode, onSendMessage }: {
  user: AuthUser | null;
  depth: Depth;
  answerMode: AnswerMode;
  onChangeDepth: (d: Depth) => void;
  onChangeAnswerMode: (m: AnswerMode) => void;
  onSendMessage: (text: string) => void;
}) {
  return (
    <div className="mt-6 space-y-8 sm:mt-10 relative z-10">
      {/* ── Welcome Hero ── */}
      <div className="text-center animate-scale-in">
        <div className="relative mx-auto mb-5 inline-flex">
          {/* Neon icon with flicker */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-synapse-neon-blue to-indigo-600 shadow-glow-blue animate-neon-flicker">
            <span className="text-3xl">🧠</span>
          </div>
          {/* Pulsing glow ring */}
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-synapse-neon-blue/20 to-indigo-600/10 blur-xl -z-10 animate-glow-pulse" />
          {/* Outer ring pulse */}
          <div className="absolute -inset-3 rounded-2xl border border-synapse-neon-blue/10 animate-glow-pulse-fast -z-20" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          <span className="text-gradient inline-block">
            Welcome{user ? ', ' : ''}
            {user ? (
              <span className="inline-block overflow-hidden whitespace-nowrap animate-typewriter border-r-2 border-synapse-neon-blue align-bottom"
                style={{ width: '0', animationDelay: '0.3s', animationFillMode: 'forwards', maxWidth: '15ch' } as React.CSSProperties}
              >
                {user.name.split(' ')[0]}
              </span>
            ) : null}
          </span>
        </h2>
        <div className="mt-2 overflow-hidden">
          <p className="text-sm text-glass-tertiary animate-[slide-up_0.5s_ease-out_0.8s_forwards] opacity-0">
            What would you like to learn today?
          </p>
        </div>
      </div>

      {/* ── Suggested Topics ── */}
      <div className="animate-scale-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' } as React.CSSProperties}>
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-gray-700" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-glass-tertiary">Try asking about</p>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-gray-700" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SUGGESTED_TOPICS.map((topic, i) => (
            <button
              key={topic.label}
              onClick={() => onSendMessage(topic.query)}
              className="group relative overflow-hidden rounded-2xl border border-gray-700/40 bg-white/[0.02] p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gray-600/60 hover:bg-white/[0.04] hover:shadow-card-hover animate-scale-in opacity-0"
              style={{ animationDelay: `${0.3 + i * 0.08}s`, animationFillMode: 'forwards' } as React.CSSProperties}
            >
              {/* Hover glow overlay */}
              <div className={`absolute -inset-px rounded-2xl opacity-0 transition-all duration-500 group-hover:opacity-100 bg-gradient-to-br ${topic.gradient} blur-lg`} />

              <div className="relative z-10 flex items-center gap-3 group-hover:animate-float-card">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${topic.gradient} transition-transform duration-300 group-hover:scale-110`}>
                  <span className="text-lg">{topic.emoji}</span>
                </div>
                <span className="text-sm font-medium text-glass-secondary group-hover:text-glass-primary transition-colors duration-300">{topic.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-4 animate-scale-in" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' } as React.CSSProperties}>
        <span className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent" />
      </div>

      {/* ── Depth Selector ── */}
      <div className="animate-scale-in text-center" style={{ animationDelay: '0.7s', animationFillMode: 'forwards' } as React.CSSProperties}>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-glass-tertiary">Learning Depth</p>
        <DepthSelector depth={depth} onChange={onChangeDepth} size="md" />
      </div>

      {/* ── Answer Mode Selector ── */}
      <div className="animate-scale-in text-center" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' } as React.CSSProperties}>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-glass-tertiary">Answer Mode</p>
        <AnswerModeSelector mode={answerMode} onChange={onChangeAnswerMode} size="md" />
      </div>
    </div>
  );
}

// ─── Loading Dots ──────────────────────────────────────

function LoadingDots() {
  return (
    <div className="inline-block max-w-[75%] rounded-2xl border border-gray-700/30 bg-white/[0.03] px-5 py-4">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-synapse-neon-blue/60 animate-bounce-dot"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Streaming Message ─────────────────────────────────

function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="inline-block max-w-[85%] rounded-2xl border border-gray-700/30 bg-white/[0.03] px-5 py-3.5 text-sm leading-relaxed sm:max-w-[75%]">
      <MarkdownRenderer content={content} className="text-sm text-gray-200" />
      <span className="inline-block h-4 w-[2px] animate-pulse bg-synapse-neon-blue align-text-bottom ml-0.5 shadow-glow-sm" />
    </div>
  );
}

// ─── Message List ──────────────────────────────────────

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  isLoading: boolean;
  depth: Depth;
  answerMode: AnswerMode;
  user: AuthUser | null;
  onSendMessage: (text: string) => void;
  onFeedback: (id: string, rating: 'positive' | 'negative') => void;
  onChangeDepth: (depth: Depth) => void;
  onChangeAnswerMode: (mode: AnswerMode) => void;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(function MessageList(
  { messages, streamingContent, isStreaming, isLoading, depth, answerMode, user, onSendMessage, onFeedback, onChangeDepth, onChangeAnswerMode },
  messagesEndRef,
) {
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 relative">
        <StartupParticles />
        <StartupScreen user={user} depth={depth} onChangeDepth={onChangeDepth} answerMode={answerMode} onChangeAnswerMode={onChangeAnswerMode} onSendMessage={onSendMessage} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="space-y-6">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`animate-message-in ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed sm:max-w-[75%] ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-synapse-neon-blue to-indigo-600 text-white shadow-glow-sm'
                : 'border border-gray-700/30 bg-white/[0.03] text-gray-200'
            }`}>
              {msg.role === 'assistant' ? (
                <>
                  <MarkdownRenderer content={stripFollowUpSection(msg.content)} className="text-sm" />
                  <MessageActions
                    messageId={msg.id}
                    message={msg.content}
                    onFeedback={onFeedback}
                    onFollowUp={onSendMessage}
                  />
                </>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="animate-message-in text-left">
            <StreamingMessage content={streamingContent} />
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="text-left">
            <LoadingDots />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});
