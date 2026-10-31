import Link from 'next/link'
import { utilisateurCourant } from '@/lib/financement/auth'
import { metadataFinancement, viewportFinancement } from '@/lib/financement/metadata'
import MenuPrincipal from './MenuPrincipal'
import MenuProfil from './MenuProfil'

export const dynamic = 'force-dynamic'

export const metadata = metadataFinancement
export const viewport = viewportFinancement

const LIBELLE_ROLE = { ADMIN: 'Administrateur', ASSISTANTE: 'Assistante', COMMERCIAL: 'Commercial' } as const

export default async function LayoutFinancement({ children }: { children: React.ReactNode }) {
  const u = await utilisateurCourant()
  return (
    <div className="min-h-screen bg-gray-50">
      {u && (
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-0 flex flex-wrap items-center gap-x-10 gap-y-1 text-sm">
            <Link href="/financement" className="flex items-center gap-2 font-bold text-gray-900 order-1 md:order-none py-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/levad-logo.png" alt="LEVAD" className="h-8 w-auto" />
              <span className="sr-only">Financements LEVAD</span>
            </Link>
            {!u.doitChangerMotDePasse && <MenuPrincipal admin={u.role === 'ADMIN'} />}
            <MenuProfil prenom={u.prenom} nom={u.nom} email={u.email} role={LIBELLE_ROLE[u.role]} />
          </div>
        </header>
      )}
      {children}
    </div>
  )
}
