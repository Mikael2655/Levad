// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : enregistrement de la liste des pièces demandées.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip
vi.mock('./notifications', async orig => ({ ...(await orig<typeof import('./notifications')>()), notifierChangement: async () => {} }))

d('pièces demandées par le financeur (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let pd: typeof import('./pieces-demandees')
  let ids: { admin: number; ass: number; com: number; fin: number }
  const creer = (statut: string) => prisma.finDemande.create({ data: { reference: `LEV-P-${Math.random().toString(36).slice(2, 8)}`, financeurId: ids.fin, commercialId: ids.com, saisiParId: ids.admin, statut, raisonSociale: 'CKE', siret: '92155693200017', adresse: 'x', dureeMois: 48, periodicite: 'TRIMESTRIELLE', loyerCentimes: 36000, montantCommercialCentimes: 473684, coefficientCommercialPpm: 76000, contactPrenom: '', contactNom: '', contactEmail: '' } })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    pd = await import('./pieces-demandees')
    await prisma.finHistorique.deleteMany(); await prisma.finContrat.deleteMany(); await prisma.finDemande.deleteMany(); await prisma.finGrille.deleteMany(); await prisma.finUtilisateur.deleteMany(); await prisma.finFinanceur.deleteMany()
    const mk = (email: string, role: string) => prisma.finUtilisateur.create({ data: { email, prenom: 'X', nom: role, role, motDePasseHash: 'x' } })
    const [a, s, c] = [await mk('a@l.fr', 'ADMIN'), await mk('s@l.fr', 'ASSISTANTE'), await mk('c@l.fr', 'COMMERCIAL')]
    const f = await prisma.finFinanceur.create({ data: { nom: 'Grenke', connecteur: 'grenke_api' } })
    ids = { admin: a.id, ass: s.id, com: c.id, fin: f.id }
  })
  afterAll(async () => { await prisma?.$disconnect() })

  it('demande envoyée : passe en « informations manquantes » avec la liste, historique à l’appui', async () => {
    const dem = await creer('ENVOYEE')
    await pd.enregistrerPiecesDemandees({ id: ids.ass, role: 'ASSISTANTE' }, dem.id, ['Un extrait Kbis de moins de 3 mois', '  • Les 3 derniers bilans ', ''])
    const apres = await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })
    expect(apres.statut).toBe('INFOS_MANQUANTES')
    expect(apres.infosManquantes).toBe('• Un extrait Kbis de moins de 3 mois\n• Les 3 derniers bilans')
    expect(await prisma.finHistorique.count({ where: { demandeId: dem.id, nouveauStatut: 'INFOS_MANQUANTES' } })).toBe(1)
  })

  it('déjà en « informations manquantes » : la liste est remplacée sans changer de statut', async () => {
    const dem = await creer('INFOS_MANQUANTES')
    await pd.enregistrerPiecesDemandees({ id: ids.admin, role: 'ADMIN' }, dem.id, ['RIB'])
    expect(await prisma.finDemande.findUniqueOrThrow({ where: { id: dem.id } })).toMatchObject({ statut: 'INFOS_MANQUANTES', infosManquantes: '• RIB' })
  })

  it('refusé : commercial, liste vide, demande pas encore envoyée', async () => {
    const dem = await creer('ENVOYEE')
    await expect(pd.enregistrerPiecesDemandees({ id: ids.com, role: 'COMMERCIAL' }, dem.id, ['RIB'])).rejects.toMatchObject({ status: 403 })
    await expect(pd.enregistrerPiecesDemandees({ id: ids.admin, role: 'ADMIN' }, dem.id, [' ', ''])).rejects.toThrow(/au moins une pièce/)
    const brouillon = await creer('BROUILLON')
    await expect(pd.enregistrerPiecesDemandees({ id: ids.admin, role: 'ADMIN' }, brouillon.id, ['RIB'])).rejects.toThrow(/envoyée au financeur/)
  })
})
