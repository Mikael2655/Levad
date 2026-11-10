import { NextResponse } from 'next/server'
import { tenterEnvoiAutomatique } from '@/lib/financement/connecteurs/grenke/envoi'
import { creerDemande, normaliserEntree } from '@/lib/financement/demandes'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(async () => {
    const d = await creerDemande(u, normaliserEntree(c))
    // Grenke (API) : l'administrateur n'a pas à passer par le brouillon, la demande part dès la saisie terminée.
    return { ...d, ...(await tenterEnvoiAutomatique(u, d.id)) }
  })
}
