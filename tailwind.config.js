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
        glass: {
          light: 'rgba(255, 255, 255, 0.45)',
          'light-solid': 'rgba(255, 255, 255, 0.75)',
          dark: 'rgba(15, 23, 42, 0.55)',
          'dark-solid': 'rgba(15, 23, 42, 0.85)',
          border: 'rgba(255, 255, 255, 0.18)',
          'border-dark': 'rgba(255, 255, 255, 0.08)',
        },
        theme: {
          indigo: {
            from: '#1e1b4b',
            via: '#312e81',
            to: '#0f172a',
            accent: '#6366f1',
            glow: 'rgba(99, 102, 241, 0.35)',
          },
          emerald: {
            from: '#064e3b',
            via: '#065f46',
            to: '#022c22',
            accent: '#10b981',
            glow: 'rgba(16, 185, 129, 0.35)',
          },
          midnight: {
            from: '#0c1938',
            via: '#172554',
            to: '#030712',
            accent: '#38bdf8',
            glow: 'rgba(56, 189, 248, 0.35)',
          },
          violet: {
            from: '#3b0764',
            via: '#581c87',
            to: '#18022b',
            accent: '#d946ef',
            glow: 'rgba(217, 70, 239, 0.35)',
          },
        }
      },
      boxShadow: {
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.22), inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
        'glass-lg': '0 16px 48px 0 rgba(0, 0, 0, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)',
        'glass-glow': '0 0 25px -5px var(--tw-shadow-color, rgba(99, 102, 241, 0.4))',
        'glass-glow-lg': '0 0 45px -5px var(--tw-shadow-color, rgba(99, 102, 241, 0.55))',
      },
      backdropBlur: {
        'xs': '2px',
        '3xl': '32px',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 12s ease infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        }
      }
    },
  },
  plugins: [],
}
