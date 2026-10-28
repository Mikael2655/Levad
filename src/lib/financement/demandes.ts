// Actions sur les demandes : création, modification, statuts, signature, archivage, suppression.
// Chaque fonction contrôle les droits ET recalcule les montants côté serveur : ce que le navigateur envoie
// (montants, commercial, statut) n'est jamais cru tel quel.
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { grilleCommercialePour, grilleReelle } from './admin'
import { calculerDemande, dureesDisponibles, loyerDepuisMontant, type Periodicite } from './calcul'
import { estInterne, peutArchiver, peutChangerStatut, peutModifier, peutSupprimer, type Acteur, type ResultatCalcul } from './droits'
import { ErreurMetier } from './erreurs'
import { numeroEntrepriseValide, chiffres } from './siren'
import { peutEnvoyerEnSignature, statutsAccessibles } from './statuts'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// --- Saisie ----------------------------------------------------------------------------------------------------------

export interface EntreeLigne {
  designation: string
  quantite: number
  montantHtCentimes: number | null
  typeBien: string | null
  constructeur: string | null
}

export interface EntreeDemande {
  financeurId: number
  commercialId: number | null
  raisonSociale: string
  siret: string
  formeJuridique: string | null
  adresse: string
  codePostal: string | null
  ville: string | null
  pays: string
  contactPrenom: string
  contactNom: string
  contactEmail: string
  contactTel: string | null
  dureeMois: number
  periodicite: Periodicite
  loyerCentimes: number | null // le loyer OU le montant : l'autre se déduit
  montantCentimes: number | null
  lignes: EntreeLigne[]
}

const texte = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const optionnel = (v: unknown) => texte(v) || null
const entierOuNull = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))

// Reçoit le corps JSON brut d'une requête et ne retient que les champs attendus, avec le bon type.
export function normaliserEntree(c: Record<string, any>): EntreeDemande {
  return {
    financeurId: Number(c.financeurId),
    commercialId: entierOuNull(c.commercialId),
    raisonSociale: texte(c.raisonSociale),
    siret: chiffres(texte(c.siret)),
    formeJuridique: optionnel(c.formeJuridique),
    adresse: texte(c.adresse),
    codePostal: optionnel(c.codePostal),
    ville: optionnel(c.ville),
    pays: texte(c.pays) || 'France',
    contactPrenom: texte(c.contactPrenom),
    contactNom: texte(c.contactNom),
    contactEmail: texte(c.contactEmail).toLowerCase(),
    contactTel: optionnel(c.contactTel),
    dureeMois: Number(c.dureeMois),
    periodicite: c.periodicite === 'MENSUELLE' ? 'MENSUELLE' : 'TRIMESTRIELLE',
    loyerCentimes: entierOuNull(c.loyerCentimes),
    montantCentimes: entierOuNull(c.montantCentimes),
    lignes: (Array.isArray(c.lignes) ? c.lignes : []).map((l: Record<string, any>) => ({
      designation: texte(l?.designation),
      quantite: Number(l?.quantite ?? 1),
      montantHtCentimes: entierOuNull(l?.montantHtCentimes),
      typeBien: optionnel(l?.typeBien),
      constructeur: optionnel(l?.constructeur),
    })),
  }
}

export function validerEntree(e: EntreeDemande): string[] {
  const p: string[] = []
  if (!Number.isInteger(e.financeurId)) p.push('Choisissez un financeur.')
  if (!e.raisonSociale) p.push('La raison sociale est obligatoire.')
  if (e.siret && !numeroEntrepriseValide(e.siret)) p.push('Le SIREN / SIRET est invalide (9 ou 14 chiffres, clé incorrecte).')
  if (!e.adresse) p.push('L’adresse est obligatoire.')
  // Le contact (prénom, nom, e-mail) n'est pas demandé à la saisie : il est renseigné à l'envoi en signature.
  if (e.contactEmail && !EMAIL.test(e.contactEmail)) p.push('L’adresse e-mail du contact est invalide.')
  if (!Number.isInteger(e.dureeMois) || e.dureeMois <= 0) p.push('Choisissez une durée.')
  const loyer = e.loyerCentimes
  const montant = e.montantCentimes
  if (!((loyer != null && Number.isInteger(loyer) && loyer > 0) || (montant != null && Number.isInteger(montant) && montant > 0))) p.push('Indiquez le loyer ou le montant à financer.')
  if (e.lignes.length === 0) p.push('Ajoutez au moins une ligne de matériel ou de prestation.')
  if (e.lignes.some(l => !l.designation)) p.push('Chaque ligne doit avoir une désignation.')
  if (e.lignes.some(l => !Number.isInteger(l.quantite) || l.quantite < 1)) p.push('Quantité invalide.')
  if (e.lignes.some(l => l.montantHtCentimes != null && (!Number.isInteger(l.montantHtCentimes) || l.montantHtCentimes < 0))) p.push('Montant de ligne invalide.')
  return p
}

// --- Calcul ----------------------------------------------------------------------------------------------------------

export async function calculer(p: {
  financeurId: number
  commercialId: number
  dureeMois: number | null
  periodicite: Periodicite
  loyerCentimes: number | null
  montantCentimes: number | null
}): Promise<ResultatCalcul> {
  const financeur = await prisma.finFinanceur.findUnique({ where: { id: p.financeurId } })
  if (!financeur || !financeur.actif) throw new ErreurMetier('Financeur indisponible.')
  const reelle = await grilleReelle(financeur.id)
  const commerciale = await grilleCommercialePour(financeur.id, p.commercialId)
  if (!reelle || !commerciale) throw new ErreurMetier('Les barèmes de ce financeur ne sont pas encore configurés.')
  const durees = dureesDisponibles(reelle, commerciale)
  const loyerSaisi = p.loyerCentimes && p.loyerCentimes > 0 ? p.loyerCentimes : null
  const montantSaisi = p.montantCentimes && p.montantCentimes > 0 ? p.montantCentimes : null
  if (!p.dureeMois || (!loyerSaisi && !montantSaisi)) return { dureesDisponibles: durees, resultat: null }
  if (!durees.includes(p.dureeMois)) throw new ErreurMetier(`La durée de ${p.dureeMois} mois n’est pas disponible pour ce financeur.`)

  let loyer = loyerSaisi
  if (!loyer) {
    const l = loyerDepuisMontant(commerciale, p.dureeMois, p.periodicite, financeur.majorationMensuelleBp, montantSaisi!)
    if (!l) throw new ErreurMetier('Calcul impossible pour ce montant.')
    loyer = l.loyerCentimes
  }
  const r = calculerDemande({ loyerCentimes: loyer, dureeMois: p.dureeMois, periodicite: p.periodicite, majorationMensuelleBp: financeur.majorationMensuelleBp, grilleReelle: reelle, grilleCommerciale: commerciale })
  if (!r) throw new ErreurMetier('Calcul impossible avec ces valeurs.')
  return { dureesDisponibles: durees, resultat: { loyerCentimes: loyer, commercial: r.commercial, reel: r.reel, margeCentimes: r.margeCentimes } }
}

// --- Création / modification -----------------------------------------------------------------------------------------

// Commercial rattaché. Un commercial saisit pour lui seul ; l'admin et l'assistante choisissent (l'admin pour lui-même par défaut).
async function resoudreCommercial(a: Acteur, demande: number | null): Promise<number> {
  if (!estInterne(a)) {
    if (demande != null && demande !== a.id) throw new ErreurMetier('Vous ne pouvez saisir que pour vous-même.', 403)
    return a.id
  }
  const id = demande ?? (a.role === 'ADMIN' ? a.id : null)
  if (id == null) throw new ErreurMetier('Choisissez le commercial rattaché à la demande.')
  const u = await prisma.finUtilisateur.findUnique({ where: { id } })
  if (!u || !u.actif || (u.role !== 'COMMERCIAL' && u.role !== 'ADMIN')) throw new ErreurMetier('Commercial invalide.')
  return id
}

async function preparer(a: Acteur, e: EntreeDemande, commercialDemande: number | null) {
  const problemes = validerEntree(e)
  if (problemes.length) throw new ErreurMetier(problemes.join(' '))
  const commercialId = await resoudreCommercial(a, commercialDemande)
  const { resultat } = await calculer({ financeurId: e.financeurId, commercialId, dureeMois: e.dureeMois, periodicite: e.periodicite, loyerCentimes: e.loyerCentimes, montantCentimes: e.montantCentimes })
  if (!resultat) throw new ErreurMetier('Calcul impossible.')
  const donnees = {
    financeurId: e.financeurId,
    commercialId,
    raisonSociale: e.raisonSociale,
    siret: e.siret,
    formeJuridique: e.formeJuridique,
    adresse: e.adresse,
    codePostal: e.codePostal,
    ville: e.ville,
    pays: e.pays,
    contactPrenom: e.contactPrenom,
    contactNom: e.contactNom,
    contactEmail: e.contactEmail,
    contactTel: e.contactTel,
    dureeMois: e.dureeMois,
    periodicite: e.periodicite,
    loyerCentimes: resultat.loyerCentimes,
    montantCommercialCentimes: resultat.commercial.montantCentimes,
    coefficientCommercialPpm: resultat.commercial.coefficientPpm,
    montantReelCentimes: resultat.reel.montantCentimes,
    coefficientReelPpm: resultat.reel.coefficientPpm,
    horsTranche: resultat.commercial.horsTranche || resultat.reel.horsTranche,
  }
  const lignes = e.lignes.map(l => ({ designation: l.designation, quantite: l.quantite, montantHtCentimes: l.montantHtCentimes, typeBien: l.typeBien, constructeur: l.constructeur }))
  return { donnees, lignes }
}

async function nouvelleReference(tx: Prisma.TransactionClient): Promise<string> {
  const prefixe = `LEV-${new Date().getFullYear()}-`
  const derniere = await tx.finDemande.findFirst({ where: { reference: { startsWith: prefixe } }, orderBy: { reference: 'desc' }, select: { reference: true } })
  const n = derniere ? Number(derniere.reference.slice(prefixe.length)) + 1 : 1
  return prefixe + String(n).padStart(4, '0')
}

export async function creerDemande(a: Acteur, e: EntreeDemande): Promise<{ id: number; reference: string }> {
  const { donnees, lignes } = await preparer(a, e, e.commercialId)
  for (let essai = 0; ; essai++) {
    try {
      return await prisma.$transaction(async tx => {
        const reference = await nouvelleReference(tx)
        const d = await tx.finDemande.create({
          data: { ...donnees, reference, saisiParId: a.id, lignes: { create: lignes }, historique: { create: { auteurId: a.id, nouveauStatut: 'BROUILLON', commentaire: 'Demande créée' } } },
          select: { id: true, reference: true },
        })
        return d
      })
    } catch (err) {
      // deux créations simultanées ont obtenu le même numéro : on retente
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && essai < 4) continue
      throw err
    }
  }
}

async function trouverAccessible(a: Acteur, id: number) {
  const d = await prisma.finDemande.findFirst({ where: { id, ...(estInterne(a) ? {} : { commercialId: a.id }) } })
  if (!d) throw new ErreurMetier('Demande introuvable.', 404)
  return d
}

export async function modifierDemande(a: Acteur, id: number, e: EntreeDemande): Promise<{ id: number }> {
  const d = await trouverAccessible(a, id)
  if (!peutModifier(a, d)) throw new ErreurMetier('Cette demande ne peut plus être modifiée.', 403)
  const { donnees, lignes } = await preparer(a, e, e.commercialId ?? d.commercialId)
  await prisma.$transaction([
    prisma.finDemande.update({ where: { id }, data: donnees }),
    prisma.finDemandeLigne.deleteMany({ where: { demandeId: id } }),
    prisma.finDemandeLigne.createMany({ data: lignes.map(l => ({ ...l, demandeId: id })) }),
    prisma.finHistorique.create({ data: { demandeId: id, auteurId: a.id, ancienStatut: d.statut, nouveauStatut: d.statut, commentaire: 'Demande modifiée' } }),
  ])
  return { id }
}

// --- Statuts ---------------------------------------------------------------------------------------------------------

export const resumeMateriel = (lignes: { designation: string; quantite: number; constructeur: string | null }[]) =>
  lignes.map(l => `${l.quantite} × ${l.designation}${l.constructeur ? ` (${l.constructeur})` : ''}`).join(' ; ')

export async function changerStatut(a: Acteur, id: number, p: { statut: string; commentaire?: string; infosManquantes?: string; refFinanceur?: string }) {
  const d = await trouverAccessible(a, id)
  if (!(statutsAccessibles(a, d) as string[]).includes(p.statut)) throw new ErreurMetier('Ce changement de statut n’est pas possible.', 403)
  const infos = (p.infosManquantes ?? '').trim()
  if (p.statut === 'INFOS_MANQUANTES' && !infos) throw new ErreurMetier('Indiquez les pièces ou informations demandées.')
  if (p.statut === 'ENVOYEE' && !numeroEntrepriseValide(d.siret)) throw new ErreurMetier('Renseignez un SIREN / SIRET valide avant d’envoyer au financeur.')
  const commentaire = [p.commentaire?.trim(), p.statut === 'INFOS_MANQUANTES' ? `Demandé : ${infos}` : ''].filter(Boolean).join(' — ') || null
  const ref = peutChangerStatut(a) ? p.refFinanceur?.trim() : undefined
  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.finDemande.update({ where: { id }, data: { statut: p.statut, infosManquantes: p.statut === 'INFOS_MANQUANTES' ? infos : null, ...(ref ? { refFinanceur: ref } : {}) } }),
    prisma.finHistorique.create({ data: { demandeId: id, auteurId: a.id, ancienStatut: d.statut, nouveauStatut: p.statut, commentaire } }),
  ]
  // Une demande signée devient un contrat en cours (la date du 1er loyer sera renseignée ensuite).
  if (p.statut === 'SIGNEE') {
    const lignes = await prisma.finDemandeLigne.findMany({ where: { demandeId: id }, orderBy: { id: 'asc' } })
    operations.push(
      prisma.finContrat.create({
        data: {
          demandeId: id, importe: false, refFinanceur: ref || d.refFinanceur, financeurId: d.financeurId, commercialId: d.commercialId,
          raisonSociale: d.raisonSociale, siret: d.siret || null, materiel: resumeMateriel(lignes), periodicite: d.periodicite, dureeMois: d.dureeMois,
          loyerCentimes: d.loyerCentimes, montantCommercialCentimes: d.montantCommercialCentimes, montantReelCentimes: d.montantReelCentimes,
        },
      }),
    )
  }
  await prisma.$transaction(operations)
  return { ok: true }
}

export interface Signataire {
  prenom: string
  nom: string
  email: string
}

export async function envoyerEnSignature(a: Acteur, id: number, client: Signataire, fournisseur: Signataire) {
  const d = await trouverAccessible(a, id)
  if (!peutEnvoyerEnSignature(a, d)) throw new ErreurMetier('Envoi en signature impossible pour cette demande.', 403)
  for (const s of [client, fournisseur]) {
    if (!s.prenom.trim() || !s.nom.trim() || !EMAIL.test(s.email.trim())) throw new ErreurMetier('Prénom, nom et e-mail valides requis pour chaque signataire.')
  }
  const sig = {
    clientPrenom: client.prenom.trim(), clientNom: client.nom.trim(), clientEmail: client.email.trim().toLowerCase(),
    fournisseurPrenom: fournisseur.prenom.trim(), fournisseurNom: fournisseur.nom.trim(), fournisseurEmail: fournisseur.email.trim().toLowerCase(),
  }
  await prisma.$transaction([
    prisma.finSignature.upsert({ where: { demandeId: id }, create: { demandeId: id, ...sig }, update: { ...sig, demandeeLe: new Date(), signeeLe: null } }),
    prisma.finDemande.update({ where: { id }, data: { statut: 'EN_SIGNATURE', infosManquantes: null, contactPrenom: sig.clientPrenom, contactNom: sig.clientNom, contactEmail: sig.clientEmail } }),
    prisma.finHistorique.create({ data: { demandeId: id, auteurId: a.id, ancienStatut: d.statut, nouveauStatut: 'EN_SIGNATURE', commentaire: `Signataires : ${sig.clientPrenom} ${sig.clientNom} (client), ${sig.fournisseurPrenom} ${sig.fournisseurNom} (LEVAD)` } }),
  ])
  return { ok: true }
}

// --- Archivage / suppression -----------------------------------------------------------------------------------------

export async function archiverDemande(a: Acteur, id: number, archivee: boolean) {
  const d = await trouverAccessible(a, id)
  if (!peutArchiver(a, d)) throw new ErreurMetier('Action non autorisée.', 403)
  await prisma.$transaction([
    prisma.finDemande.update({ where: { id }, data: { archivee } }),
    prisma.finHistorique.create({ data: { demandeId: id, auteurId: a.id, ancienStatut: d.statut, nouveauStatut: d.statut, commentaire: archivee ? 'Demande archivée' : 'Demande désarchivée' } }),
  ])
  return { ok: true }
}

export async function supprimerDemande(a: Acteur, id: number) {
  if (!peutSupprimer(a)) throw new ErreurMetier('Seul un administrateur peut supprimer une demande.', 403)
  await trouverAccessible(a, id)
  await prisma.finDemande.delete({ where: { id } })
  return { ok: true }
}
