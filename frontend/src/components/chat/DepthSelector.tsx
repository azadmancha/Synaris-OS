'use client';

export type Depth = 'quick' | 'balanced' | 'deep_dive' | 'expert';

const DEPTH_OPTIONS: { value: Depth; label: string }[] = [
  { value: 'quick', label: '⚡ Quick' },
  { value: 'balanced', label: '⚖️ Balanced' },
  { value: 'deep_dive', label: '🔬 Deep Dive' },
  { value: 'expert', label: '🧠 Expert' },
];

interface DepthSelectorProps {
  depth: Depth;
  onChange: (depth: Depth) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function DepthSelector({ depth, onChange, disabled, size = 'sm' }: DepthSelectorProps) {
  return (
    <div className={`inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700 ${size === 'md' ? 'gap-1' : ''}`}>
      {DEPTH_OPTIONS.map((d) => (
        <button
          key={d.value}
          onClick={() => onChange(d.value)}
          disabled={disabled}
          className={`rounded-lg font-medium transition-all ${
            size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
          } ${
            depth === d.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
