import { NextResponse } from 'next/server'
import { acteurApi, repondre } from '@/lib/financement/garde'
import { ajouterMorceau, MORCEAU_MAX } from '@/lib/financement/pieces'

export const maxDuration = 30

// Étape 2 : un morceau du fichier (3 Mo au plus), envoyé tel quel dans le corps de la requête.
export async function POST(req: Request, { params }: { params: { pid: string; ordre: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  if (Number(req.headers.get('content-length') ?? 0) > MORCEAU_MAX + 1024) return NextResponse.json({ error: 'Morceau trop gros.' }, { status: 413 })
  const donnees = Buffer.from(await req.arrayBuffer())
  return repondre(() => ajouterMorceau(u, Number(params.pid), Number(params.ordre), donnees))
}
