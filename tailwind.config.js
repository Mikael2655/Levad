/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Outil de financement : vert du logo LEVAD (#7b9980 = leasing-400)
        leasing: {
          50: '#f4f7f4', 100: '#e7eee8', 200: '#cfddd1', 300: '#a9c1ad', 400: '#7b9980',
          500: '#5f7f66', 600: '#4b6a53', 700: '#3d5745', 800: '#31473a', 900: '#26382d',
        },
        // Style « convivial » : couleur vive des boutons importants et fond doux et chaud
        accent: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#0a9a68', 700: '#08865a', 800: '#066b48' },
        sable: { 50: '#faf8f4', 100: '#f4f1ea', 200: '#e9e4d8' },
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
