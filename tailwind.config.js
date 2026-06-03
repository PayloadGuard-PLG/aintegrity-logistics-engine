/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg:      '#0f1117',
        surface: '#1a1d27',
        accent:  '#6366f1',
        gain:    '#22c55e',
        warn:    '#f59e0b',
        muted:   '#e2e8f0',
      },
    },
  },
  plugins: [],
};
