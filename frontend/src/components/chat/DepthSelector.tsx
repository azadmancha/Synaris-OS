'use client';

export type Depth = 'quick' | 'balanced' | 'deep_dive' | 'expert';

const DEPTH_OPTIONS: { value: Depth; label: string; icon: string; desc: string }[] = [
  { value: 'quick', label: 'Quick', icon: '⚡', desc: 'Brief overview' },
  { value: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'Standard depth' },
  { value: 'deep_dive', label: 'Deep Dive', icon: '🔬', desc: 'Comprehensive' },
  { value: 'expert', label: 'Expert', icon: '🧠', desc: 'Advanced level' },
];

interface DepthSelectorProps {
  depth: Depth;
  onChange: (depth: Depth) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function DepthSelector({ depth, onChange, disabled, size = 'sm' }: DepthSelectorProps) {
  return (
    <div
      className={`inline-flex rounded-xl border border-gray-700/50 bg-[#1a1d2e]/80 p-1 ${
        size === 'md' ? 'gap-1' : ''
      }`}
    >
      {DEPTH_OPTIONS.map((d) => {
        const isActive = depth === d.value;
        return (
          <button
            key={d.value}
            onClick={() => onChange(d.value)}
            disabled={disabled}
            title={d.desc}
            className={`rounded-lg font-medium transition-all duration-200 ${
              size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
            } ${
              isActive
                ? 'bg-gradient-to-r from-synapse-neon-blue to-indigo-600 text-white shadow-glow-sm'
                : 'text-gray-500 hover:text-gray-300'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className={isActive ? '' : 'opacity-50'}>{d.icon}</span>
            <span className="ml-1.5">{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}
