import { NextResponse } from 'next/server'
import { modifierContrat } from '@/lib/financement/contrats'
import { ErreurMetier } from '@/lib/financement/erreurs'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { lireDate } from '@/lib/financement/import-contrats'

// Date AAAA-MM-JJ ; vide = effacer ; absente = ne pas toucher.
function date(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const d = lireDate(String(v))
  if (!d) throw new ErreurMetier('Date invalide.')
  return d
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() =>
    modifierContrat(u, Number(params.id), {
      ...(typeof c.materiel === 'string' ? { materiel: c.materiel } : {}),
      ...(typeof c.refFinanceur === 'string' || c.refFinanceur === null ? { refFinanceur: c.refFinanceur } : {}),
      ...(c.commercialId ? { commercialId: Number(c.commercialId) } : {}),
      dateDebut: date(c.dateDebut),
      dateFin: date(c.dateFin),
    }),
  )
}
