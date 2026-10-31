import { listerUtilisateurs } from '@/lib/financement/admin'
import { exigerUtilisateur } from '@/lib/financement/garde'
import TableUtilisateurs from './TableUtilisateurs'
import RetourAdmin from '../RetourAdmin'

export const dynamic = 'force-dynamic'

export default async function PageUtilisateurs() {
  const moi = await exigerUtilisateur({ roles: ['ADMIN'] })
  const utilisateurs = await listerUtilisateurs()
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <RetourAdmin />
      <h1 className="text-xl font-semibold text-gray-900">Utilisateurs</h1>
      <TableUtilisateurs moiId={moi.id} utilisateurs={utilisateurs.map(u => ({ ...u, creeLe: u.creeLe.toISOString() }))} />
    </main>
  )
}
