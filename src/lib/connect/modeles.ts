import { prisma } from '@/lib/db'
import { gammeAuto } from './gammes'

// Retrouver le vrai modèle d'un copieur Canon quand son nom réseau a été changé par le client.
// Ordre : le nom lu (s'il est reconnu) → la description technique de la machine → son nom réseau →
// un autre copieur de même début de numéro de série (le début du numéro identifie le modèle chez Canon).

// Débuts de numéros de série déjà vus sur de vraies machines (complétés automatiquement par les machines connues).
const SERIES_CONNUES: Record<string, string> = {
  '2GE': 'iR-ADV C3525 III',
  QTS: 'iR-ADV C3325',
  '4CF': 'iR-ADV C3826',
  '2XN': 'iR-ADV C5860',
}

const MOTIF = /\b(iR-ADV(?:\s+DX)?\s*[A-Z]{0,2}\s*\d{3,4}\s*[A-Za-z]{0,3}(?:\s+III)?|imageFORCE\s*[A-Z]{0,2}\s*\d{3,4}\s*[A-Za-z]{0,3}|imageRUNNER\s+ADVANCE(?:\s+DX)?\s*[A-Z]{0,2}\s*\d{3,4}\s*[A-Za-z]{0,3}|i-SENSYS\s*[A-Z]{1,4}\s*\d{3,4}\s*[A-Za-z]{0,4})/i

export function extraireModele(texte: string | null | undefined): string | null {
  const m = (texte ?? '').match(MOTIF)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

export type EntreeModele = { modele?: string | null; sysDescr?: string | null; nomReseau?: string | null; serie?: string | null }

/** Le modèle à retenir (reconnu dans la liste des gammes), ou null si on n'en trouve aucun. `exclureId` : la machine elle-même. */
export async function resoudreModele(e: EntreeModele, exclureId?: number): Promise<string | null> {
  if (e.modele && gammeAuto(e.modele)) return e.modele
  for (const t of [e.sysDescr, e.nomReseau]) {
    const m = extraireModele(t)
    if (m && gammeAuto(m)) return m
  }
  const serie = (e.serie ?? '').trim().toUpperCase()
  if (serie.length >= 3) {
    const debut = serie.slice(0, 3)
    const voisines = await prisma.connectMachine.findMany({
      where: { numeroSerie: { startsWith: debut, mode: 'insensitive' }, modele: { not: null }, ...(exclureId ? { id: { not: exclureId } } : {}) },
      select: { modele: true },
      take: 20,
    })
    const v = voisines.find((x) => gammeAuto(x.modele))
    if (v?.modele) return v.modele
    const connu = SERIES_CONNUES[debut]
    if (connu && gammeAuto(connu)) return connu
  }
  return null
}
