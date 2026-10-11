import type { Metadata, Viewport } from 'next'

// Icônes, manifeste (ajout à l'écran d'accueil) et titre de Levad Connect.
// Appliqué aux pages /parc uniquement ; l'outil social garde les siens (src/lib/app-metadata.ts).
const ICONES: Metadata['icons'] = {
  icon: [
    { url: '/icons/connect-tab.ico', sizes: 'any' },
    { url: '/icons/connect-tab-32.png', type: 'image/png', sizes: '32x32' },
    { url: '/icons/connect-tab-64.png', type: 'image/png', sizes: '64x64' },
  ],
  apple: [{ url: '/icons/connect-apple-touch-icon.png', sizes: '180x180' }],
}

export const connectMetadata: Metadata = {
  title: 'Levad Connect',
  applicationName: 'Levad Connect',
  manifest: '/connect-manifest.webmanifest',
  icons: ICONES,
  appleWebApp: { capable: true, title: 'Levad Connect', statusBarStyle: 'default' },
  robots: { index: false, follow: false },
}

// Pages de téléchargement : mêmes icônes d'onglet, sans manifeste ni raccourci d'application.
export const iconesConnect = ICONES

export const connectViewport: Viewport = { themeColor: '#8c9e8b' }
