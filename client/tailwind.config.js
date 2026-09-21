/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        zinc: {
          50: '#f4f5f7',
          100: '#e4e4e7',
          200: '#d4d4d8',
          300: '#a1a1aa',
          400: '#71717a',
          500: '#52525b',
          600: '#3f3f46',
          700: '#27272a',
          800: '#1c1c1f',
          900: '#0a0a0b',
          950: '#000000',
        },
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        '2xs': '0 1px 2px -1px rgba(0, 0, 0, 0.03), 0 1px 1px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 1px 2px 0 rgba(0, 0, 0, 0.02), 0 1px 2px -1px rgba(0, 0, 0, 0.02), 0 2px 6px -2px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 8px 20px -6px rgba(0, 0, 0, 0.05), 0 2px 6px -2px rgba(0, 0, 0, 0.02)',
        'modal': '0 20px 40px -12px rgba(0, 0, 0, 0.18), 0 4px 12px -4px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'card': '14px',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
