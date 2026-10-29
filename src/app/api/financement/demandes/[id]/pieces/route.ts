import { NextResponse } from 'next/server'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { commencerPiece } from '@/lib/financement/pieces'

// Étape 1 de l'ajout d'une pièce : annonce du fichier (type, nom, taille). Le contenu suit, morceau par morceau.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => commencerPiece(u, Number(params.id), { type: String(c.type ?? ''), nomFichier: String(c.nomFichier ?? ''), taille: Number(c.taille) }))
}
