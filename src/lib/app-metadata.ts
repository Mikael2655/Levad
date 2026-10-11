import type { Metadata, Viewport } from 'next'

// Icônes, manifeste (ajout à l'écran d'accueil) et titre de l'outil social.
// Appliqué à /social et /login uniquement : la page /telecharger garde sa propre identité.
export const appMetadata: Metadata = {
  title: 'Levad Social',
  description: 'Gestion des publications sur les réseaux sociaux',
  manifest: '/social-manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/levad-tab.ico', sizes: 'any' },
      { url: '/icons/levad-tab-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/levad-tab-64.png', type: 'image/png', sizes: '64x64' },
    ],
    apple: [{ url: '/icons/social-apple-touch-icon.png?v=4', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'Levad Social', statusBarStyle: 'default' },
}

export const appViewport: Viewport = {
  themeColor: '#1e3a5f',
}
