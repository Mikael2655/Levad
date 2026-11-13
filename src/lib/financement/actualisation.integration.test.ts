// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : « Actualiser depuis Grenke » avec un connecteur simulé.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { EtatDemande } from './connecteurs/connecteur'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

let etat: EtatDemande | null = null
let trouve: { id: string; reference: string; client: string; montantCentimes: number | null; dureeMois: number | null; etat: string } | null = null
vi.mock('./connecteurs', () => ({
  connecteurPour: (code: string) => (code === 'grenke_api' ? { recupererStatut: async () => etat, trouverDemande: async () => trouve } : null),
}))
vi.mock('./notifications', async orig => ({ ...(await orig<typeof import('./notifications')>()), notifierChangement: async () => {} }))

d('actualisation depuis le financeur (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let act: typeof import('./actualisation')
  let ids: { admin: number; com: number; fin: number; manuel: number }

  const creer = (o: Record<string, unknown>) =>
    prisma.finDemande.create({
      data: {
        reference: `LEV-T-${Math.random().toString(36).slice(2, 8)}`, financeurId: ids.fin, commercialId: ids.com, saisiParId: ids.admin,
        raisonSociale: 'DFM', siret: '44451729600075', adresse: '13 rue Paul Sejourne', contactPrenom: 'A', contactNom: 'B', contactEmail: 'a@b.fr',
        dureeMois: 36, periodicite: 'TRIMESTRIELLE', loyerCentimes: 45300, montantCommercialCentimes: 459898, coefficientCommercialPpm: 98500, ...o,
      },
    })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    act = await import('./actualisation')
    await prisma.finHistorique.deleteMany(); await prisma.finContrat.deleteMany(); await prisma.finDemande.deleteMany(); await prisma.finGrille.deleteMany(); await prisma.finUtilisateur.deleteMany(); await prisma.finFinanceur.deleteMany()
    const a = await prisma.finUtilisateur.create({ data: { email: 'a@l.fr', prenom: 'A', nom: 'A', role: 'ADMIN', motDePasseHash: 'x' } })
    const c = await prisma.finUtilisateur.create({ data: { email: 'c@l.fr', prenom: 'C', nom: 'C', role: 'COMMERCIAL', motDePasseHash: 'x' } })
    const f = await prisma.finFinanceur.create({ data: { nom: 'Grenke', connecteur: 'grenke_api' } })
    const m = await prisma.finFinanceur.create({ data: { nom: 'Manuel', connecteur: 'manuel' } })
    ids = { admin: a.id, com: c.id, fin: f.id, manuel: m.id }
  })
  afterAll(async () => { await prisma?.$disconnect() })

  const ADMIN = () => ({ id: ids.admin, role: 'ADMIN' as const })

  it('refus Grenke : statut Refusée, numéro lisible renseigné, historique', async () => {
    const dem = await creer({ statut: 'ENVOYEE', idFinanceur: 'u-1', refFinanceur: 'u-1' })
    etat = { statut: 'REFUSEE', etapeSignature: null, detail: 'Refusée par Grenke', codeFinanceur: 'Declined', reference: '100-145711' }
    const r = await act.actualiserDepuisFinanceur(ADMIN(), dem.id)
    expect(r.modifie).toBe(true)
    const apres = await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })
    expect(apres.statut).toBe('REFUSEE')
    expect(apres.refFinanceur).toBe('100-145711')
    expect(apres.idFinanceur).toBe('u-1')
    expect(await prisma.finHistorique.count({ where: { demandeId: dem.id, nouveauStatut: 'REFUSEE' } })).toBe(1)
  })

  it('sans changement : rien n’est écrit', async () => {
    const dem = await creer({ statut: 'REFUSEE', idFinanceur: 'u-2', refFinanceur: '100-1' })
    etat = { statut: 'REFUSEE', etapeSignature: null, detail: 'Refusée par Grenke', codeFinanceur: 'Declined', reference: '100-1' }
    expect((await act.actualiserDepuisFinanceur(ADMIN(), dem.id)).modifie).toBe(false)
    expect(await prisma.finHistorique.count({ where: { demandeId: dem.id } })).toBe(0)
  })

  it('un état « signé » n’est pas appliqué automatiquement', async () => {
    const dem = await creer({ statut: 'EN_SIGNATURE', idFinanceur: 'u-3', refFinanceur: '100-2' })
    etat = { statut: 'SIGNEE', etapeSignature: null, detail: 'Contrat signé', codeFinanceur: 'Contracted' }
    const r = await act.actualiserDepuisFinanceur(ADMIN(), dem.id)
    expect(r.modifie).toBe(false)
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })).statut).toBe('EN_SIGNATURE')
  })

  it('rattache une demande saisie à la main chez Grenke à son dossier, après contrôle montant et durée', async () => {
    const dem = await creer({ statut: 'ENVOYEE', montantReelCentimes: 478088, dureeMois: 48 })
    trouve = { id: 'uuid-9', reference: '100-145999', client: 'CKE', montantCentimes: 478088, dureeMois: 48, etat: 'Declined' }
    etat = { statut: 'REFUSEE', etapeSignature: null, detail: 'Refusée par Grenke', codeFinanceur: 'Declined', reference: '100-145999' }
    const r = await act.rattacherAuFinanceur(ADMIN(), dem.id, ' 100-145999 ')
    expect(r.modifie).toBe(true)
    const apres = await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })
    expect(apres).toMatchObject({ idFinanceur: 'uuid-9', refFinanceur: '100-145999', statut: 'REFUSEE' })
    await expect(act.rattacherAuFinanceur(ADMIN(), dem.id, '100-145999')).rejects.toMatchObject({ status: 409 }) // déjà reliée
  })

  it('rattachement refusé si le dossier ne correspond pas, est introuvable, ou déjà pris par une autre demande', async () => {
    const dem = await creer({ statut: 'ENVOYEE', montantReelCentimes: 478088, dureeMois: 48 })
    trouve = { id: 'uuid-8', reference: '100-146000', client: 'AUTRE', montantCentimes: 999900, dureeMois: 48, etat: 'Approved' }
    await expect(act.rattacherAuFinanceur(ADMIN(), dem.id, '100-146000')).rejects.toThrow(/ne correspond pas/)
    trouve = null
    await expect(act.rattacherAuFinanceur(ADMIN(), dem.id, '100-0')).rejects.toMatchObject({ status: 404 })
    await expect(act.rattacherAuFinanceur(ADMIN(), dem.id, '100-145999')).rejects.toMatchObject({ status: 409 }) // numéro déjà utilisé plus haut
    await expect(act.rattacherAuFinanceur({ id: ids.com, role: 'COMMERCIAL' }, dem.id, '100-5')).rejects.toMatchObject({ status: 403 })
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })).idFinanceur).toBeNull()
  })

  it('pièces déjà transmises : « informations manquantes » de Grenke ne repasse pas la demande en orange', async () => {
    const dem = await creer({ statut: 'ENVOYEE', idFinanceur: 'u-5', refFinanceur: '100-5' })
    const avant = new Date(Date.now() - 3600_000)
    await prisma.finHistorique.create({ data: { demandeId: dem.id, auteurId: ids.admin, ancienStatut: 'ENVOYEE', nouveauStatut: 'INFOS_MANQUANTES', date: avant } })
    await prisma.finPieceJointe.create({ data: { demandeId: dem.id, type: 'AUTRE', nomFichier: 'k.pdf', typeMime: 'application/pdf', taille: 1, complete: true, ajouteParId: ids.admin, envoyeFinanceurLe: new Date() } })
    etat = { statut: 'INFOS_MANQUANTES', etapeSignature: null, detail: 'Informations manquantes', codeFinanceur: 'MissingInfo', reference: '100-5' }
    const r = await act.actualiserDepuisFinanceur(ADMIN(), dem.id)
    expect(r.modifie).toBe(false)
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })).statut).toBe('ENVOYEE')
  })

  it('mise à jour automatique : demandes en cours seulement, auteur = celui qui a saisi, délai entre deux passages', async () => {
    await prisma.finParametre.deleteMany()
    const ouverte = await creer({ statut: 'ENVOYEE', idFinanceur: 'u-6', refFinanceur: '100-6' })
    const refusee = await creer({ statut: 'REFUSEE', idFinanceur: 'u-7', refFinanceur: '100-7' })
    const jamaisEnvoyee = await creer({ statut: 'BROUILLON' })
    etat = { statut: 'PRETE_A_SIGNER', etapeSignature: null, detail: 'Accord : prête à signer', codeFinanceur: 'ReadyToSign', reference: '100-6' }
    const r = await act.actualiserToutesLesDemandesOuvertes({ minutes: 10 })
    expect(r.modifiees).toBeGreaterThanOrEqual(1)
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: ouverte.id } })).statut).toBe('PRETE_A_SIGNER')
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: refusee.id } })).statut).toBe('REFUSEE')
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: jamaisEnvoyee.id } })).statut).toBe('BROUILLON')
    const h = await prisma.finHistorique.findFirstOrThrow({ where: { demandeId: ouverte.id, nouveauStatut: 'PRETE_A_SIGNER' } })
    expect(h.auteurId).toBe(ids.admin)
    expect(h.commentaire).toContain('automatique')
    expect(await act.actualiserToutesLesDemandesOuvertes({ minutes: 10 })).toEqual({ verifiees: 0, modifiees: 0 }) // trop tôt
    expect((await act.actualiserToutesLesDemandesOuvertes({ force: true })).verifiees).toBeGreaterThanOrEqual(1)
  })

  it('commercial refusé ; demande non envoyée par l’API refusée ; état inconnu sans changement', async () => {
    const dem = await creer({ statut: 'ENVOYEE', idFinanceur: 'u-4', refFinanceur: '100-3' })
    await expect(act.actualiserDepuisFinanceur({ id: ids.com, role: 'COMMERCIAL' }, dem.id)).rejects.toMatchObject({ status: 403 })
    const brouillon = await creer({ statut: 'BROUILLON' })
    await expect(act.actualiserDepuisFinanceur(ADMIN(), brouillon.id)).rejects.toThrow(/pas été envoyée/)
    etat = null
    expect((await act.actualiserDepuisFinanceur(ADMIN(), dem.id)).modifie).toBe(false)
  })
})
