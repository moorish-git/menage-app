/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#e8edff',
          500: '#5a6cff',
          600: '#4a5cf0',
          700: '#3a4cd8',
        },
      },
    },
  },
  plugins: [],
};
