import { NextResponse } from 'next/server'
import { peutImporterContrats } from '@/lib/financement/droits'
import { ErreurMetier } from '@/lib/financement/erreurs'
import { lireFichier } from '@/lib/financement/fichier-import'
import { acteurApi, repondre } from '@/lib/financement/garde'
import { suggererMapping } from '@/lib/financement/import-contrats'

export const runtime = 'nodejs'

const TAILLE_MAX = 4 * 1024 * 1024

// Étape 1 de l'import : lit le fichier déposé et propose la correspondance des colonnes (rien n'est enregistré).
export async function POST(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  if (!peutImporterContrats(u)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  return repondre(async () => {
    const form = await req.formData().catch(() => null)
    const fichier = form?.get('fichier')
    if (!(fichier instanceof File)) throw new ErreurMetier('Choisissez un fichier.')
    if (fichier.size > TAILLE_MAX) throw new ErreurMetier('Fichier trop volumineux (4 Mo maximum).')
    const { entetes, lignes } = await lireFichier(fichier.name, Buffer.from(await fichier.arrayBuffer()))
    return { entetes, lignes, mapping: suggererMapping(entetes) }
  })
}
