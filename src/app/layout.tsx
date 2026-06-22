import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Levad - Solutions Impression, Téléphonie, Informatique & GED',
  description: 'Levad, votre partenaire pour les systèmes d\'impression, téléphonie, informatique, réseau et gestion électronique de documents.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
