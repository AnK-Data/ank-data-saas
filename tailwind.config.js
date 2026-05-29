/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ank: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Cores dinâmicas da franquia (White Label — Spec 11)
      colors: {
        'fp': {
          DEFAULT: 'var(--fp-primary, #2563eb)',
          light:   'var(--fp-primary-light, #3b82f6)',
          dark:    'var(--fp-primary-dark, #1d4ed8)',
        },
        'fs': {
          DEFAULT: 'var(--fp-secondary, #06b6d4)',
        },
      },
    },
  },
  plugins: [],
}
