import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'monospace']
      },
      colors: {
        ink: '#162026',
        muted: '#64727d',
        line: '#d9e1e7',
        panel: '#ffffff',
        mist: '#f5f8fa',
        accent: '#0c9ca6',
        accentDark: '#05747d',
        warn: '#b7791f',
        danger: '#c2413b'
      },
      boxShadow: {
        soft: '0 12px 32px rgba(22, 32, 38, 0.08)'
      }
    }
  },
  plugins: []
} satisfies Config;
