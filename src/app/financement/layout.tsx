import Link from 'next/link'
import { utilisateurCourant } from '@/lib/financement/auth'
import Deconnexion from './Deconnexion'

export const dynamic = 'force-dynamic'

const LIBELLE_ROLE = { ADMIN: 'Administrateur', ASSISTANTE: 'Assistante', COMMERCIAL: 'Commercial' } as const

export default async function LayoutFinancement({ children }: { children: React.ReactNode }) {
  const u = await utilisateurCourant()
  return (
    <div className="min-h-screen bg-gray-50">
      {u && (
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link href="/financement" className="flex items-center gap-2 font-bold text-gray-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/levad-logo.png" alt="LEVAD" className="h-8 w-auto" />
              <span className="sr-only">Financements LEVAD</span>
            </Link>
            {!u.doitChangerMotDePasse && <Link href="/financement" className="text-gray-600 hover:text-gray-900">Demandes</Link>}
            {!u.doitChangerMotDePasse && <Link href="/financement/contrats" className="text-gray-600 hover:text-gray-900">Contrats</Link>}
            {!u.doitChangerMotDePasse && u.role === 'ADMIN' && <Link href="/financement/admin" className="text-gray-600 hover:text-gray-900">Administration</Link>}
            <span className="ml-auto text-gray-500">{u.prenom} {u.nom} · {LIBELLE_ROLE[u.role]}</span>
            <Link href="/financement/mot-de-passe" className="text-gray-600 hover:text-gray-900">Mot de passe</Link>
            <Deconnexion />
          </div>
        </header>
      )}
      {children}
    </div>
  )
}
