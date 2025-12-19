/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#d9e2ff',
          200: '#bccaff',
          300: '#8fa8ff',
          400: '#647eff',
          500: '#485eff',
          600: '#3541ff',
          700: '#2a31eb',
          800: '#2529be',
          900: '#252a97',
          950: '#151759',
        },
        slate: {
          950: '#020617',
        }
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}