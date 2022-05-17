// const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  mode: 'jit',
  purge: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Mulish', 'Open Sans', 'sans-serif'],
      },

      colors: {
        accent: '#34495e',
        highlight: '#0088CC',
        white: '#ffffff',
      },
    },
  },
  variants: {},
  plugins: [],
}
