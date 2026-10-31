import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { exigerUtilisateur } from '@/lib/financement/garde'
import ListeFinanceurs from './ListeFinanceurs'
import RetourAdmin from '../RetourAdmin'

export const dynamic = 'force-dynamic'

export default async function PageFinanceurs() {
  await exigerUtilisateur({ roles: ['ADMIN'] })
  const [financeurs, utilisateurs] = await Promise.all([listerFinanceurs(), listerUtilisateurs()])
  const destinataires = utilisateurs.filter(x => x.actif && (x.role === 'ADMIN' || x.role === 'ASSISTANTE')).map(x => ({ id: x.id, nom: `${x.prenom} ${x.nom}` }))
  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
      <RetourAdmin />
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Financeurs</h1>
      <ListeFinanceurs financeurs={financeurs} destinataires={destinataires} />
    </main>
  )
}
