import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Thème clair : "pitch" sert de gamme de gris (fond gris très clair,
        // cartes blanches, textes foncés) et "gold" est désormais du bleu.
        pitch: {
          50: '#0f172a', // texte quasi noir
          100: '#1e293b', // liens de nav
          200: '#334155', // libellés
          300: '#475569', // texte secondaire
          400: '#64748b', // texte discret
          500: '#94a3b8',
          600: '#cbd5e1', // étoile favori vide
          700: '#cbd5e1', // bordures d'input
          800: '#e2e8f0', // badges, survols, bordures
          900: '#ffffff', // cartes, en-tête
          950: '#f1f5f9', // fond de page, fond d'input
        },
        gold: {
          400: '#3b82f6', // bleu clair (accents, survol)
          500: '#2563eb', // bleu (boutons, accents)
        },
      },
    },
  },
  plugins: [],
}
export default config
