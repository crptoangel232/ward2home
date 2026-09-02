/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sea: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#2E8B57',
          600: '#25794a',
          700: '#1e6b3f',
          800: '#185a35',
          900: '#134d2e',
        },
      },
    },
  },
  plugins: [],
}
