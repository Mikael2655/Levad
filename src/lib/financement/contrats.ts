// Contrats en cours : liste filtrée, fiche, correction, import des contrats existants.
// Comme pour les demandes : le filtre « un commercial ne voit que ses contrats » est dans la requête SQL,
// et ce qui part au navigateur passe par vueContrat (jamais de montant réel pour un commercial).
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { grilleCommercialePour, grilleReelle } from './admin'
import { montantDepuisLoyer } from './calcul'
import { estInterne, peutImporterContrats, peutModifierContrat, vueContrat, type Acteur } from './droits'
import { ajouterMois, dateFinDepuisDebut, etatEcheance, moisRestants } from './echeances'
import { ErreurMetier } from './erreurs'
import { lireLignes, normaliser, OBLIGATOIRES, type Mapping, type UniteLoyer } from './import-contrats'

export type FiltreEcheance = 'en_cours' | 'proche6' | 'proche12' | 'echus' | 'toutes'
export interface FiltresContrats {
  financeurId?: number
  commercialId?: number // ignoré pour un commercial
  echeance?: FiltreEcheance
  q?: string
}

function conditions(a: Acteur, f: FiltresContrats, maintenant: Date): Prisma.FinContratWhereInput {
  const e = f.echeance ?? 'en_cours'
  const fin: Prisma.FinContratWhereInput =
    e === 'en_cours' ? { OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }] }
    : e === 'proche6' ? { dateFin: { gte: maintenant, lte: ajouterMois(maintenant, 6) } }
    : e === 'proche12' ? { dateFin: { gte: maintenant, lte: ajouterMois(maintenant, 12) } }
    : e === 'echus' ? { dateFin: { lt: maintenant } }
    : {}
  return {
    AND: [
      estInterne(a) ? (f.commercialId ? { commercialId: f.commercialId } : {}) : { commercialId: a.id },
      f.financeurId ? { financeurId: f.financeurId } : {},
      f.q?.trim() ? { raisonSociale: { contains: f.q.trim(), mode: 'insensitive' } } : {},
      fin,
    ],
  }
}

const NOMS = { commercial: { select: { prenom: true, nom: true } }, financeur: { select: { nom: true } } } as const

function enrichir(a: Acteur, c: Prisma.FinContratGetPayload<{ include: typeof NOMS }>, maintenant: Date) {
  const { commercial, financeur, ...base } = c
  return {
    ...vueContrat(a, base),
    commercialNom: `${commercial.prenom} ${commercial.nom}`,
    financeurNom: financeur.nom,
    moisRestants: moisRestants(base.dateFin, maintenant),
    etat: etatEcheance(base.dateFin, maintenant),
  }
}

export async function listerContrats(a: Acteur, f: FiltresContrats = {}) {
  const maintenant = new Date()
  const lignes = await prisma.finContrat.findMany({
    where: conditions(a, f, maintenant),
    orderBy: [{ dateFin: { sort: 'asc', nulls: 'last' } }, { raisonSociale: 'asc' }],
    include: NOMS,
  })
  return lignes.map(c => enrichir(a, c, maintenant))
}

// Nombre de contrats qui arrivent à échéance dans les 6 mois (bandeau du tableau de bord).
export async function compterEcheancesProches(a: Acteur): Promise<number> {
  return prisma.finContrat.count({ where: conditions(a, { echeance: 'proche6' }, new Date()) })
}

export async function lireContrat(a: Acteur, id: number) {
  const c = await prisma.finContrat.findFirst({ where: { id, ...(estInterne(a) ? {} : { commercialId: a.id }) }, include: NOMS })
  return c ? enrichir(a, c, new Date()) : null
}

export async function modifierContrat(a: Acteur, id: number, d: { materiel?: string; refFinanceur?: string | null; dateDebut?: Date | null; dateFin?: Date | null; commercialId?: number }) {
  if (!peutModifierContrat(a)) throw new ErreurMetier('Action non autorisée.', 403)
  const c = await prisma.finContrat.findUnique({ where: { id } })
  if (!c) throw new ErreurMetier('Contrat introuvable.', 404)
  if (d.materiel !== undefined && !d.materiel.trim()) throw new ErreurMetier('Le matériel ne peut pas être vide.')
  const dateDebut = d.dateDebut !== undefined ? d.dateDebut : c.dateDebut
  // fin explicite si fournie ; sinon, un nouveau 1er loyer recalcule la fin
  const dateFin = d.dateFin !== undefined ? d.dateFin : d.dateDebut !== undefined && dateDebut ? dateFinDepuisDebut(dateDebut, c.dureeMois) : c.dateFin
  if (dateDebut && dateFin && dateFin <= dateDebut) throw new ErreurMetier('La date de fin doit être postérieure au 1er loyer.')
  // Changement de commercial : le montant commercial est recalculé avec la grille du nouveau commercial (le loyer ne change pas).
  let rattachement: { commercialId: number; montantCommercialCentimes: number | null } | null = null
  if (d.commercialId !== undefined && d.commercialId !== c.commercialId) {
    const u = await prisma.finUtilisateur.findUnique({ where: { id: d.commercialId } })
    if (!u || !u.actif || (u.role !== 'COMMERCIAL' && u.role !== 'ADMIN')) throw new ErreurMetier('Commercial invalide.')
    const financeur = await prisma.finFinanceur.findUniqueOrThrow({ where: { id: c.financeurId } })
    const grille = await grilleCommercialePour(c.financeurId, u.id)
    const r = grille ? montantDepuisLoyer(grille, c.dureeMois, c.periodicite as 'MENSUELLE' | 'TRIMESTRIELLE', financeur.majorationMensuelleBp, c.loyerCentimes) : null
    rattachement = { commercialId: u.id, montantCommercialCentimes: r?.montantCentimes ?? null }
  }
  await prisma.finContrat.update({
    where: { id },
    data: {
      ...(rattachement ?? {}),
      ...(d.materiel !== undefined ? { materiel: d.materiel.trim() } : {}),
      ...(d.refFinanceur !== undefined ? { refFinanceur: d.refFinanceur?.trim() || null } : {}),
      dateDebut,
      dateFin,
    },
  })
  return { ok: true }
}

// --- Import ------------------------------------------------------------------------------------------------------------

export interface DemandeImport {
  financeurId: number
  lignes: string[][]
  mapping: Mapping
  uniteDuree: 'MOIS' | 'TRIMESTRES'
  uniteLoyer: UniteLoyer
  periodiciteDefaut: 'MENSUELLE' | 'TRIMESTRIELLE'
  commercialDefautId: number | null
  statutsRetenus: string[] | null // seuls ces statuts du fichier sont importés (null : tous)
  simuler: boolean
}

export interface ResultatLigneImport {
  numero: number
  client: string
  ref: string | null
  etat: 'OK' | 'DOUBLON' | 'IGNORE' | 'ERREUR'
  message?: string
  loyerCentimes?: number
  montantReelCentimes?: number
  montantCommercialCentimes?: number | null
  commercialNom?: string
}

interface Candidat { id: number; prenom: string; nom: string; email: string }

// E-mail exact, sinon « prénom nom » ou « nom prénom » (accents et casse ignorés), sinon nom de famille seul s'il est unique.
function trouverCommercial(texte: string, candidats: Candidat[]): Candidat | null {
  const t = texte.trim().toLowerCase()
  if (t.includes('@')) return candidats.find(c => c.email === t) ?? null
  const n = normaliser(texte)
  const complet = candidats.filter(c => normaliser(`${c.prenom} ${c.nom}`) === n || normaliser(`${c.nom} ${c.prenom}`) === n)
  if (complet.length === 1) return complet[0]
  const parNom = candidats.filter(c => normaliser(c.nom) === n)
  return parNom.length === 1 ? parNom[0] : null
}

export async function traiterImport(a: Acteur, p: DemandeImport) {
  if (!peutImporterContrats(a)) throw new ErreurMetier('Action non autorisée.', 403)
  const financeur = await prisma.finFinanceur.findUnique({ where: { id: p.financeurId } })
  if (!financeur) throw new ErreurMetier('Financeur introuvable.', 404)
  for (const champ of OBLIGATOIRES) if (p.mapping[champ] === undefined) throw new ErreurMetier('Indiquez la colonne du client, du loyer et de la durée.')

  const candidats: Candidat[] = (await prisma.finUtilisateur.findMany({ where: { actif: true, role: { in: ['COMMERCIAL', 'ADMIN'] } }, select: { id: true, prenom: true, nom: true, email: true } }))
  const defaut = p.commercialDefautId ? candidats.find(c => c.id === p.commercialDefautId) : undefined
  if (p.commercialDefautId && !defaut) throw new ErreurMetier('Commercial par défaut invalide.')

  const { lues, erreurs } = lireLignes(p.lignes, { mapping: p.mapping, uniteDuree: p.uniteDuree, uniteLoyer: p.uniteLoyer, periodiciteDefaut: p.periodiciteDefaut })
  const resultats: ResultatLigneImport[] = erreurs.map(e => ({ numero: e.numero, client: '', ref: null, etat: 'ERREUR', message: e.message }))

  const refs = lues.map(l => l.ref).filter((r): r is string => !!r)
  const existantes = new Set((await prisma.finContrat.findMany({ where: { financeurId: financeur.id, refFinanceur: { in: refs } }, select: { refFinanceur: true } })).map(c => c.refFinanceur))
  const vues = new Set<string>()
  const reelle = await grilleReelle(financeur.id)
  const grilles = new Map<number, Awaited<ReturnType<typeof grilleCommercialePour>>>()
  const aCreer: Prisma.FinContratCreateManyInput[] = []

  for (const l of lues) {
    const base = { numero: l.numero, client: l.client, ref: l.ref }
    if (p.statutsRetenus && !p.statutsRetenus.includes(l.statut ?? '')) { resultats.push({ ...base, etat: 'IGNORE', message: `Statut non retenu : ${l.statut ?? 'vide'}` }); continue }
    if (l.ref && (existantes.has(l.ref) || vues.has(l.ref))) { resultats.push({ ...base, etat: 'DOUBLON', message: 'Contrat déjà présent (même n° de contrat)' }); continue }
    if (l.ref) vues.add(l.ref)

    const commercial = l.commercial ? (trouverCommercial(l.commercial, candidats) ?? defaut ?? null) : (defaut ?? null)
    if (!commercial) { resultats.push({ ...base, etat: 'ERREUR', message: l.commercial ? `Commercial introuvable : « ${l.commercial} » (choisissez un commercial par défaut)` : 'Aucun commercial indiqué (choisissez un commercial par défaut)' }); continue }

    if (!grilles.has(commercial.id)) grilles.set(commercial.id, await grilleCommercialePour(financeur.id, commercial.id))
    const grille = grilles.get(commercial.id)
    // montant commercial RECALCULÉ avec le barème du commercial ; le loyer, lui, reste celui du contrat
    const recalcule = grille ? montantDepuisLoyer(grille, l.dureeMois, l.periodicite, financeur.majorationMensuelleBp, l.loyerCentimes) : null
    const montantReel = l.montantReelCentimes ?? (reelle ? montantDepuisLoyer(reelle, l.dureeMois, l.periodicite, financeur.majorationMensuelleBp, l.loyerCentimes)?.montantCentimes : null) ?? null
    if (montantReel === null) { resultats.push({ ...base, etat: 'ERREUR', message: 'Montant financé absent et non calculable avec le barème réel' }); continue }

    resultats.push({ ...base, etat: 'OK', loyerCentimes: l.loyerCentimes, montantReelCentimes: montantReel, montantCommercialCentimes: recalcule?.montantCentimes ?? null, commercialNom: `${commercial.prenom} ${commercial.nom}` })
    aCreer.push({
      importe: true, refFinanceur: l.ref, statutFinanceur: l.statut, financeurId: financeur.id, commercialId: commercial.id, raisonSociale: l.client, siret: l.siret, materiel: l.materiel ?? 'Non précisé',
      periodicite: l.periodicite, dureeMois: l.dureeMois, loyerCentimes: l.loyerCentimes, dateDebut: l.dateDebut, dateFin: l.dateFin,
      montantCommercialCentimes: recalcule?.montantCentimes ?? null, montantReelCentimes: montantReel,
    })
  }

  if (!p.simuler && aCreer.length) await prisma.finContrat.createMany({ data: aCreer })
  resultats.sort((x, y) => x.numero - y.numero)
  const compte = (e: ResultatLigneImport['etat']) => resultats.filter(r => r.etat === e).length
  return { simule: p.simuler, importes: compte('OK'), doublons: compte('DOUBLON'), ignores: compte('IGNORE'), erreurs: compte('ERREUR'), lignes: resultats.slice(0, 500), tronque: resultats.length > 500 }
}
