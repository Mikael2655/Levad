/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      boxShadow: {
        card: '0 1px 2px rgba(60,50,20,0.04), 0 8px 24px -12px rgba(60,50,20,0.10)',
        pop: '0 6px 20px -6px rgba(38,56,45,0.35)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { 'fade-up': 'fade-up 0.35s ease-out both' },
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
