import { NextResponse } from 'next/server'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { analyserPdfPiecesDemandees, enregistrerPiecesDemandees } from '@/lib/financement/pieces-demandees'
import { ErreurMetier } from '@/lib/financement/erreurs'

export const runtime = 'nodejs'

// PDF (envoyé en multipart) -> liste des pièces détectées, sans rien enregistrer.
export async function POST(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  return repondre(async () => {
    const form = await req.formData().catch(() => null)
    const f = form?.get('fichier')
    if (!(f instanceof File)) throw new ErreurMetier('Choisissez un fichier PDF.')
    return analyserPdfPiecesDemandees(u, Buffer.from(await f.arrayBuffer()))
  })
}

// Liste relue par l'utilisateur -> enregistrée sur la demande (visible des commerciaux).
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => enregistrerPiecesDemandees(u, Number(params.id), Array.isArray(c.lignes) ? c.lignes.map(String) : []))
}
