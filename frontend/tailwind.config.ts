import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Synaris brand palette — Dark-Sleek / Neon-Tech
        synapse: {
          blue: '#3B82F6',
          'blue-dark': '#1E40AF',
          cyan: '#06B6D4',
          'cyan-light': '#22D3EE',
          violet: '#8B5CF6',
          'violet-light': '#A78BFA',
          indigo: '#6366F1',
          slate: '#1E293B',
          'slate-light': '#334155',
          // Neon accents
          neon: {
            blue: '#00D4FF',
            purple: '#A855F7',
            pink: '#EC4899',
            cyan: '#22D3EE',
            green: '#10B981',
            amber: '#F59E0B',
            red: '#EF4444',
          },
        },
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          hover: 'var(--surface-hover)',
          card: 'var(--glass-bg)',
          'card-hover': '#222640',
          glass: 'var(--glass-bg)',
        },
      },
      fontFamily: {
        ui: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        content: ['Georgia', 'Times New Roman', 'serif'],
        code: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.3), 0 0 40px rgba(236, 72, 153, 0.1)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.1)',
        'glow-sm': '0 0 10px rgba(0, 212, 255, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
        'neon-sm': '0 0 6px rgba(0, 212, 255, 0.4)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'pulse-cursor': 'pulse-cursor 1s ease-in-out infinite',
        'message-in': 'message-slide-in 300ms ease-out',
        'fade-in': 'fade-in 200ms ease-out',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-medium': 'float 4s ease-in-out infinite',
        'float-fast': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'glow-pulse-fast': 'glow-pulse 1.2s ease-in-out infinite',
        'scale-in': 'scale-in 400ms ease-out forwards',
        'slide-up': 'slide-up 400ms ease-out',
        'slide-up-sm': 'slide-up 250ms ease-out',
        'slide-down': 'slide-down 300ms ease-out',
        'count-up': 'fade-in 500ms ease-out',
        'orb-drift': 'orb-drift 8s ease-in-out infinite',
        'card-enter': 'card-enter 400ms ease-out forwards',
        'neon-flicker': 'neon-flicker 3s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'typewriter': 'typewriter 2s steps(40) forwards',
        'blink': 'blink 1s step-end infinite',
        'float-card': 'float-card 3s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'pulse-cursor': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'message-slide-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(5px) rotate(-1deg)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2)' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'orb-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(30px, -20px) scale(1.1)' },
          '50%': { transform: 'translate(-20px, 10px) scale(0.9)' },
          '75%': { transform: 'translate(15px, 25px) scale(1.05)' },
        },
        'card-enter': {
          from: { transform: 'translateY(16px) scale(0.97)', opacity: '0' },
          to: { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'neon-flicker': {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.8' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.9' },
          '97%': { opacity: '1' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        typewriter: {
          from: { width: '0' },
          to: { width: '100%' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'float-card': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
