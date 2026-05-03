/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        sketch: ['Caveat', 'cursive'],
      },
      colors: {
        canvas: {
          900: '#1a1a2e',
          800: '#16213e',
          700: '#0f3460',
          600: '#1a2744',
          500: '#1e2d4a',
        },
        teal: {
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        note: {
          bg: '#1e2d40',
          border: '#2a3f5a',
          hover: '#243450',
        },
      },
    },
  },
  plugins: [],
};
