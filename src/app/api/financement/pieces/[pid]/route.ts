import { NextResponse } from 'next/server'
import { ErreurMetier } from '@/lib/financement/erreurs'
import { acteurApi, repondre } from '@/lib/financement/garde'
import { lirePiece, supprimerPiece, terminerPiece } from '@/lib/financement/pieces'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Téléchargement : toujours en « pièce jointe » (jamais affiché dans la page), type de contenu non négociable.
export async function GET(_req: Request, { params }: { params: { pid: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  try {
    const p = await lirePiece(u, Number(params.pid))
    const it = p.flux[Symbol.asyncIterator]()
    const corps = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { value, done } = await it.next()
        if (done) controller.close()
        else controller.enqueue(new Uint8Array(value))
      },
    })
    return new Response(corps, {
      headers: {
        'Content-Type': p.typeMime,
        'Content-Length': String(p.taille),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(p.nomFichier)}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    if (e instanceof ErreurMetier) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

// Étape 3 : { action: 'terminer' } vérifie que tout le fichier est arrivé.
export async function POST(_req: Request, { params }: { params: { pid: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  return repondre(() => terminerPiece(u, Number(params.pid)))
}

export async function DELETE(_req: Request, { params }: { params: { pid: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  return repondre(() => supprimerPiece(u, Number(params.pid)))
}
