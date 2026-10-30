// Lecture d'un fichier de contrats existants (CSV / Excel) : reconnaissance des colonnes, lecture des nombres, dates,
// périodicités et durées dans les formats courants. Fonctions pures. Aucun exemple de fichier Grenke n'étant encore
// disponible, la correspondance des colonnes est SUGGÉRÉE puis corrigeable à l'écran.
import { dateFinDepuisDebut } from './echeances'
import type { Periodicite } from './calcul'

export const CHAMPS = ['ref', 'statut', 'client', 'siret', 'materiel', 'loyer', 'periodicite', 'duree', 'dateDebut', 'dateFin', 'montantReel', 'commercial'] as const
export type Champ = (typeof CHAMPS)[number]
export type Mapping = Partial<Record<Champ, number>> // numéro de colonne (0 = première)

export const LIBELLES_CHAMPS: Record<Champ, string> = {
  ref: 'N° de contrat',
  statut: 'Statut chez le financeur',
  client: 'Client (raison sociale)',
  siret: 'SIREN / SIRET',
  materiel: 'Matériel / objet',
  loyer: 'Loyer',
  periodicite: 'Périodicité',
  duree: 'Durée',
  dateDebut: 'Date du 1er loyer',
  dateFin: 'Date de fin',
  montantReel: 'Montant financé (réel)',
  commercial: 'Commercial (e-mail ou nom)',
}
export const OBLIGATOIRES: Champ[] = ['client', 'loyer', 'duree']
// Colonnes réellement manquantes : la durée peut se déduire des deux dates (1er loyer et fin).
export const colonnesManquantes = (m: Mapping): Champ[] => OBLIGATOIRES.filter(c => m[c] === undefined && !(c === 'duree' && m.dateDebut !== undefined && m.dateFin !== undefined))

// Durée en mois entre deux dates, arrondie ; au trimestre le plus proche si le loyer est trimestriel.
export function dureeDepuisDates(debut: Date, fin: Date, periodicite: Periodicite): number | null {
  const mois = (fin.getUTCFullYear() - debut.getUTCFullYear()) * 12 + (fin.getUTCMonth() - debut.getUTCMonth()) + (fin.getUTCDate() - debut.getUTCDate()) / 30
  const arrondi = periodicite === 'TRIMESTRIELLE' ? Math.round(mois / 3) * 3 : Math.round(mois)
  return arrondi >= 1 && arrondi <= 240 ? arrondi : null
}

export const normaliser = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// Ordre = priorité d'attribution des colonnes (les plus précises d'abord).
const SYNONYMES: [Champ, string[]][] = [
  ['statut', ['statut', 'status', 'etat', 'state', 'zustand']],
  ['ref', ['numero de contrat', 'n contrat', 'no contrat', 'contrat', 'contract number', 'contract no', 'contract', 'vertragsnummer', 'reference', 'ref']],
  ['siret', ['siret', 'siren']],
  ['dateDebut', ['date 1er loyer', 'date du 1er loyer', 'premier loyer', '1er loyer', 'premiere echeance', '1ere echeance', 'date de debut', 'date debut', 'debut', 'start date', 'start', 'first rent', 'beginn']],
  ['dateFin', ['date de fin', 'date fin', 'fin de contrat', 'echeance finale', 'end date', 'end', 'ende', 'fin']],
  ['periodicite', ['periodicite', 'frequence', 'payment frequency', 'frequency', 'zahlweise']],
  ['duree', ['duree', 'duree mois', 'duration', 'term of lease', 'term', 'laufzeit', 'nombre de mois', 'periode', 'period', 'mois']],
  ['loyer', ['loyer', 'loyer ht', 'montant du loyer', 'mensualite', 'rent', 'installment', 'instalment', 'rate']],
  ['montantReel', ['montant finance', 'montant du financement', 'financement', 'financed amount', 'financing amount', 'amount', 'nav', 'valeur financee', 'montant']],
  ['client', ['raison sociale', 'nom du client', 'client', 'locataire', 'preneur', 'lessee', 'customer', 'kunde']],
  ['materiel', ['materiel', 'objet', 'designation', 'bien', 'equipement', 'description', 'object']],
  ['commercial', ['commercial', 'vendeur', 'apporteur', 'sales', 'representant', 'conseiller']],
]

export function suggererMapping(entetes: string[]): Mapping {
  const normalises = entetes.map(e => ` ${normaliser(e)} `)
  const mapping: Mapping = {}
  const prises = new Set<number>()
  for (const [champ, synonymes] of SYNONYMES) {
    for (const synonyme of synonymes) {
      const i = normalises.findIndex((h, k) => !prises.has(k) && h.includes(` ${synonyme} `))
      if (i >= 0) {
        mapping[champ] = i
        prises.add(i)
        break
      }
    }
  }
  return mapping
}

// --- CSV ---------------------------------------------------------------------------------------------------------------

export function lireCsv(texte: string): string[][] {
  const t = texte.replace(/^﻿/, '')
  const premiere = t.split(/\r?\n/)[0] ?? ''
  const separateur = [';', '\t', ','].map(s => [s, premiere.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0]
  const lignes: string[][] = []
  let ligne: string[] = []
  let cellule = ''
  let guillemets = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') { cellule += '"'; i++ }
      else if (c === '"') guillemets = false
      else cellule += c
    } else if (c === '"') guillemets = true
    else if (c === separateur) { ligne.push(cellule); cellule = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      ligne.push(cellule); cellule = ''
      lignes.push(ligne); ligne = []
    } else cellule += c
  }
  if (cellule !== '' || ligne.length) { ligne.push(cellule); lignes.push(ligne) }
  return lignes.filter(l => l.some(c => c.trim() !== ''))
}

// --- Valeurs -----------------------------------------------------------------------------------------------------------

// « 1 234,56 € » / « 1.234,56 » / « 1234.56 » -> 123456 (centimes). null si illisible.
export function lireMontantCentimes(brut: string): number | null {
  let s = brut.replace(/[\s  €$]/g, '')
  if (!s || !/^[-+]?[\d.,]+$/.test(s)) return null
  const virgule = s.lastIndexOf(',')
  const point = s.lastIndexOf('.')
  if (virgule >= 0 && point >= 0) s = virgule > point ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (virgule >= 0) s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

function dateValide(a: number, m: number, j: number): Date | null {
  const d = new Date(Date.UTC(a, m - 1, j))
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j ? d : null
}

// « 31/12/2026 », « 31.12.2026 », « 31-12-2026 », « 2026-12-31 » (avec ou sans heure) -> date UTC. null si illisible.
export function lireDate(brut: string): Date | null {
  const s = brut.trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return dateValide(Number(m[1]), Number(m[2]), Number(m[3]))
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
  if (m) return dateValide(Number(m[3]), Number(m[2]), Number(m[1]))
  return null
}

export function lirePeriodicite(brut: string): Periodicite | null {
  const s = normaliser(brut)
  if (!s) return null
  if (/(mens|month|monat)/.test(s) || s === 'm') return 'MENSUELLE'
  if (/(trim|quarter|vierteljahr)/.test(s) || s === 't' || s === 'q') return 'TRIMESTRIELLE'
  return null
}

// « 63 » (mois ou trimestres selon l'unité choisie), « 21T » (trimestres, quelle que soit l'unité). null si illisible.
export function lireDureeMois(brut: string, unite: 'MOIS' | 'TRIMESTRES'): number | null {
  const s = brut.trim().toLowerCase().replace(/\s/g, '')
  const m = s.match(/^(\d{1,3})(t|trim\w*|trimestres?|q|m|mois)?$/)
  if (!m) return null
  const n = Number(m[1])
  const trimestres = m[2] ? /^(t|trim|q)/.test(m[2]) : unite === 'TRIMESTRES'
  const mois = trimestres ? n * 3 : n
  return mois >= 1 && mois <= 240 ? mois : null
}

// --- Lignes ------------------------------------------------------------------------------------------------------------

export type UniteLoyer = 'PAR_PERIODE' | 'PAR_MOIS'

export interface OptionsLecture {
  mapping: Mapping
  uniteDuree: 'MOIS' | 'TRIMESTRES'
  uniteLoyer?: UniteLoyer // PAR_MOIS : le fichier donne le loyer d'un mois ; il est converti en loyer de la période (×3 si trimestriel)
  periodiciteDefaut: Periodicite
}

export interface LigneLue {
  numero: number // numéro de ligne dans le fichier (l'en-tête est la ligne 1)
  ref: string | null
  statut: string | null
  client: string
  siret: string | null
  materiel: string | null
  loyerCentimes: number
  periodicite: Periodicite
  dureeMois: number
  dateDebut: Date | null
  dateFin: Date | null
  montantReelCentimes: number | null
  commercial: string | null
}

export function lireLignes(lignes: string[][], o: OptionsLecture): { lues: LigneLue[]; erreurs: { numero: number; message: string }[] } {
  const lues: LigneLue[] = []
  const erreurs: { numero: number; message: string }[] = []
  const valeur = (l: string[], c: Champ) => (o.mapping[c] === undefined ? '' : (l[o.mapping[c]!] ?? '').toString().trim())
  lignes.forEach((l, i) => {
    if (l.every(c => !String(c ?? '').trim())) return
    const numero = i + 2
    const problemes: string[] = []
    const client = valeur(l, 'client')
    if (!client) problemes.push('client manquant')
    const loyer = lireMontantCentimes(valeur(l, 'loyer'))
    if (loyer === null || loyer <= 0) problemes.push('loyer illisible')
    const brutPeriodicite = valeur(l, 'periodicite')
    const periodicite = brutPeriodicite ? lirePeriodicite(brutPeriodicite) : o.periodiciteDefaut
    if (!periodicite) problemes.push(`périodicité inconnue (« ${brutPeriodicite} »)`)
    const brutDebut = valeur(l, 'dateDebut')
    const dateDebut = brutDebut ? lireDate(brutDebut) : null
    if (brutDebut && !dateDebut) problemes.push('date du 1er loyer illisible')
    const brutFin = valeur(l, 'dateFin')
    let dateFin = brutFin ? lireDate(brutFin) : null
    if (brutFin && !dateFin) problemes.push('date de fin illisible')
    // durée : colonne dédiée, sinon déduite des dates de début et de fin
    const brutDuree = valeur(l, 'duree')
    const duree = brutDuree ? lireDureeMois(brutDuree, o.uniteDuree) : dateDebut && dateFin && periodicite ? dureeDepuisDates(dateDebut, dateFin, periodicite) : null
    if (duree === null) problemes.push(brutDuree || !(dateDebut && dateFin) ? 'durée illisible' : 'durée non déductible des dates')
    const brutReel = valeur(l, 'montantReel')
    const montantReel = brutReel ? lireMontantCentimes(brutReel) : null
    if (brutReel && montantReel === null) problemes.push('montant financé illisible')
    if (problemes.length) return erreurs.push({ numero, message: problemes.join(', ') })
    if (!dateFin && dateDebut) dateFin = dateFinDepuisDebut(dateDebut, duree!)
    const loyerPeriode = o.uniteLoyer === 'PAR_MOIS' && periodicite === 'TRIMESTRIELLE' ? loyer! * 3 : loyer!
    lues.push({
      numero, ref: valeur(l, 'ref') || null, statut: valeur(l, 'statut') || null, client, siret: valeur(l, 'siret').replace(/\D/g, '') || null, materiel: valeur(l, 'materiel') || null,
      loyerCentimes: loyerPeriode, periodicite: periodicite!, dureeMois: duree!, dateDebut, dateFin, montantReelCentimes: montantReel, commercial: valeur(l, 'commercial') || null,
    })
  })
  return { lues, erreurs }
}

// --- Loyer mensuel ou par période ? ------------------------------------------------------------------------------------
// Compare le loyer au montant financé : (loyer / montant) x durée en mois vaut environ 1,1 à 1,4 pour un loyer MENSUEL
// (le coefficient d'un financement tourne autour de 1,2 / durée) et environ 3,3 à 4,2 pour un loyer TRIMESTRIEL.
// Sert à pré-sélectionner l'unité du loyer et à avertir si le choix de l'utilisateur semble faux. Renvoie null si le fichier
// ne permet pas de conclure (colonnes absentes, ou valeurs mélangées).
export function detecterUniteLoyer(lignes: string[][], mapping: Mapping, uniteDuree: 'MOIS' | 'TRIMESTRES'): UniteLoyer | null {
  if (mapping.loyer === undefined || mapping.montantReel === undefined || mapping.duree === undefined) return null
  const rapports: number[] = []
  for (const l of lignes) {
    const loyer = lireMontantCentimes(String(l[mapping.loyer] ?? ''))
    const montant = lireMontantCentimes(String(l[mapping.montantReel] ?? ''))
    const duree = lireDureeMois(String(l[mapping.duree] ?? ''), uniteDuree)
    if (loyer && montant && duree && loyer > 0 && montant > 0) rapports.push((loyer / montant) * duree)
  }
  if (rapports.length < 3) return null
  rapports.sort((a, b) => a - b)
  const mediane = rapports[Math.floor(rapports.length / 2)]
  if (mediane < 2) return 'PAR_MOIS'
  if (mediane > 2.8) return 'PAR_PERIODE'
  return null
}
