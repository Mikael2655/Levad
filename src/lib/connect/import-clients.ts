import { cleClient } from '@/lib/connect/normaliser'
import { adressesMail } from '@/lib/connect/mail'

// Liste de clients collée à la main (ou copiée depuis Excel) : une ligne par client, « Nom du client » puis ses adresses mail
// séparées par des « ; ». Le nom s'arrête à la première adresse trouvée, quel que soit le séparateur (tabulation, point-virgule, espace).

export type LigneImport = { nom: string; cle: string; mails: string[]; invalides: string[] }

export const MAX_CLIENTS_PAR_IMPORT = 40

export function lireListe(texte: string): LigneImport[] {
  const vues = new Set<string>()
  const lignes: LigneImport[] = []
  for (const brute of texte.split(/\r?\n/)) {
    const ligne = brute.trim()
    if (!ligne) continue
    const m = ligne.match(/[^\s;,]+@/)
    const idx = m && m.index !== undefined ? m.index : -1
    const nom = (idx >= 0 ? ligne.slice(0, idx) : ligne).replace(/[\s;,]+$/, '').replace(/^[\s;,]+/, '').slice(0, 120)
    if (!nom) continue
    const cle = cleClient(nom)
    if (vues.has(cle)) continue // doublon dans la liste : la première ligne fait foi
    vues.add(cle)
    const { valides, invalides } = idx >= 0 ? adressesMail(ligne.slice(idx)) : { valides: [], invalides: [] }
    lignes.push({ nom, cle, mails: valides.slice(0, 10), invalides })
  }
  return lignes
}
