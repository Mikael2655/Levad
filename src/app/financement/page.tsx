import { redirect } from 'next/navigation'
import { utilisateurCourant } from '@/lib/financement/auth'
import { listerDemandes } from '@/lib/financement/acces'

export const dynamic = 'force-dynamic'

const LIBELLE_ROLE = { ADMIN: 'Administrateur', ASSISTANTE: 'Assistante', COMMERCIAL: 'Commercial' } as const

// Page d'accueil provisoire : prouve la connexion et le filtrage par rôle. Le tableau de bord complet vient à l'étape 3.
export default async function AccueilFinancement() {
  const u = await utilisateurCourant()
  if (!u) redirect('/financement/connexion')
  const demandes = await listerDemandes(u)
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-3">
      <h1 className="text-xl font-bold text-gray-900">Financements LEVAD</h1>
      <p className="text-sm text-gray-600">
        Connecté : {u.prenom} {u.nom} — {LIBELLE_ROLE[u.role]}
      </p>
      <p className="text-sm text-gray-600">{demandes.length} demande(s) visible(s) pour vous.</p>
    </main>
  )
}
