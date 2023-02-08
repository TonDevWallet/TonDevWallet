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
        foreground: 'rgb(var(--color-foreground-rgb) / <alpha-value>)',
        background: 'rgb(var(--color-background-rgb) / <alpha-value>)',
        // 'accent-light': 'var(--color-accent-light)',
        'accent-light': 'rgb(var(--color-accent-light-rgb) / <alpha-value>)',
      },

      opacity: {
        15: '.15',
      },
    },
  },
  variants: {},
  plugins: [],
}
