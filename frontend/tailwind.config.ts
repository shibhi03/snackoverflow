import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/context/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#09090B',
          900: '#18181B',
          800: '#27272A',
          700: '#3F3F46',
        },
        obsidian: {
          950: '#09090B',
          900: '#18181B',
          800: '#272727',
          700: '#3F3F46',
          600: '#52525B',
        },
        pantry: {
          bg: 'var(--pantry-bg)',
          surface: 'var(--pantry-surface)',
          elevated: 'var(--pantry-elevated)',
          border: 'var(--pantry-border)',
          subtle: 'var(--pantry-subtle)',
          text: 'var(--pantry-text)',
          muted: 'var(--pantry-muted)',
        },
        coral: {
          DEFAULT: '#FD3A25',
          hover: '#EA2B16',
          bright: '#FF3B26',
          soft: '#FFF1EF',
        },
        amber: {
          DEFAULT: '#F59E0B',
          soft: '#FEF3C7',
          dark: '#B45309',
        },
        stock: {
          green: '#16A34A',
          greenBg: '#DCFCE7',
          greenBorder: '#86EFAC',
          amber: '#D97706',
          amberBg: '#FEF3C7',
          amberBorder: '#FCD34D',
          red: '#DC2626',
          redBg: '#FEE2E2',
          redBorder: '#FCA5A5',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Urbanist', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Share Tech Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
