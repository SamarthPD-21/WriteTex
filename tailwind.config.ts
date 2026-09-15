import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#1e1e2e',
          secondary: '#252537',
          tertiary: '#2d2d44',
          hover: '#363652',
        },
        accent: {
          DEFAULT: '#7c5cfc',
          hover: '#6a4de8',
          light: '#9b82fd',
          muted: 'rgba(124, 92, 252, 0.15)',
        },
        text: {
          primary: '#e4e4ef',
          secondary: '#9595b0',
          muted: '#636384',
        },
        diff: {
          addBg: '#133524',
          addText: '#4ade80',
          addBorder: '#1e5e3a',
          delBg: '#3a171c',
          delText: '#f87171',
          delBorder: '#64222a',
        },
        border: {
          subtle: '#2d2d44',
          DEFAULT: '#3d3d5c',
          focus: '#7c5cfc',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        panel: '0 12px 40px -4px rgba(0, 0, 0, 0.65), 0 4px 16px -2px rgba(0, 0, 0, 0.4)',
        fab: '0 4px 20px rgba(124, 92, 252, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
        fabHover: '0 6px 28px rgba(124, 92, 252, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
    },
  },
  plugins: [],
};

export default config;
