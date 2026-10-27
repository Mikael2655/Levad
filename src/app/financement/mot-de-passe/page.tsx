import { exigerUtilisateur } from '@/lib/financement/garde'
import FormulaireMotDePasse from './FormulaireMotDePasse'

export const dynamic = 'force-dynamic'

export default async function PageMotDePasse() {
  const u = await exigerUtilisateur({ autoriserChangementMdp: true })
  return (
    <main className="max-w-sm mx-auto p-6">
      <FormulaireMotDePasse obligatoire={u.doitChangerMotDePasse} />
    </main>
  )
}
