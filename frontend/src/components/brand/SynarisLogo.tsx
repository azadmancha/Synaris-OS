'use client';

import { useId } from 'react';

/**
 * Synaris "Neural S" Logo Mark
 *
 * An abstract 'S' formed by two interlocking glowing neural nodes
 * connected by subtle circuit-like paths — representing the
 * synergy between human learning and AI.
 *
 * Brand colors: #2563EB (deep electric blue), #06B6D4 (cyan teal)
 * Style: Warm-tech — clean geometric lines with rounded edges
 */

interface NeuralSProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export function NeuralS({ size = 40, animated = false, className = '' }: NeuralSProps) {
  const uid = useId().replace(/[:.]/g, '_');
  const gradId = `sg-${uid}`;
  const glowId = `gl-${uid}`;
  const glowSoftId = `gs-${uid}`;

  return (
    <>
      {animated && (
        <style>{`
          @keyframes nd-${uid} {
            to { stroke-dashoffset: 0; }
          }
          @keyframes np-${uid} {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.15); }
          }
          @keyframes sp-${uid} {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 0.9; transform: scale(1.2); }
          }
        `}</style>
      )}
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={glowSoftId}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background subtle glow */}
        <circle cx="20" cy="20" r="18" fill={`url(#${gradId})`} opacity="0.06" />

        {/* Circuit path — the 'S' curve */}
        <path
          d="M12 12C12 12 16 8 22 10C28 12 28 18 24 20C20 22 16 20 14 24C12 28 16 32 22 32"
          stroke={`url(#${gradId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={
            animated
              ? {
                  strokeDasharray: 60,
                  strokeDashoffset: 60,
                  animation: `nd-${uid} 2s ease-out forwards`,
                }
              : {}
          }
        />

        {/* Neural node 1 — top (electric blue) */}
        <circle
          cx="12"
          cy="12"
          r="3.5"
          fill="#2563EB"
          stroke="white"
          strokeWidth="1.5"
          filter={`url(#${glowId})`}
          style={animated ? { animation: `np-${uid} 3s ease-in-out infinite` } : {}}
        />

        {/* Neural node 2 — bottom (cyan teal) */}
        <circle
          cx="28"
          cy="30"
          r="3.5"
          fill="#06B6D4"
          stroke="white"
          strokeWidth="1.5"
          filter={`url(#${glowId})`}
          style={animated ? { animation: `np-${uid} 3s ease-in-out infinite 1s` } : {}}
        />

        {/* Connection dots along the path */}
        <circle cx="15" cy="11" r="1" fill="#2563EB" opacity="0.6" />
        <circle cx="20" cy="10.5" r="1.2" fill="#6366F1" opacity="0.8" />
        <circle cx="24" cy="12.5" r="1" fill="#6366F1" opacity="0.6" />
        <circle cx="26" cy="16" r="1.2" fill="#8B5CF6" opacity="0.8" />
        <circle
          cx="25"
          cy="20"
          r="1.5"
          fill="#8B5CF6"
          opacity="0.9"
          filter={`url(#${glowSoftId})`}
        />
        <circle cx="22" cy="23" r="1.2" fill="#6366F1" opacity="0.8" />
        <circle cx="18" cy="24" r="1" fill="#06B6D4" opacity="0.6" />
        <circle cx="15" cy="27" r="1.2" fill="#06B6D4" opacity="0.8" />
        <circle cx="20" cy="26" r="1" fill="#818CF8" opacity="0.5" />

        {/* Sparkle accent */}
        <path
          d="M30 10L31 12L33 13L31 14L30 16L29 14L27 13L29 12L30 10Z"
          fill="#8B5CF6"
          opacity="0.7"
          style={animated ? { animation: `sp-${uid} 4s ease-in-out infinite 2s` } : {}}
        />

        {/* Node connection — horizontal bridging lines */}
        <line
          x1="14"
          y1="17"
          x2="17"
          y2="17"
          stroke="#6366F1"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.4"
        />
        <line
          x1="23"
          y1="23"
          x2="26"
          y2="23"
          stroke="#6366F1"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.4"
        />
      </svg>
    </>
  );
}

/**
 * Full Synaris Wordmark with Neural S Mark
 *
 * Horizontal lockup: [Neural S Mark] + "Syn" + "aris"
 * Font: Inter — "Syn" SemiBold, "aris" Regular
 */
interface SynarisWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  showMark?: boolean;
  stacked?: boolean;
  animated?: boolean;
  className?: string;
}

const sizes = {
  sm: { mark: 28, title: 'text-sm', subtitle: 'text-[9px]' },
  md: { mark: 36, title: 'text-lg', subtitle: 'text-[10px]' },
  lg: { mark: 44, title: 'text-2xl', subtitle: 'text-xs' },
};

export function SynarisWordmark({
  size = 'md',
  showMark = true,
  stacked = false,
  animated = false,
  className = '',
}: SynarisWordmarkProps) {
  const s = sizes[size];

  return (
    <div
      className={`inline-flex items-center ${stacked ? 'flex-col gap-1' : 'gap-2.5'} ${className}`}
    >
      {showMark && (
        <div className="relative shrink-0">
          <NeuralS size={s.mark} animated={animated} />
        </div>
      )}
      <div
        className={`flex ${stacked ? 'flex-col items-center' : 'items-baseline'} ${stacked ? '' : 'gap-0'}`}
      >
        <span
          className={`${s.title} font-semibold tracking-tight text-gray-900 dark:text-[#EDEDEE]`}
          style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontWeight: 600 }}
        >
          Syn
        </span>
        <span
          className={`${s.title} font-normal tracking-tight text-gray-600 dark:text-gray-400`}
          style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontWeight: 400 }}
        >
          aris
        </span>
      </div>
    </div>
  );
}

/**
 * App Icon — square with gradient background for favicon / app icon use
 */
export function SynarisAppIcon({ size = 512 }: { size?: number }) {
  const uid = useId().replace(/[:.]/g, '_');
  const bgId = `ibg-${uid}`;
  const glowId = `ig-${uid}`;

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="30%" stopColor="#2563EB" />
          <stop offset="70%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="512" height="512" rx="96" fill={`url(#${bgId})`} />

      {/* Decorative orbital rings */}
      <circle cx="256" cy="256" r="180" stroke="white" strokeWidth="1" opacity="0.08" />
      <circle
        cx="256"
        cy="256"
        r="140"
        stroke="white"
        strokeWidth="0.5"
        opacity="0.06"
        strokeDasharray="8 8"
      />

      {/* Neural S Path */}
      <path
        d="M180 160C180 160 210 120 260 140C310 160 310 220 270 250C230 280 190 260 170 300C150 340 190 380 260 380"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />

      {/* Top node */}
      <circle cx="180" cy="160" r="24" fill="white" filter={`url(#${glowId})`} />
      {/* Bottom node */}
      <circle cx="300" cy="360" r="24" fill="white" filter={`url(#${glowId})`} opacity="0.85" />

      {/* Connection dots */}
      <circle cx="200" cy="155" r="8" fill="white" opacity="0.7" />
      <circle cx="240" cy="148" r="10" fill="white" opacity="0.8" />
      <circle cx="280" cy="168" r="8" fill="white" opacity="0.6" />
      <circle cx="300" cy="200" r="10" fill="white" opacity="0.8" />
      <circle cx="290" cy="240" r="12" fill="white" opacity="0.9" />
      <circle cx="260" cy="260" r="10" fill="white" opacity="0.7" />
      <circle cx="230" cy="275" r="8" fill="white" opacity="0.6" />
      <circle cx="200" cy="300" r="10" fill="white" opacity="0.8" />
      <circle cx="220" cy="310" r="7" fill="white" opacity="0.5" />

      {/* Sparkle */}
      <path
        d="M350 130L355 145L370 150L355 155L350 170L345 155L330 150L345 145Z"
        fill="white"
        opacity="0.6"
      />
    </svg>
  );
}
