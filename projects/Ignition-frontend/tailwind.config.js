/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic surface tokens
        'surface': {
          DEFAULT: '#ffffff',
          secondary: '#f7f7f8',
          tertiary: '#efefef',
          dark: '#171717',
          'dark-secondary': '#1e1e1e',
          'dark-tertiary': '#262626',
        },
        // Semantic content tokens
        'content': {
          DEFAULT: '#1a1a1a',
          secondary: '#6b6b6b',
          tertiary: '#999999',
          inverse: '#ffffff',
          'dark': '#f0f0f0',
          'dark-secondary': '#a0a0a0',
          'dark-tertiary': '#666666',
        },
        // Border tokens
        'border': {
          DEFAULT: '#e5e5e5',
          dark: '#333333',
        },
        // Flat accent colors (no nesting, compatible with @apply + opacity)
        'accent-green': '#5eead4',
        'accent-purple': '#8B5CF6',
        'accent-orange': '#F59E0B',
        'accent-red': '#EF4444',
        // Legacy terminal colors
        'terminal-bg': '#0A0A0A',
        'terminal-surface': '#111111',
        'terminal-border': '#1A1A1A',
        'terminal-green': '#00FFA3',
        'terminal-green-dim': '#00FFA333',
        'terminal-teal': '#00D4AA',
        'terminal-yellow': '#FFD93D',
        'terminal-red': '#FF4444',
        'terminal-dim': '#4A4A4A',
        'terminal-muted': '#666666',
        'terminal-text': '#E0E0E0',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
