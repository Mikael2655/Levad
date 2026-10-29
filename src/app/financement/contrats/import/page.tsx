import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { exigerUtilisateur } from '@/lib/financement/garde'
import ImportContrats from './ImportContrats'

export const dynamic = 'force-dynamic'

export default async function PageImport() {
  await exigerUtilisateur({ roles: ['ADMIN', 'ASSISTANTE'] })
  const financeurs = (await listerFinanceurs()).filter(f => f.actif)
  const commerciaux = (await listerUtilisateurs()).filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN'))
  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Importer des contrats existants</h1>
      <ImportContrats financeurs={financeurs.map(f => ({ id: f.id, nom: f.nom }))} commerciaux={commerciaux.map(c => ({ id: c.id, nom: `${c.prenom} ${c.nom}` }))} />
    </main>
  )
}
