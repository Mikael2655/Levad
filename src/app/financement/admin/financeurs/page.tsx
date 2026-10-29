import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { exigerUtilisateur } from '@/lib/financement/garde'
import ListeFinanceurs from './ListeFinanceurs'

export const dynamic = 'force-dynamic'

export default async function PageFinanceurs() {
  await exigerUtilisateur({ roles: ['ADMIN'] })
  const [financeurs, utilisateurs] = await Promise.all([listerFinanceurs(), listerUtilisateurs()])
  const destinataires = utilisateurs.filter(x => x.actif && (x.role === 'ADMIN' || x.role === 'ASSISTANTE')).map(x => ({ id: x.id, nom: `${x.prenom} ${x.nom}` }))
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Financeurs</h1>
      <ListeFinanceurs financeurs={financeurs} destinataires={destinataires} />
    </main>
  )
}
