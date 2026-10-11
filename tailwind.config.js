/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          700: '#1a4f8a',
          800: '#1e3a5f',
          900: '#162d4a',
        },
      },
    },
  },
  plugins: [],
}
