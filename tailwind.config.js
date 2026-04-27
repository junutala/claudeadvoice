/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
      colors: {
        navy: {
          50:  '#f0f4f9',
          100: '#d9e5f3',
          200: '#b3cbe7',
          300: '#7aaad4',
          400: '#4a85be',
          500: '#2c6499',
          600: '#2c4a6e',
          700: '#1e3550',
          800: '#142338',
          900: '#0c1622',
        },
        gold: {
          50:  '#faf6ee',
          100: '#f2e8d0',
          200: '#e5d0a1',
          300: '#d4b06a',
          400: '#c4923e',
          500: '#8a6e3e',
          600: '#6b5230',
          700: '#4e3b22',
          800: '#332615',
          900: '#1a130a',
        },
      },
    },
  },
  plugins: [],
}
