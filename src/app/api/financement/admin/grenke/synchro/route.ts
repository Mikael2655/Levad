import { NextResponse } from 'next/server'
import { lireConfigGrenke } from '@/lib/financement/connecteurs/grenke/config'
import { creerConnecteurGrenke } from '@/lib/financement/connecteurs/grenke/connecteur'
import { ErreurMetier } from '@/lib/financement/erreurs'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { synchroniserContrats } from '@/lib/financement/synchro-contrats'

export const runtime = 'nodejs'
export const maxDuration = 60

// Synchronisation des contrats avec l'API Grenke (lecture seule côté Grenke). { financeurId, commercialDefautId, periodicite, appliquer }.
// appliquer = false : simulation (rapport sans rien modifier) ; true : applique selon les règles de synchro-contrats.ts.
export async function POST(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(async () => {
    const cfg = lireConfigGrenke()
    if (!cfg.prete || !cfg.config) throw new ErreurMetier('La connexion à l’API Grenke n’est pas encore configurée (voir « Configuration » ci-dessus).')
    const connecteur = creerConnecteurGrenke(cfg.config)
    return synchroniserContrats(u, {
      financeurId: Number(c.financeurId),
      commercialDefautId: c.commercialDefautId ? Number(c.commercialDefautId) : null,
      periodicite: c.periodicite === 'MENSUELLE' ? 'MENSUELLE' : 'TRIMESTRIELLE',
      appliquer: c.appliquer === true,
    }, () => connecteur.listerContrats())
  })
}
