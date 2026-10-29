import type { Metadata, Viewport } from 'next'

// Titre, icônes et manifeste (ajout à l'écran d'accueil de l'iPhone) de l'outil de financement : « Leasing ».
// Appliqué à toutes les pages /financement, page de connexion comprise (c'est souvent de là qu'on ajoute le raccourci).
export const metadataFinancement: Metadata = {
  title: 'Financements LEVAD',
  description: 'Demandes de location financière et contrats LEVAD',
  manifest: '/leasing-manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/leasing-tab-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/leasing-tab-64.png', type: 'image/png', sizes: '64x64' },
    ],
    apple: [{ url: '/icons/leasing-apple-touch-icon.png', sizes: '180x180' }],
  },
  // nom sous l'icône quand on ajoute le site à l'écran d'accueil
  appleWebApp: { capable: true, title: 'Leasing', statusBarStyle: 'default' },
}

export const viewportFinancement: Viewport = { themeColor: '#8c9e8b' }
