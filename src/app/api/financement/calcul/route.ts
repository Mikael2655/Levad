import { NextResponse } from 'next/server'
import { calculer } from '@/lib/financement/demandes'
import { estInterne, vueCalcul } from '@/lib/financement/droits'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

// Aperçu du loyer pendant la saisie. La réponse est filtrée selon le rôle : un commercial ne reçoit que son calcul.
export async function POST(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  const nombre = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))
  return repondre(async () => {
    // un commercial est toujours calculé avec SA grille ; l'interne indique pour quel commercial il saisit
    const commercialId = estInterne(u) ? (nombre(c.commercialId) ?? u.id) : u.id
    const r = await calculer({
      financeurId: Number(c.financeurId),
      commercialId,
      dureeMois: nombre(c.dureeMois),
      periodicite: c.periodicite === 'MENSUELLE' ? 'MENSUELLE' : 'TRIMESTRIELLE',
      loyerCentimes: nombre(c.loyerCentimes),
      montantCentimes: nombre(c.montantCentimes),
    })
    return vueCalcul(u, r)
  })
}
