/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ─── Paleta oficial ANK Data ──────────────────────────────────────
        ank: {
          50:      '#eef4fb',
          100:     '#dae8f6',
          200:     '#bcd3ee',
          300:     '#91b7e2',
          400:     '#6699d4',
          500:     '#5086c6',   // ← COR PRIMÁRIA OFICIAL
          600:     '#3e6eb3',
          700:     '#325a96',
          800:     '#2b4b7a',
          900:     '#274065',
          950:     '#1b2b44',
          // Cores de marca adicionais
          dark:    '#32343A',   // ← DARK (sidebar, textos)
          neutral: '#E5E5E5',   // ← NEUTRO (backgrounds, separadores)
        },
        // ─── Cores dinâmicas da franquia (White Label — Spec 11) ──────────
        'fp': {
          DEFAULT: 'var(--fp-primary, #5086c6)',
          light:   'var(--fp-primary-light, #6699d4)',
          dark:    'var(--fp-primary-dark, #3e6eb3)',
        },
        'fs': {
          DEFAULT: 'var(--fp-secondary, #32343A)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
