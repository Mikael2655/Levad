import { NextResponse } from 'next/server'
import { mettreEnPlaceContrat } from '@/lib/financement/demandes'
import { ErreurMetier } from '@/lib/financement/erreurs'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { lireDate } from '@/lib/financement/import-contrats'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(async () => {
    const dateDebut = lireDate(String(c.dateDebut ?? ''))
    if (!dateDebut) throw new ErreurMetier('Indiquez la date du 1er loyer.')
    return mettreEnPlaceContrat(u, Number(params.id), { montantReelCentimes: Number(c.montantReelCentimes), banque: String(c.banque ?? ''), dateDebut })
  })
}
