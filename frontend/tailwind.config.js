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
        dala: {
          black: '#000000',
          surface: '#080808',
          card: '#0A0A0A',
          cardHover: '#111111',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(255, 255, 255, 0.18)',
          violet: '#8052FF',
          violetHover: '#6E3EF0',
          violetLight: '#9A75FF',
          violetSubtle: 'rgba(128, 82, 255, 0.12)',
          gold: '#FFB829',
          goldSubtle: 'rgba(255, 184, 41, 0.12)',
          green: '#15846E',
          greenSubtle: 'rgba(21, 132, 110, 0.15)',
          text: '#FFFFFF',
          muted: '#9A9A9A',
          sub: '#BDBDBD',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8052FF', // Dala Primary Accent
          600: '#6E3EF0',
          700: '#5B21B6',
          800: '#4C1D95',
          900: '#2E1065',
          950: '#000000',
        },
        accent: {
          light: '#9A75FF',
          DEFAULT: '#8052FF',
          dark: '#6E3EF0',
          glow: 'rgba(128, 82, 255, 0.25)',
        },
        surface: {
          dark: '#000000',
          cardDark: '#0A0A0A',
          borderDark: 'rgba(255, 255, 255, 0.08)',
          hoverDark: '#121212',
          light: '#f8fafc',
          cardLight: '#ffffff',
          borderLight: '#e2e8f0',
          hoverLight: '#f1f5f9',
        }
      },
      borderRadius: {
        'card': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 8s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
