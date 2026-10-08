import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connecte } from '@/lib/connect/auth'
import { VERT } from '@/components/connect/affichage'
import { clientsEnAlerte } from '@/lib/connect/alertes'
import { Menu } from '@/components/connect/Menu'
import { clientsDeconnectes } from '@/lib/connect/connexion'
import { RafraichissementAuto } from '@/components/connect/RafraichissementAuto'

export const metadata: Metadata = {
  title: 'Levad Connect',
  applicationName: 'Levad Connect',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Levad Connect', statusBarStyle: 'default' },
  robots: { index: false, follow: false },
  icons: { icon: '/icon.png', apple: '/apple-touch-icon.png' },
}

export const dynamic = 'force-dynamic'

export default async function PriveLayout({ children }: { children: React.ReactNode }) {
  if (!connecte()) redirect('/parc/connexion')
  let nbAlertes = 0
  let nbDeconnectes = 0
  try {
    nbAlertes = (await clientsEnAlerte()).length
    nbDeconnectes = (await clientsDeconnectes()).length
  } catch {
    // base pas encore prête : la page concernée l'expliquera
  }
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3">
          <Link href="/parc" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/levad-logo.png" alt="LEVAD" className="h-9 w-auto" />
            <span className="text-lg font-semibold text-gray-700">Connect</span>
          </Link>
          <div className="order-3 w-full md:order-none md:w-auto">
            <Menu
              entrees={[
                { href: '/parc', titre: 'Synthèse' },
                { href: '/parc/alertes', titre: 'Alerte encre', badge: nbAlertes },
                { href: '/parc/deconnexions', titre: 'Alerte déconnexion', badge: nbDeconnectes },
                { href: '/parc/stocks', titre: 'Stocks' },
                { href: '/parc/connexions', titre: 'Connexions' },
              ]}
            />
          </div>
          <div className="flex items-center gap-3 text-xs sm:gap-4 sm:text-sm">
            <RafraichissementAuto />
            <form action="/api/parc/deconnexion" method="post">
              <button className="text-gray-500 hover:text-gray-900">Se déconnecter</button>
            </form>
          </div>
        </div>
        <div className="h-1" style={{ backgroundColor: VERT }} />
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6 sm:py-8">{children}</main>
    </div>
  )
}
