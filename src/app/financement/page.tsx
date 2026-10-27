import { listerDemandes } from '@/lib/financement/acces'
import { exigerUtilisateur } from '@/lib/financement/garde'

export const dynamic = 'force-dynamic'

// Page d'accueil provisoire : le tableau de bord complet vient à l'étape 3.
export default async function AccueilFinancement() {
  const u = await exigerUtilisateur()
  const demandes = await listerDemandes(u)
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-3">
      <h1 className="text-xl font-bold text-gray-900">Bonjour {u.prenom}</h1>
      <p className="text-sm text-gray-600">{demandes.length} demande(s) visible(s) pour vous.</p>
    </main>
  )
}
