// const defaultTheme = require('tailwindcss/defaultTheme')

export default {
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
        'window-background': 'var(--color-window-background)',
      },

      opacity: {
        15: '.15',
      },

      keyframes: {
        appear: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  variants: {},
  plugins: [],
}
