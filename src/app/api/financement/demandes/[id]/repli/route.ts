import { NextResponse } from 'next/server'
import { acteurApi, repondre } from '@/lib/financement/garde'
import { creerDemandeRepli } from '@/lib/financement/repli'

export const runtime = 'nodejs'

// Demande de repli créée à la main (ex. pièces difficiles à fournir chez Grenke) : administrateur et assistante.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  return repondre(() => creerDemandeRepli(Number(params.id), { declencheur: 'MANUEL', auteur: u }))
}
