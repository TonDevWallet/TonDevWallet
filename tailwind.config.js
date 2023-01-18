// const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  mode: 'jit',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Mulish', 'Open Sans', 'sans-serif'],
      },

      colors: {
        // accent: '#34495e',
        accent: 'var(--color-accent)',
        highlight: '#0088CC',
        white: '#ffffff',
        'foreground-element': 'rgb(var(--color-foreground-rgb) / <alpha-value>)',
      },
    },
  },
  variants: {},
  plugins: [],
}
