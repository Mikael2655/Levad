// Export de compteurs d'HyperPrint (CSV, séparateur « ; », encodage Windows-1252) :
//   # Matricule;Abonné;Nb pages - éq. A4 - C;Nb pages - éq. A4 - N
// « C » = couleur, « N » = noir et blanc, en équivalent A4 (un A3 compte double). La colonne « Abonné » est facultative.

export type LigneCsv = { matricule: string; abonne: string | null; couleur: number | null; nb: number | null }

/** UTF-8 si le fichier en est, sinon Windows-1252 (cas d'HyperPrint). */
export function decoderCsv(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(buf)
  }
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^#\s*/, '').trim()

function nombre(brut: string | undefined): number | null {
  const t = (brut ?? '').replace(/[\s ]/g, '').replace(',', '.')
  if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null
  return Math.max(0, Math.round(Number(t)))
}

/** Date AAAA-MM-JJ contenue dans le nom du fichier (« Export_compteurs2026-10-23_10-43-36.csv »), sinon null. */
export function dateDuNom(nom: string): string | null {
  const m = nom.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

export function lireCsv(texte: string): { lignes: LigneCsv[]; erreur: string | null } {
  const rows = texte.split(/\r?\n/).filter((l) => l.trim())
  if (rows.length < 2) return { lignes: [], erreur: 'Le fichier est vide ou ne contient pas de ligne de données.' }
  const entetes = rows[0].split(';').map(norm)
  const iMat = entetes.findIndex((h) => h.startsWith('matricule') || h.includes('serie'))
  const iAbo = entetes.findIndex((h) => h.startsWith('abonn'))
  const iCoul = entetes.findIndex((h) => /\ba4\b/.test(h) && /-\s*c$/.test(h))
  const iNb = entetes.findIndex((h) => /\ba4\b/.test(h) && /-\s*n$/.test(h))
  if (iMat < 0) return { lignes: [], erreur: 'Colonne « Matricule » introuvable.' }
  if (iCoul < 0 || iNb < 0) return { lignes: [], erreur: 'Colonnes de volumes introuvables (« … éq. A4 - C » et « … éq. A4 - N »).' }
  const lignes: LigneCsv[] = []
  for (const r of rows.slice(1)) {
    const c = r.split(';')
    const matricule = (c[iMat] ?? '').trim().toUpperCase()
    if (!matricule) continue
    lignes.push({ matricule, abonne: iAbo >= 0 ? (c[iAbo] ?? '').trim() || null : null, couleur: nombre(c[iCoul]), nb: nombre(c[iNb]) })
  }
  return { lignes, erreur: lignes.length ? null : 'Aucune ligne exploitable.' }
}
