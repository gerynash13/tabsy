import type { Config } from 'tailwindcss'

// Brand tokens from the Tabsy brand kit: ledger green (primary),
// paper (background), ink (text), overdue red (status only — nowhere else),
// tabAccent green (the wordmark mark + "paid" states).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ledger: '#1D4B41',
        paper: '#F5F6F1',
        ink: '#16211D',
        overdue: '#A32D2D',
        tabAccent: '#639922',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'var(--font-sans-jp)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
