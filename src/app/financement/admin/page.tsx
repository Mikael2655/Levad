import Link from 'next/link'
import { exigerUtilisateur } from '@/lib/financement/garde'

export const dynamic = 'force-dynamic'

const RUBRIQUES = [
  { href: '/financement/admin/utilisateurs', titre: 'Utilisateurs', texte: 'Créer les comptes, choisir les rôles, réinitialiser un mot de passe.' },
  { href: '/financement/admin/financeurs', titre: 'Financeurs', texte: 'Paramètres de chaque financeur (majoration mensuelle, commission, connecteur).' },
  { href: '/financement/admin/grenke', titre: 'Connexion Grenke', texte: 'État de la liaison avec l’API Grenke, essais en lecture seule, aperçu des demandes.' },
  { href: '/financement/admin/grilles', titre: 'Barèmes', texte: 'Barème réel du financeur, barème commun des commerciaux, barèmes propres à un commercial.' },
]

export default async function AdminAccueil() {
  await exigerUtilisateur({ roles: ['ADMIN'] })
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Administration</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {RUBRIQUES.map(r => (
          <Link key={r.href} href={r.href} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-brand-800">
            <p className="font-semibold text-gray-900">{r.titre}</p>
            <p className="text-sm text-gray-500 mt-1">{r.texte}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
