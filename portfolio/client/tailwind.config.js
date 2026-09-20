/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#090a0d',
          subtle: '#0d0f14',
        },
        surface: {
          DEFAULT: '#111317',
          subtle: '#15171d',
          elevated: '#1a1d24',
          highlight: '#20242d',
        },
        card: '#13151b',
        border: {
          DEFAULT: '#1e222b',
          subtle: '#181b22',
          hover: '#2f3442',
          active: '#3d4457',
        },
        ochre: {
          50: '#fdfbf7',
          100: '#f9f3e6',
          200: '#f2e5c6',
          300: '#e6c88b',
          400: '#d9943b',
          500: '#c27e28',
          600: '#a3631d',
          DEFAULT: '#d9943b',
        },
        accent: {
          DEFAULT: '#d9943b',
          300: '#e6c88b',
          400: '#d9943b',
          500: '#c27e28',
          600: '#a3631d',
        },
        mint: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          950: '#022c22',
          DEFAULT: '#30c283',
        },
        signal: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          950: '#431407',
          DEFAULT: '#f97316',
        },
        text: {
          primary: '#f4f5f8',
          secondary: '#9ea3b5',
          muted: '#656b82',
          metadata: '#555b70',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'Cambria', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.025em',
        tight: '-0.015em',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(to right, #1e222b 1px, transparent 1px), linear-gradient(to bottom, #1e222b 1px, transparent 1px)',
        'dots-pattern': 'radial-gradient(circle, #1e222b 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-pattern': '32px 32px',
        'dots-pattern': '16px 16px',
      },
    },
  },
  plugins: [],
}
