import { connecte } from '@/lib/connect/auth'
import { lireDocument, machineParSerie } from '@/lib/connect/import'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

function erreur(message: string, status = 400) {
  return Response.json({ erreur: message }, { status })
}

export async function POST(req: Request) {
  if (!connecte()) return erreur('Non connecté', 401)
  try {
    const form = await req.formData()
    const fichier = form.get('fichier')
    if (!(fichier instanceof File)) return erreur('Aucun fichier reçu.')
    if (!TYPES.includes(fichier.type)) return erreur('Format non pris en charge : envoyez un PDF ou une photo JPEG / PNG.')
    if (fichier.size > 4_000_000) return erreur('Fichier trop lourd (4 Mo maximum).')
    const lectures = await lireDocument(Buffer.from(await fichier.arrayBuffer()), fichier.type)
    const enrichies = await Promise.all(lectures.map(async (l) => ({ ...l, machine: await machineParSerie(l.serie) })))
    return Response.json({ lectures: enrichies })
  } catch (e) {
    console.error('import lecture', e)
    return erreur('La lecture a échoué : ' + (e instanceof Error ? e.message : String(e)), 500)
  }
}
