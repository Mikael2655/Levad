import { redirect } from 'next/navigation'
import { utilisateurCourant } from '@/lib/financement/auth'
import FormulaireConnexion from './FormulaireConnexion'
import { metadataFinancement, viewportFinancement } from '@/lib/financement/metadata'

export const metadata = metadataFinancement
export const viewport = viewportFinancement
export const dynamic = 'force-dynamic'

export default async function PageConnexion({ searchParams }: { searchParams: { suite?: string } }) {
  // déjà connecté : on ouvre directement l'accueil
  const u = await utilisateurCourant()
  if (u && !u.doitChangerMotDePasse) redirect('/financement/accueil')
  return (
    <div className="min-h-screen bg-sable-100 flex items-center justify-center p-4">
      <FormulaireConnexion suite={searchParams.suite} />
    </div>
  )
}
