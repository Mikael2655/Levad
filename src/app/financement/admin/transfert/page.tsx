import { listerUtilisateurs } from '@/lib/financement/admin'
import { exigerUtilisateur } from '@/lib/financement/garde'
import FormulaireTransfert from './FormulaireTransfert'

export const dynamic = 'force-dynamic'

export default async function PageTransfert() {
  await exigerUtilisateur({ roles: ['ADMIN'] })
  const utilisateurs = await listerUtilisateurs()
  const nom = (x: { prenom: string; nom: string; actif: boolean }) => `${x.prenom} ${x.nom}${x.actif ? '' : ' (désactivé)'}`
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Transfert de contrats</h1>
      <p className="text-sm text-gray-600">Tous les contrats du commercial choisi passent au nouveau commercial (le montant « commercial » est recalculé avec son barème, le loyer ne change pas). Pour un seul contrat, ouvrez sa fiche.</p>
      <FormulaireTransfert
        sources={utilisateurs.filter(x => x.role !== 'ASSISTANTE').map(x => ({ id: x.id, nom: nom(x) }))}
        cibles={utilisateurs.filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN')).map(x => ({ id: x.id, nom: nom(x) }))}
      />
    </main>
  )
}
