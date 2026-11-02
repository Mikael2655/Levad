// Comparaison pure (sans base de données) entre les contrats de l'outil et ceux du financeur : voir les règles dans synchro-contrats.ts.
import type { ContratFinanceur } from './connecteurs/connecteur'

export const normaliserRef = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// États chez le financeur qui signifient « contrat terminé » (à confirmer avec les vraies réponses de l'API : ils sont affichés tels quels dans le rapport).
export const ETAT_TERMINE = /(terminat|closed|finished|ended|expired|settled|bought|buyout|repurchase|cancel|ablaufen|beendet)/i

export interface ExistantContrat {
  id: number
  refFinanceur: string | null
  raisonSociale: string
  loyerCentimes: number
  dureeMois: number
  dateDebut: Date | null
  dateFin: Date | null
  montantReelCentimes: number | null
  statutFinanceur: string | null
  clotureLe: Date | null
}

export interface Ecart { id: number; ref: string; client: string; champ: string; nous: string; financeur: string }
export interface Rapport {
  nouveaux: ContratFinanceur[]
  nouveauxIgnores: { ref: string; client: string; raison: string }[]
  connus: number
  aRemplir: { id: number; ref: string; client: string; champs: string[]; donnees: Partial<{ dateDebut: Date; dateFin: Date; montantReelCentimes: number; statutFinanceur: string }> }[]
  ecarts: Ecart[]
  aCloturer: { id: number; ref: string; client: string; etat: string }[]
  absents: { id: number; ref: string; client: string }[]
  avertissements: string[]
  etats: Record<string, number>
}

const jour = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '')
const eur = (c: number | null) => (c == null ? '' : (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))

export function comparer(existants: ExistantContrat[], distants: ContratFinanceur[]): Rapport {
  const r: Rapport = { nouveaux: [], nouveauxIgnores: [], connus: 0, aRemplir: [], ecarts: [], aCloturer: [], absents: [], avertissements: [], etats: {} }
  const parRef = new Map<string, ExistantContrat[]>()
  for (const e of existants) { const k = normaliserRef(e.refFinanceur); if (k) parRef.set(k, [...(parRef.get(k) ?? []), e]) }
  for (const [k, l] of Array.from(parRef.entries())) if (l.length > 1) r.avertissements.push(`Le numéro « ${l[0].refFinanceur} » existe ${l.length} fois dans l'outil : le premier est utilisé pour la comparaison.`)
  const vus = new Set<string>()
  let loyersComparables = 0
  let loyersEnProportion = 0

  for (const g of distants) {
    r.etats[g.etatBrut || '(vide)'] = (r.etats[g.etatBrut || '(vide)'] ?? 0) + 1
    const cle = normaliserRef(g.reference)
    if (!cle) { r.nouveauxIgnores.push({ ref: g.reference, client: g.client, raison: 'numéro de contrat absent' }); continue }
    if (vus.has(cle)) { r.avertissements.push(`Le numéro « ${g.reference} » apparaît deux fois dans la réponse du financeur.`); continue }
    vus.add(cle)
    const termine = ETAT_TERMINE.test(g.etatBrut)
    const e = parRef.get(cle)?.[0]

    if (!e) {
      if (termine) r.nouveauxIgnores.push({ ref: g.reference, client: g.client, raison: `déjà terminé chez le financeur (${g.etatBrut})` })
      else if (!g.loyerMensuelCentimes || g.loyerMensuelCentimes <= 0 || !g.dureeMois) r.nouveauxIgnores.push({ ref: g.reference, client: g.client, raison: 'loyer ou durée absents' })
      else r.nouveaux.push(g)
      continue
    }

    r.connus++
    const ref = e.refFinanceur ?? g.reference
    const champs: string[] = []
    const donnees: Rapport['aRemplir'][number]['donnees'] = {}
    if (g.etatBrut && g.etatBrut !== e.statutFinanceur) { donnees.statutFinanceur = g.etatBrut; champs.push('état') }

    const dateChamp = (champ: 'dateDebut' | 'dateFin', libelle: string, distante: Date | null) => {
      if (!distante) return
      if (!e[champ]) { donnees[champ] = distante; champs.push(libelle) }
      else if (jour(e[champ]) !== jour(distante)) r.ecarts.push({ id: e.id, ref, client: e.raisonSociale, champ: libelle, nous: jour(e[champ]), financeur: jour(distante) })
    }
    dateChamp('dateDebut', '1er loyer', g.dateDebut)
    dateChamp('dateFin', 'date de fin', g.dateFin)
    if (g.montantFinanceCentimes != null) {
      if (e.montantReelCentimes == null) { donnees.montantReelCentimes = g.montantFinanceCentimes; champs.push('montant financé') }
      else if (Math.abs(e.montantReelCentimes - g.montantFinanceCentimes) > 1) r.ecarts.push({ id: e.id, ref, client: e.raisonSociale, champ: 'montant financé', nous: eur(e.montantReelCentimes), financeur: eur(g.montantFinanceCentimes) })
    }
    if (g.dureeMois && g.dureeMois !== e.dureeMois) r.ecarts.push({ id: e.id, ref, client: e.raisonSociale, champ: 'durée (mois)', nous: String(e.dureeMois), financeur: String(g.dureeMois) })
    if (g.loyerMensuelCentimes) {
      loyersComparables++
      if (Math.abs(g.loyerMensuelCentimes - e.loyerCentimes) > 1) {
        r.ecarts.push({ id: e.id, ref, client: e.raisonSociale, champ: 'loyer', nous: eur(e.loyerCentimes), financeur: eur(g.loyerMensuelCentimes) })
        if (Math.abs(g.loyerMensuelCentimes * 3 - e.loyerCentimes) <= 3 || Math.abs(g.loyerMensuelCentimes - e.loyerCentimes * 3) <= 3) loyersEnProportion++
      }
    }
    if (Object.keys(donnees).length) r.aRemplir.push({ id: e.id, ref, client: e.raisonSociale, champs, donnees })
    if (termine && !e.clotureLe) r.aCloturer.push({ id: e.id, ref, client: e.raisonSociale, etat: g.etatBrut })
  }

  for (const e of existants) {
    const k = normaliserRef(e.refFinanceur)
    if (k && !vus.has(k) && !e.clotureLe) r.absents.push({ id: e.id, ref: e.refFinanceur!, client: e.raisonSociale })
  }
  if (loyersComparables >= 5 && loyersEnProportion / loyersComparables >= 0.6) r.avertissements.push('La plupart des loyers diffèrent d’un facteur 3 : le loyer renvoyé par le financeur est probablement mensuel alors que le nôtre est trimestriel (ou l’inverse). Ces écarts de loyer sont à lire avec cette réserve.')
  return r
}

