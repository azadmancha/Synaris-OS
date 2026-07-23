'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase, signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/supabase';
import { SynarisWordmark } from '@/components/brand/SynarisLogo';

// ─── Particle Field (canvas background) ──────────────────

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current!;
    const ctx = canvasEl.getContext('2d')!;

    let animationId: number;
    let mouseX = 0;
    let mouseY = 0;

    const resize = () => { canvasEl.width = window.innerWidth; canvasEl.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number; hue: number }> = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvasEl.width, y: Math.random() * canvasEl.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5, opacity: Math.random() * 0.4 + 0.1,
        hue: Math.random() * 80 + 200,
      });
    }

    const onMouse = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    window.addEventListener('mousemove', onMouse);

    function draw() {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      for (const p of particles) {
        const dx = mouseX - p.x, dy = mouseY - p.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) { const force = (200 - dist) / 200 * 0.02; p.vx -= dx * force; p.vy -= dy * force; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvasEl.width; if (p.x > canvasEl.width) p.x = 0;
        if (p.y < 0) p.y = canvasEl.height; if (p.y > canvasEl.height) p.y = 0;
        p.vx *= 0.999; p.vy *= 0.999;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 60%, 55%, ${p.opacity})`; ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        if (!pi) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j];
          if (!pj) continue;
          const dx = pi.x - pj.x, dy = pi.y - pj.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) { ctx.beginPath(); ctx.moveTo(pi.x, pi.y); ctx.lineTo(pj.x, pj.y); ctx.strokeStyle = `hsla(210, 50%, 55%, ${(1 - dist / 100) * 0.08})`; ctx.lineWidth = 0.5; ctx.stroke(); }
        }
      }
      animationId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMouse); };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />;
}

// ─── Floating Glow Orbs ─────────────────────────────────

function FloatingOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-48 -top-48 h-[500px] w-[500px] animate-[float_20s_ease-in-out_infinite] rounded-full bg-blue-500/5 blur-3xl" />
      <div className="absolute -right-48 bottom-0 h-[400px] w-[400px] animate-[float_25s_ease-in-out_infinite_reverse] rounded-full bg-teal-500/5 blur-3xl" />
      <div className="absolute left-1/4 top-1/2 h-[350px] w-[350px] animate-[float_30s_ease-in-out_infinite] rounded-full bg-indigo-500/4 blur-3xl" />
      <div className="absolute right-1/4 top-1/4 h-[250px] w-[250px] animate-[float_22s_ease-in-out_infinite_reverse] rounded-full bg-purple-500/4 blur-3xl" />
    </div>
  );
}

// ─── Floating decoration elements ───────────────────────

function DecorativeElements() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {/* Top-right decorative circle */}
      <svg className="absolute -right-20 -top-20 h-64 w-64 text-blue-500/5" viewBox="0 0 200 200" fill="currentColor">
        <circle cx="100" cy="100" r="100" />
      </svg>
      {/* Bottom-left decorative circle */}
      <svg className="absolute -bottom-32 -left-32 h-96 w-96 text-indigo-500/5" viewBox="0 0 200 200" fill="currentColor">
        <circle cx="100" cy="100" r="100" />
      </svg>
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
    </div>
  );
}


// ─── Main Page ──────────────────────────────────────────

export default function Home() {
  const [phase, setPhase] = useState<'splash' | 'content'>('splash');
  const [dark, setDark] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Splash → Content transition + dark mode
  useEffect(() => {
    const splashTimer = setTimeout(() => setPhase('content'), 1500);
    // Restore dark mode preference
    const stored = localStorage.getItem('synaris_theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
    return () => clearTimeout(splashTimer);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('synaris_theme', next ? 'dark' : 'light');
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setAuthError(null);
      setAuthStatus(null);
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  }, []);

  const handleEmailSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setAuthError(null);
    setAuthStatus(null);

    try {
      if (isSignUp) {
        const result = await signUpWithEmail(email, password);
        if (result.user && !result.session) {
          setAuthStatus('Check your email for a confirmation link, then sign in below.');
          setIsSignUp(false);
        } else {
          setAuthStatus('Signed up successfully! Redirecting...');
          window.location.href = '/learn';
        }
      } else {
        await signInWithEmail(email, password);
        window.location.href = '/learn';
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, isSignUp]);

  const parallaxX = (mousePos.x - 0.5) * 15;
  const parallaxY = (mousePos.y - 0.5) * 15;

  // ─── SPLASH SCREEN ────────────────────────────────

  if (phase === 'splash') {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white dark:bg-[#0F1117]">
        <ParticleField />
        <div className="relative z-10 text-center">
          {/* Animated logo */}
          <div className="mb-6 animate-[fadeScaleIn_0.8s_ease-out_forwards] opacity-0">
            <SynarisWordmark size="lg" animated />
          </div>
          {/* Loading bar */}
          <div className="mx-auto mt-8 h-1 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full w-full origin-left animate-[loadBar_1.5s_ease-in-out_forwards] rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
          </div>
          <style>{`
            @keyframes fadeScaleIn {
              from { opacity: 0; transform: scale(0.85); }
              to   { opacity: 1; transform: scale(1); }
            }
            @keyframes loadBar {
              from { transform: scaleX(0); }
              to   { transform: scaleX(1); }
            }
          `}</style>
        </div>
      </main>
    );
  }

  // ─── MAIN CONTENT ─────────────────────────────────

  const parallaxStyle = phase === 'content'
    ? { transform: `translate(${parallaxX * 0.5}px, ${parallaxY * 0.5}px)` }
    : {};

  return (
    <main
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
    >
      <ParticleField />
      <FloatingOrbs />
      <DecorativeElements />

      {/* Mouse-follow gradient */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-30 transition-all duration-1000"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(59, 130, 246, 0.08), transparent 60%)`,
        }}
      />

      <div
        className="relative z-10 w-full max-w-lg text-center transition-all duration-1000"
        style={parallaxStyle}
      >
        {/* ── Synaris Brand ── */}
        <div
          className="mb-6 animate-[fadeUp_0.8s_ease-out_forwards] opacity-0"
          style={{ animationDelay: '0ms' }}
        >
          <SynarisWordmark size="lg" animated />
        </div>

        {/* ── Tagline ── */}
        <div
          className="mb-8 animate-[fadeUp_0.8s_ease-out_forwards] opacity-0"
          style={{ animationDelay: '100ms' }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/30 bg-blue-50/50 px-4 py-1.5 text-xs font-medium tracking-wide text-blue-600 backdrop-blur-sm dark:border-blue-800/30 dark:bg-blue-950/30 dark:text-blue-400">
            <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500" />
            Built for how you actually learn
          </span>
        </div>

        {/* ── Hero Title ── */}
        <h1
          className="animate-[fadeUp_0.8s_ease-out_forwards] opacity-0"
          style={{ animationDelay: '200ms' }}
        >
          <span className="block text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="animate-gradient bg-gradient-to-r from-blue-600 via-indigo-500 to-teal-500 bg-[length:200%_auto] bg-clip-text text-transparent">
              Learn deeply.
            </span>
          </span>
          <span className="mt-1 block text-4xl font-bold tracking-tight text-gray-800 sm:text-5xl md:text-6xl lg:text-7xl dark:text-[#EDEDEE]">
            Think independently.
          </span>
          <span className="mt-1 block text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="animate-gradient bg-gradient-to-r from-teal-500 via-indigo-500 to-blue-600 bg-[length:200%_auto] bg-clip-text text-transparent" style={{ animationDelay: '0.5s' }}>
              Build fearlessly.
            </span>
          </span>
        </h1>

        {/* ── Subtitle ── */}
        <p
          className="mx-auto mt-6 max-w-2xl animate-[fadeUp_0.8s_ease-out_forwards] text-lg text-gray-500 opacity-0 dark:text-gray-400 sm:text-xl"
          style={{ animationDelay: '300ms' }}
        >
          Synaris is an adaptive AI learning OS — created by{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-300">Azad</span>.
          <br />
          <span className="text-sm text-gray-400 sm:text-base">
            It cultivates understanding, curiosity, and independent thinking.
          </span>
        </p>

        {/* ── Auth Section ── */}
        <div
          className="mx-auto mt-10 max-w-sm animate-[fadeUp_0.8s_ease-out_forwards] opacity-0"
          style={{ animationDelay: '400ms' }}
        >
          {!showEmailForm ? (
            <>
              {/* Google Sign-In */}
              <button
                onClick={handleGoogleSignIn}
                className="group relative flex w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-3 text-sm font-medium text-gray-700 shadow-lg ring-1 ring-gray-300 transition-all hover:shadow-xl hover:ring-gray-400 active:scale-[0.97] dark:bg-[#1C1E2B] dark:text-gray-200 dark:ring-gray-600 dark:hover:ring-gray-500"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
                <span className="absolute -inset-1 rounded-full bg-blue-500/10 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
              </button>

              {/* Divider */}
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400">or</span>
                <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Email Sign-In Toggle */}
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full rounded-full border border-gray-300 px-8 py-3 text-sm font-medium text-gray-600 transition-all hover:border-gray-400 hover:text-gray-800 active:scale-[0.97] dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200"
              >
                Sign in with Email
              </button>

              {/* Guest link */}
              <a
                href="/learn?dev=1"
                className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                Continue as guest
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </>
          ) : (
            <>
              {/* Email Sign-In Form */}
              <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm transition-all animate-[fadeUp_0.5s_ease-out] dark:border-gray-700 dark:bg-[#1C1E2B]/90">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-[#EDEDEE]">
                  {isSignUp ? 'Create an Account' : 'Sign in with Email'}
                </h3>

                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <div>
                    <label htmlFor="email" className="sr-only">Email</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#0F1117] dark:text-[#EDEDEE] dark:focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="sr-only">Password</label>
                    <input
                      id="password"
                      type="password"
                      placeholder="Password (min. 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#0F1117] dark:text-[#EDEDEE] dark:focus:border-blue-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim() || password.length < 6}
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {isSignUp ? 'Creating account...' : 'Signing in...'}
                      </span>
                    ) : (
                      isSignUp ? 'Create Account' : 'Sign In'
                    )}
                  </button>
                </form>

                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="mt-3 w-full text-center text-xs text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>

                <button
                  onClick={() => setShowEmailForm(false)}
                  className="mt-2 w-full text-center text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ← Back to all sign-in options
                </button>
              </div>
            </>
          )}

          {/* Auth Status */}
          {authStatus && (
            <div className="mt-3 animate-[fadeUp_0.5s_ease-out] rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              {authStatus}
            </div>
          )}

          {/* Auth Error */}
          {authError && (
            <div className="mt-3 animate-[fadeUp_0.5s_ease-out] rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {authError}
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div
          className="mx-auto mt-20 h-px max-w-xs animate-[fadeUp_0.8s_ease-out_forwards] bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-0 dark:via-gray-700"
          style={{ animationDelay: '500ms' }}
        />

        {/* ── Philosophy ── */}
        <div
          className="mx-auto mt-8 max-w-xl animate-[fadeUp_0.8s_ease-out_forwards] opacity-0"
          style={{ animationDelay: '600ms' }}
        >
          <blockquote>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              &ldquo;<span className="italic text-gray-500 dark:text-gray-400">Concepts are permanent. Marks are temporary.</span>&rdquo;
            </p>
            <footer className="mt-2 text-xs text-gray-400">— The guiding principle of Synaris</footer>
          </blockquote>
        </div>

        {/* ── Footer ── */}
        <div
          className="mt-12 flex items-center justify-center gap-6 text-xs text-gray-400 animate-[fadeUp_0.8s_ease-out_forwards] opacity-0"
          style={{ animationDelay: '700ms' }}
        >
          <span>Synaris</span>
          <span className="h-3 w-px bg-gray-300 dark:bg-gray-700" />
          <span>Made by <span className="font-medium text-gray-500 dark:text-gray-400">Azad</span></span>
          <span className="h-3 w-px bg-gray-300 dark:bg-gray-700" />
          <span className="text-gray-400">Aeris Labs</span>
        </div>
      </div>

      {/* Dark mode toggle (fixed bottom-right) */}
      <button
        onClick={toggleDark}
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-sm shadow-lg backdrop-blur-sm transition-all hover:shadow-xl active:scale-[0.92] dark:border-gray-600 dark:bg-[#1C1E2B]/80"
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle dark mode"
      >
        {dark ? (
          <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {/* Global keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes loadBar {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
      `}</style>
    </main>
  );
}
