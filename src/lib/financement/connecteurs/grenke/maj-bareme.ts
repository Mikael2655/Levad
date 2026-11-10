// Mise à jour des barèmes à partir du calculateur de Grenke. Fonctions PURES (aucun accès réseau ni base) : testables.
// Principe : Grenke renvoie le loyer pour un montant ; on en déduit le coefficient de chaque tranche et de chaque durée.
import { lignesVersMatrice, validerMatrice } from '../../grilles'

export interface LigneG { dureeMois: number; montantMinCentimes: number; coefficientBp: number }
export interface GrilleEntree { base: 'MENSUEL' | 'TRIMESTRIEL'; lignes: LigneG[] }
export interface Echantillon { montantCentimes: number; loyerMensuelParDuree: Record<number, number> }
export interface EntreeCommerciale { cle: string; libelle: string; grille: GrilleEntree }

export const DUREES_A_AJOUTER = [18, 24, 30]
const MONTANT_MINIMUM_MESURE = 50000 // 500 € : en dessous, Grenke peut refuser le calcul

// Minimums de tranche de la durée qui en a le plus (les barèmes ont les mêmes tranches pour toutes les durées).
export function tranchesDeReference(lignes: LigneG[]): number[] {
  const parDuree = new Map<number, Set<number>>()
  for (const l of lignes) parDuree.set(l.dureeMois, (parDuree.get(l.dureeMois) ?? new Set()).add(l.montantMinCentimes))
  let meilleure: [number, number[]] | null = null
  Array.from(parDuree.entries()).sort((a, b) => a[0] - b[0]).forEach(([d, s]) => { if (!meilleure || s.size > meilleure[1].length) meilleure = [d, Array.from(s).sort((a, b) => a - b)] })
  return meilleure ? (meilleure as [number, number[]])[1] : []
}

// Deux montants par tranche : le minimum (ou 500 €) et le haut de la tranche, pour vérifier que les tranches coïncident avec celles de Grenke.
export function montantsAMesurer(reelle: GrilleEntree): number[] {
  const mins = tranchesDeReference(reelle.lignes)
  const montants = new Set<number>([500000]) // contrôle : 5 000 €
  mins.forEach((min, i) => {
    const suivant = mins[i + 1]
    const bas = Math.max(min, MONTANT_MINIMUM_MESURE)
    montants.add(suivant === undefined || bas < suivant ? bas : min)
    if (suivant !== undefined && suivant - 100 > bas) montants.add(suivant - 100)
  })
  return Array.from(montants).sort((a, b) => a - b)
}

const versTrimestriel = (base: GrilleEntree['base'], bp: number) => (base === 'MENSUEL' ? bp * 3 : bp)
const depuisTrimestriel = (base: GrilleEntree['base'], bp: number) => (base === 'MENSUEL' ? Math.round(bp / 3) : bp)

function ligneDuMontant(lignes: LigneG[], duree: number, montantCentimes: number): LigneG | undefined {
  const t = lignes.filter(l => l.dureeMois === duree).sort((a, b) => a.montantMinCentimes - b.montantMinCentimes)
  return [...t].reverse().find(l => l.montantMinCentimes <= montantCentimes) ?? t[0]
}

export interface Changement { dureeMois: number; montantMinCentimes: number; ancienBp: number | null; nouveauBp: number }
export interface PlanReel { lignes: LigneG[]; changements: Changement[]; durees: { ajoutees: number[]; mises_a_jour: number[]; inchangees: number[] }; anomalies: string[] }
export interface AjoutCommercial { dureeMois: number; montantMinCentimes: number; coefficientBp: number; majorationBp: number }
export interface PlanCommercial { cle: string; libelle: string; lignes: LigneG[]; ajouts: AjoutCommercial[]; dureeReference: number | null; majorationVariable: boolean; avertissements: string[] }
export interface Plan { reelle: PlanReel; commerciales: PlanCommercial[]; controle: { montantEuros: number; dureeMois: number; loyerTrimestrielGrenke: number | null } }

export function planifier(reelle: GrilleEntree, commerciales: EntreeCommerciale[], echantillons: Echantillon[], dureesAAjouter: number[] = DUREES_A_AJOUTER): Plan {
  const mins = tranchesDeReference(reelle.lignes)
  const anomalies: string[] = []
  const dureesExistantes = Array.from(new Set(reelle.lignes.map(l => l.dureeMois))).sort((a, b) => a - b)
  const dureesGrenke = new Set<number>()
  echantillons.forEach(e => Object.keys(e.loyerMensuelParDuree).forEach(d => dureesGrenke.add(Number(d))))

  // coefficient MENSUEL mesuré (en points de base) pour (durée, tranche), ou null
  const mesurer = (duree: number, i: number): number | null => {
    const bas = mins[i]
    const haut = mins[i + 1] ?? Infinity
    const mesures = echantillons
      .filter(e => e.montantCentimes >= bas && e.montantCentimes < haut && e.loyerMensuelParDuree[duree] != null)
      .sort((a, b) => a.montantCentimes - b.montantCentimes)
      .map(e => ({ montant: e.montantCentimes, bp: Math.round((e.loyerMensuelParDuree[duree] * 10000) / e.montantCentimes) }))
    if (mesures.length === 0) return null
    const ecart = Math.max(...mesures.map(m => m.bp)) - Math.min(...mesures.map(m => m.bp))
    if (ecart > 1) {
      anomalies.push(`${duree} mois, tranche à partir de ${bas / 100} € : Grenke donne des coefficients différents dans la même tranche (écart ${ecart} points de base) : les tranches de Grenke ne sont pas les nôtres. Ligne non modifiée.`)
      return null
    }
    return mesures[mesures.length - 1].bp // coefficient MENSUEL ; la mesure sur le plus gros montant est la plus précise
  }

  // Unité de stockage : MENSUEL = coefficient mensuel (bp) ; TRIMESTRIEL = coefficient trimestriel (bp) = 3 × mensuel.
  const enUniteGrille = (mensuelBp: number) => (reelle.base === 'MENSUEL' ? mensuelBp : mensuelBp * 3)

  const nouvelles: LigneG[] = reelle.lignes.map(l => ({ ...l }))
  const changements: Changement[] = []
  const ajoutees: number[] = []
  const majs: number[] = []
  const inchangees: number[] = []

  for (const d of dureesExistantes) {
    if (!dureesGrenke.has(d)) { inchangees.push(d); continue }
    let modifiee = false
    mins.forEach((min, i) => {
      const m = mesurer(d, i)
      const ligne = nouvelles.find(l => l.dureeMois === d && l.montantMinCentimes === min)
      if (m == null || !ligne) return
      const nouveau = enUniteGrille(m)
      if (nouveau !== ligne.coefficientBp) {
        changements.push({ dureeMois: d, montantMinCentimes: min, ancienBp: ligne.coefficientBp, nouveauBp: nouveau })
        ligne.coefficientBp = nouveau
        modifiee = true
      }
    })
    if (modifiee) majs.push(d)
  }

  for (const d of dureesAAjouter) {
    if (dureesExistantes.includes(d) || !dureesGrenke.has(d)) continue
    const cases = mins.map((min, i) => ({ min, m: mesurer(d, i) }))
    if (cases.some(c => c.m == null)) { anomalies.push(`Durée ${d} mois non ajoutée : Grenke ne la propose pas pour toutes les tranches de montant.`); continue }
    cases.forEach(c => {
      const nouveau = enUniteGrille(c.m as number)
      nouvelles.push({ dureeMois: d, montantMinCentimes: c.min, coefficientBp: nouveau })
      changements.push({ dureeMois: d, montantMinCentimes: c.min, ancienBp: null, nouveauBp: nouveau })
    })
    ajoutees.push(d)
  }

  const reelRetenu: GrilleEntree = { base: reelle.base, lignes: nouvelles }
  const commercialesPlan = commerciales.map(c => planCommercial(c, reelRetenu, ajoutees))

  const ctrl = echantillons.find(e => e.montantCentimes === 500000)
  const l36 = ctrl?.loyerMensuelParDuree[36]
  return {
    reelle: { lignes: nouvelles, changements, durees: { ajoutees, mises_a_jour: majs, inchangees }, anomalies },
    commerciales: commercialesPlan,
    controle: { montantEuros: 5000, dureeMois: 36, loyerTrimestrielGrenke: l36 != null ? (l36 * 3) / 100 : null },
  }
}

// Majoration (écart commercial − réel, en points de base du coefficient TRIMESTRIEL) constatée sur les durées existantes ;
// les nouvelles durées reçoivent la même majoration, calculée sur le NOUVEAU barème réel.
function planCommercial(entree: EntreeCommerciale, reelNouveau: GrilleEntree, dureesAjoutees: number[]): PlanCommercial {
  const g = entree.grille
  const lignes: LigneG[] = g.lignes.map(l => ({ ...l }))
  const avertissements: string[] = []
  const dureesReel = new Set(reelNouveau.lignes.map(l => l.dureeMois))
  const dureesComm = Array.from(new Set(g.lignes.map(l => l.dureeMois))).sort((a, b) => a - b)
  const communes = dureesComm.filter(d => dureesReel.has(d) && !dureesAjoutees.includes(d))
  const mins = tranchesDeReference(g.lignes)
  const ajouts: AjoutCommercial[] = []
  let variable = false
  const reference = communes[0] ?? null
  if (reference === null) {
    if (dureesAjoutees.length) avertissements.push('Aucune durée commune avec le barème réel : impossible de déduire la majoration.')
    return { cle: entree.cle, libelle: entree.libelle, lignes, ajouts, dureeReference: null, majorationVariable: false, avertissements }
  }
  const realQ = (d: number, montant: number) => {
    const l = ligneDuMontant(reelNouveau.lignes, d, montant)
    return l ? versTrimestriel(reelNouveau.base, l.coefficientBp) : null
  }
  const commQ = (d: number, montant: number) => {
    const l = ligneDuMontant(g.lignes, d, montant)
    return l ? versTrimestriel(g.base, l.coefficientBp) : null
  }
  mins.forEach(min => {
    const montant = Math.max(min, 1)
    const majorations = communes.map(d => { const c = commQ(d, montant), r = realQ(d, montant); return c != null && r != null ? c - r : null }).filter((x): x is number => x != null)
    if (majorations.length && Math.max(...majorations) - Math.min(...majorations) > 5) variable = true
    const majRef = commQ(reference, montant) != null && realQ(reference, montant) != null ? (commQ(reference, montant) as number) - (realQ(reference, montant) as number) : null
    if (majRef == null) return
    for (const d of dureesAjoutees) {
      if (dureesComm.includes(d)) continue
      const r = realQ(d, montant)
      if (r == null) continue
      const q = r + majRef
      const ligne: LigneG = { dureeMois: d, montantMinCentimes: min, coefficientBp: depuisTrimestriel(g.base, q) }
      lignes.push(ligne)
      ajouts.push({ dureeMois: d, montantMinCentimes: min, coefficientBp: ligne.coefficientBp, majorationBp: majRef })
    }
  })
  if (variable) avertissements.push(`La majoration n’est pas la même d’une durée à l’autre dans ce barème : elle est recopiée de la durée de référence (${reference} mois).`)
  return { cle: entree.cle, libelle: entree.libelle, lignes, ajouts, dureeReference: reference, majorationVariable: variable, avertissements }
}

// Une grille ne doit être enregistrée que si elle est complète et cohérente.
export function problemesGrille(lignes: LigneG[]): string[] {
  return validerMatrice(lignesVersMatrice(lignes))
}
