import { NextResponse } from 'next/server'
import { envoyerALaCreation } from '@/lib/financement/envoi-creation'
import { creerDemande, normaliserEntree } from '@/lib/financement/demandes'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(async () => {
    const d = await creerDemande(u, normaliserEntree(c))
    // Plus de brouillon : la demande part chez le financeur dès la saisie terminée (voir envoi-creation.ts).
    return { ...d, ...(await envoyerALaCreation(u, d.id)) }
  })
}
