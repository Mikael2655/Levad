// Services d'administration : utilisateurs, financeurs, grilles. Appelés uniquement après un contrôle de rôle ADMIN
// (voir garde.ts). Les règles métier (dernier administrateur, mot de passe...) sont ici, pas dans les écrans.
import { prisma } from '@/lib/db'
import type { Grille } from './calcul'
import type { Role } from './droits'
import { lignesVersMatrice, matriceVersLignes, validerMatrice, type Matrice } from './grilles'
import { genererMotDePasseProvisoire, hasher, motDePasseValide, verifier } from './motdepasse'

import { ErreurMetier } from './erreurs'
export { ErreurMetier }

const ROLES: Role[] = ['ADMIN', 'ASSISTANTE', 'COMMERCIAL']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// --- Utilisateurs ----------------------------------------------------------------------------------------------------

const CHAMPS_UTILISATEUR = { id: true, email: true, prenom: true, nom: true, role: true, actif: true, doitChangerMotDePasse: true, creeLe: true } as const

export const listerUtilisateurs = () => prisma.finUtilisateur.findMany({ select: CHAMPS_UTILISATEUR, orderBy: [{ actif: 'desc' }, { nom: 'asc' }] })

export async function creerUtilisateur(d: { email: string; prenom: string; nom: string; role: string }) {
  const email = d.email.trim().toLowerCase()
  if (!EMAIL.test(email)) throw new ErreurMetier('Adresse e-mail invalide.')
  if (!d.prenom.trim() || !d.nom.trim()) throw new ErreurMetier('Prénom et nom obligatoires.')
  if (!ROLES.includes(d.role as Role)) throw new ErreurMetier('Rôle inconnu.')
  if (await prisma.finUtilisateur.findUnique({ where: { email } })) throw new ErreurMetier('Cette adresse est déjà utilisée.', 409)
  const motDePasseProvisoire = genererMotDePasseProvisoire()
  const utilisateur = await prisma.finUtilisateur.create({
    data: { email, prenom: d.prenom.trim(), nom: d.nom.trim(), role: d.role, motDePasseHash: await hasher(motDePasseProvisoire), doitChangerMotDePasse: true },
    select: CHAMPS_UTILISATEUR,
  })
  return { utilisateur, motDePasseProvisoire }
}

async function autresAdminsActifs(sauf: number) {
  return prisma.finUtilisateur.count({ where: { role: 'ADMIN', actif: true, id: { not: sauf } } })
}

export async function modifierUtilisateur(acteurId: number, id: number, d: { prenom?: string; nom?: string; role?: string; actif?: boolean }) {
  const cible = await prisma.finUtilisateur.findUnique({ where: { id } })
  if (!cible) throw new ErreurMetier('Utilisateur introuvable.', 404)
  if (d.role !== undefined && !ROLES.includes(d.role as Role)) throw new ErreurMetier('Rôle inconnu.')
  if (id === acteurId && d.actif === false) throw new ErreurMetier('Vous ne pouvez pas désactiver votre propre compte.')
  const perdAdmin = cible.actif && cible.role === 'ADMIN' && ((d.role !== undefined && d.role !== 'ADMIN') || d.actif === false)
  if (perdAdmin && (await autresAdminsActifs(id)) === 0) throw new ErreurMetier('Il doit rester au moins un administrateur actif.')
  return prisma.finUtilisateur.update({
    where: { id },
    data: {
      ...(d.prenom?.trim() ? { prenom: d.prenom.trim() } : {}),
      ...(d.nom?.trim() ? { nom: d.nom.trim() } : {}),
      ...(d.role !== undefined ? { role: d.role } : {}),
      ...(d.actif !== undefined ? { actif: d.actif } : {}),
    },
    select: CHAMPS_UTILISATEUR,
  })
}

// Nouveau mot de passe provisoire, à communiquer à l'utilisateur. Ses sessions ouvertes sont refusées.
export async function reinitialiserMotDePasse(id: number) {
  if (!(await prisma.finUtilisateur.findUnique({ where: { id }, select: { id: true } }))) throw new ErreurMetier('Utilisateur introuvable.', 404)
  const motDePasseProvisoire = genererMotDePasseProvisoire()
  await prisma.finUtilisateur.update({
    where: { id },
    data: { motDePasseHash: await hasher(motDePasseProvisoire), doitChangerMotDePasse: true, motDePasseChangeLe: new Date() },
  })
  return { motDePasseProvisoire }
}

export async function changerMotDePasse(id: number, ancien: string, nouveau: string) {
  const u = await prisma.finUtilisateur.findUnique({ where: { id } })
  if (!u || !(await verifier(ancien, u.motDePasseHash))) throw new ErreurMetier('Mot de passe actuel incorrect.', 403)
  const probleme = motDePasseValide(nouveau)
  if (probleme) throw new ErreurMetier(probleme)
  if (nouveau === ancien) throw new ErreurMetier('Le nouveau mot de passe doit être différent de l’ancien.')
  await prisma.finUtilisateur.update({ where: { id }, data: { motDePasseHash: await hasher(nouveau), doitChangerMotDePasse: false, motDePasseChangeLe: new Date() } })
}

// --- Financeurs ------------------------------------------------------------------------------------------------------

export const CONNECTEURS = ['manuel'] as const // « grenke_api » s'ajoutera quand le connecteur existera

export interface DonneesFinanceur {
  nom?: string
  connecteur?: string
  actif?: boolean
  majorationMensuelleBp?: number
  commissionBp?: number | null
  fraisDossierCentimes?: number
  signatureElectronique?: boolean
  envoiParMail?: boolean
  destinataireMailId?: number | null
}

function verifierFinanceur(d: DonneesFinanceur) {
  if (d.nom !== undefined && !d.nom.trim()) throw new ErreurMetier('Le nom est obligatoire.')
  if (d.connecteur !== undefined && !(CONNECTEURS as readonly string[]).includes(d.connecteur)) throw new ErreurMetier('Connecteur indisponible.')
  const entier = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max
  if (d.majorationMensuelleBp !== undefined && !entier(d.majorationMensuelleBp, 0, 2000)) throw new ErreurMetier('Majoration mensuelle : entre 0 et 20 %.')
  if (d.commissionBp != null && !entier(d.commissionBp, 0, 3000)) throw new ErreurMetier('Commission : entre 0 et 30 %.')
  if (d.fraisDossierCentimes !== undefined && !entier(d.fraisDossierCentimes, 0, 10_000_000)) throw new ErreurMetier('Frais de dossier invalides.')
}

export const listerFinanceurs = () => prisma.finFinanceur.findMany({ orderBy: { nom: 'asc' } })

export async function creerFinanceur(d: DonneesFinanceur & { nom: string }) {
  verifierFinanceur(d)
  if (await prisma.finFinanceur.findUnique({ where: { nom: d.nom.trim() } })) throw new ErreurMetier('Ce financeur existe déjà.', 409)
  return prisma.finFinanceur.create({
    data: { nom: d.nom.trim(), connecteur: d.connecteur ?? 'manuel', signatureElectronique: d.signatureElectronique ?? true, envoiParMail: d.envoiParMail ?? false, majorationMensuelleBp: d.majorationMensuelleBp ?? 150, commissionBp: d.commissionBp ?? null, fraisDossierCentimes: d.fraisDossierCentimes ?? 0 },
  })
}

export async function modifierFinanceur(id: number, d: DonneesFinanceur) {
  verifierFinanceur(d)
  if (d.destinataireMailId != null) {
    const u = await prisma.finUtilisateur.findUnique({ where: { id: d.destinataireMailId } })
    if (!u || !u.actif || (u.role !== 'ADMIN' && u.role !== 'ASSISTANTE')) throw new ErreurMetier('Le destinataire doit être un administrateur ou une assistante actifs.')
  }
  if (!(await prisma.finFinanceur.findUnique({ where: { id }, select: { id: true } }))) throw new ErreurMetier('Financeur introuvable.', 404)
  if (d.nom !== undefined) {
    const autre = await prisma.finFinanceur.findUnique({ where: { nom: d.nom.trim() } })
    if (autre && autre.id !== id) throw new ErreurMetier('Ce nom est déjà pris.', 409)
  }
  return prisma.finFinanceur.update({
    where: { id },
    data: {
      ...(d.nom !== undefined ? { nom: d.nom.trim() } : {}),
      ...(d.connecteur !== undefined ? { connecteur: d.connecteur } : {}),
      ...(d.actif !== undefined ? { actif: d.actif } : {}),
      ...(d.majorationMensuelleBp !== undefined ? { majorationMensuelleBp: d.majorationMensuelleBp } : {}),
      ...(d.commissionBp !== undefined ? { commissionBp: d.commissionBp } : {}),
      ...(d.fraisDossierCentimes !== undefined ? { fraisDossierCentimes: d.fraisDossierCentimes } : {}),
      ...(d.signatureElectronique !== undefined ? { signatureElectronique: d.signatureElectronique } : {}),
      ...(d.envoiParMail !== undefined ? { envoiParMail: d.envoiParMail } : {}),
      ...(d.destinataireMailId !== undefined ? { destinataireMailId: d.destinataireMailId } : {}),
    },
  })
}

// --- Grilles ---------------------------------------------------------------------------------------------------------
// REELLE : barème du financeur. COMMERCIALE sans utilisateur : barème commun des commerciaux.
// COMMERCIALE avec utilisateur : barème propre à ce commercial (prioritaire sur le commun).

export type TypeGrille = 'REELLE' | 'COMMERCIALE'
export interface CibleGrille {
  financeurId: number
  type: TypeGrille
  utilisateurId: number | null
}

const trouver = (c: CibleGrille) =>
  prisma.finGrille.findFirst({ where: { financeurId: c.financeurId, type: c.type, utilisateurId: c.utilisateurId }, include: { lignes: true } })

export async function lireGrille(c: CibleGrille): Promise<{ id: number; base: string; matrice: Matrice } | null> {
  const g = await trouver(c)
  return g ? { id: g.id, base: g.base, matrice: lignesVersMatrice(g.lignes) } : null
}

async function verifierCible(c: CibleGrille) {
  if (!(await prisma.finFinanceur.findUnique({ where: { id: c.financeurId }, select: { id: true } }))) throw new ErreurMetier('Financeur introuvable.', 404)
  if (c.type === 'REELLE' && c.utilisateurId !== null) throw new ErreurMetier('Un barème réel n’est pas lié à un commercial.')
  if (c.utilisateurId !== null) {
    const u = await prisma.finUtilisateur.findUnique({ where: { id: c.utilisateurId } })
    if (!u || u.role !== 'COMMERCIAL') throw new ErreurMetier('Ce barème ne peut concerner qu’un commercial.')
  }
}

export async function enregistrerGrille(c: CibleGrille, base: string, matrice: Matrice) {
  await verifierCible(c)
  if (base !== 'MENSUEL' && base !== 'TRIMESTRIEL') throw new ErreurMetier('Unité du coefficient inconnue.')
  const problemes = validerMatrice(matrice)
  if (problemes.length) throw new ErreurMetier(problemes.join(' '))
  await prisma.$transaction(async tx => {
    const existante = await tx.finGrille.findFirst({ where: { financeurId: c.financeurId, type: c.type, utilisateurId: c.utilisateurId } })
    const grille = existante
      ? await tx.finGrille.update({ where: { id: existante.id }, data: { base } })
      : await tx.finGrille.create({ data: { financeurId: c.financeurId, type: c.type, utilisateurId: c.utilisateurId, base } })
    await tx.finGrilleLigne.deleteMany({ where: { grilleId: grille.id } })
    await tx.finGrilleLigne.createMany({ data: matriceVersLignes(matrice).map(l => ({ ...l, grilleId: grille.id })) })
  })
}

// Crée un barème propre à un commercial, copie du barème commun, à ajuster ensuite.
export async function creerGrillePropre(financeurId: number, utilisateurId: number) {
  const cible: CibleGrille = { financeurId, type: 'COMMERCIALE', utilisateurId }
  await verifierCible(cible)
  if (await trouver(cible)) throw new ErreurMetier('Ce commercial a déjà son propre barème.', 409)
  const commune = await lireGrille({ financeurId, type: 'COMMERCIALE', utilisateurId: null })
  if (!commune) throw new ErreurMetier('Créez d’abord le barème commun des commerciaux.')
  await enregistrerGrille(cible, commune.base, commune.matrice)
}

export async function supprimerGrillePropre(financeurId: number, utilisateurId: number) {
  const g = await trouver({ financeurId, type: 'COMMERCIALE', utilisateurId })
  if (!g) throw new ErreurMetier('Aucun barème propre à supprimer.', 404)
  await prisma.finGrille.delete({ where: { id: g.id } })
}

const versGrille = (g: { base: string; lignes: { dureeMois: number; montantMinCentimes: number; coefficientBp: number }[] }): Grille => ({
  base: g.base as Grille['base'],
  lignes: g.lignes.map(l => ({ dureeMois: l.dureeMois, montantMinCentimes: l.montantMinCentimes, coefficientBp: l.coefficientBp })),
})

export async function grilleReelle(financeurId: number): Promise<Grille | null> {
  const g = await trouver({ financeurId, type: 'REELLE', utilisateurId: null })
  return g ? versGrille(g) : null
}

// Barème utilisé pour calculer les montants d'un commercial : le sien s'il en a un, sinon le barème commun.
export async function grilleCommercialePour(financeurId: number, utilisateurId: number): Promise<Grille | null> {
  const g = (await trouver({ financeurId, type: 'COMMERCIALE', utilisateurId })) ?? (await trouver({ financeurId, type: 'COMMERCIALE', utilisateurId: null }))
  return g ? versGrille(g) : null
}
