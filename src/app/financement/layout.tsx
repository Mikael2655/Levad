import { utilisateurCourant } from '@/lib/financement/auth'
import { metadataFinancement, viewportFinancement } from '@/lib/financement/metadata'
import BarreLaterale from './BarreLaterale'

export const dynamic = 'force-dynamic'

export const metadata = metadataFinancement
export const viewport = viewportFinancement

const LIBELLE_ROLE = { ADMIN: 'Administrateur', ASSISTANTE: 'Assistante', COMMERCIAL: 'Commercial' } as const

export default async function LayoutFinancement({ children }: { children: React.ReactNode }) {
  const u = await utilisateurCourant()
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased [font-feature-settings:'cv11','ss01']">
      {u && <BarreLaterale prenom={u.prenom} nom={u.nom} email={u.email} role={LIBELLE_ROLE[u.role]} admin={u.role === 'ADMIN'} menuVisible={!u.doitChangerMotDePasse} />}
      <div className={u ? 'md:pl-64' : ''}>{children}</div>
    </div>
  )
}
