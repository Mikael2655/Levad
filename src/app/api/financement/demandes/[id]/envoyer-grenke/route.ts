import { NextResponse } from 'next/server'
import { envoyerDemandeAGrenke } from '@/lib/financement/connecteurs/grenke/envoi'
import { acteurApi, repondre } from '@/lib/financement/garde'

export const runtime = 'nodejs'

// Envoi réel à Grenke : administrateur seulement, jamais automatique (voir envoi.ts pour les garde-fous).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  return repondre(() => envoyerDemandeAGrenke(u, Number(params.id)))
}
