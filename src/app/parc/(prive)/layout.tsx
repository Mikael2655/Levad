import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connecte } from '@/lib/connect/auth'
import { VERT } from '@/components/connect/affichage'
import { clientsEnAlerte } from '@/lib/connect/alertes'

export const metadata: Metadata = {
  title: 'Levad Connect — Parc',
  robots: { index: false, follow: false },
  icons: { icon: '/icon.png' },
}

export const dynamic = 'force-dynamic'

export default async function PriveLayout({ children }: { children: React.ReactNode }) {
  if (!connecte()) redirect('/parc/connexion')
  let nbAlertes = 0
  try {
    nbAlertes = (await clientsEnAlerte()).length
  } catch {
    // base pas encore prête : la page concernée l'expliquera
  }
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/parc" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/levad-logo.png" alt="LEVAD" className="h-9 w-auto" />
            <span className="text-lg font-semibold text-gray-700">Connect</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/parc" className="hover:text-gray-900">Parc</Link>
            <Link href="/parc/alertes" className="flex items-center gap-1.5 hover:text-gray-900">
              Alertes
              {nbAlertes > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{nbAlertes}</span>
              )}
            </Link>
            <Link href="/parc/stocks" className="hover:text-gray-900">Stocks</Link>
            <Link href="/parc/connexions" className="hover:text-gray-900">Connexions</Link>
          </nav>
          <form action="/api/parc/deconnexion" method="post">
            <button className="text-sm text-gray-500 hover:text-gray-900">Se déconnecter</button>
          </form>
        </div>
        <div className="h-1" style={{ backgroundColor: VERT }} />
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  )
}
