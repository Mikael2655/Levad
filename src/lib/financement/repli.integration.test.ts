// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : demande de repli chez Solubail après un refus ou un blocage chez Grenke.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { SOLUBAIL_COMMERCIAL_LIGNES } from './baremes'
import { lignesVersMatrice } from './grilles'
import type { EtatDemande } from './connecteurs/connecteur'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

let etat: EtatDemande | null = null
vi.mock('./connecteurs', () => ({ connecteurPour: (code: string) => (code === 'grenke_api' ? { recupererStatut: async () => etat } : null) }))

d('demande de repli Solubail (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let admin: typeof import('./admin')
  let rp: typeof import('./repli')
  let act: typeof import('./actualisation')
  let notif: typeof import('./notifications')
  let ids: { admin: number; ass: number; com: number; grenke: number; solubail: number }
  const mails: { to: string; sujet: string }[] = []

  const grenkeDemande = (o: Record<string, unknown> = {}) => prisma.finDemande.create({
    data: {
      reference: `LEV-R-${Math.random().toString(36).slice(2, 8)}`, financeurId: ids.grenke, commercialId: ids.com, saisiParId: ids.admin, statut: 'ENVOYEE', idFinanceur: 'u-1', refFinanceur: '100-145711',
      raisonSociale: 'CKE AVOCATS', siret: '92155693200017', adresse: '59 rue Boissière', codePostal: '75016', ville: 'PARIS', contactPrenom: '', contactNom: '', contactEmail: '',
      dureeMois: 63, periodicite: 'TRIMESTRIELLE', loyerCentimes: 72300, montantCommercialCentimes: 900000, coefficientCommercialPpm: 80000, montantReelCentimes: 920000,
      observation: 'Rachat du contrat n°058-1', lignes: { create: [{ designation: 'iRA c3720i', quantite: 2, typeBien: '7', constructeur: 'Canon' }] }, ...o,
    },
  })

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    admin = await import('./admin'); rp = await import('./repli'); act = await import('./actualisation'); notif = await import('./notifications')
    notif.remplacerExpediteur(async m => { mails.push({ to: m.to, sujet: m.sujet }) })
    await prisma.finNotification.deleteMany(); await prisma.finParametre.deleteMany(); await prisma.finHistorique.deleteMany(); await prisma.finContrat.deleteMany(); await prisma.finDemande.deleteMany(); await prisma.finGrille.deleteMany(); await prisma.finUtilisateur.deleteMany(); await prisma.finFinanceur.deleteMany()
    const mk = async (email: string, role: string) => (await admin.creerUtilisateur({ email, prenom: 'P', nom: email.split('@')[0], role })).utilisateur.id
    const [a, s, c] = [await mk('boss@t.fr', 'ADMIN'), await mk('assist@t.fr', 'ASSISTANTE'), await mk('com@t.fr', 'COMMERCIAL')]
    const grenke = (await admin.creerFinanceur({ nom: 'Grenke' })).id
    await prisma.finFinanceur.update({ where: { id: grenke }, data: { connecteur: 'grenke_api' } })
    const solubail = (await admin.creerFinanceur({ nom: 'Solubail', signatureElectronique: false, envoiParMail: true })).id
    await admin.modifierFinanceur(solubail, { destinataireMailId: s })
    await admin.enregistrerGrille({ financeurId: solubail, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', lignesVersMatrice(SOLUBAIL_COMMERCIAL_LIGNES))
    ids = { admin: a, ass: s, com: c, grenke, solubail }
  })
  afterAll(async () => { notif.remplacerExpediteur(null); await prisma?.$disconnect() })

  it('refus de Grenke constaté par la mise à jour automatique : la demande Solubail est créée, envoyée par e-mail et reliée', async () => {
    const o = await grenkeDemande()
    etat = { statut: 'REFUSEE', etapeSignature: null, detail: 'Refusée par Grenke', codeFinanceur: 'Declined', reference: '100-145711' }
    await act.actualiserToutesLesDemandesOuvertes({ force: true })
    const repli = await prisma.finDemande.findFirstOrThrow({ where: { repliDeId: o.id } })
    expect(repli).toMatchObject({ financeurId: ids.solubail, commercialId: ids.com, raisonSociale: 'CKE AVOCATS', siret: '92155693200017', dureeMois: 63, loyerCentimes: 72300, statut: 'ENVOYEE', observation: 'Rachat du contrat n°058-1' })
    const lignes = await prisma.finDemandeLigne.findMany({ where: { demandeId: repli.id } })
    expect(lignes).toMatchObject([{ designation: 'iRA c3720i', quantite: 2, typeBien: null, constructeur: 'Canon' }])
    expect(mails.some(m => m.to === 'assist@t.fr')).toBe(true) // récapitulatif envoyé au destinataire Solubail
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: o.id } })).statut).toBe('REFUSEE')
    expect(await prisma.finHistorique.count({ where: { demandeId: o.id, commentaire: { startsWith: 'Demande de repli créée chez Solubail' } } })).toBe(1)
    // un second passage ne crée pas de doublon
    await rp.repliAutomatiqueApresRefus(o.id)
    expect(await prisma.finDemande.count({ where: { repliDeId: o.id } })).toBe(1)
  })

  it('« informations manquantes » : rien d’automatique ; création possible à la main par l’interne, pas par un commercial', async () => {
    const o = await grenkeDemande({ statut: 'ENVOYEE' })
    etat = { statut: 'INFOS_MANQUANTES', etapeSignature: null, detail: 'Informations manquantes', codeFinanceur: 'MissingInfo', reference: '100-145711' }
    await act.actualiserToutesLesDemandesOuvertes({ force: true })
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: o.id } })).statut).toBe('INFOS_MANQUANTES')
    expect(await prisma.finDemande.count({ where: { repliDeId: o.id } })).toBe(0)
    await expect(rp.creerDemandeRepli(o.id, { declencheur: 'MANUEL', auteur: { id: ids.com, role: 'COMMERCIAL' } })).rejects.toMatchObject({ status: 403 })
    const r = await rp.creerDemandeRepli(o.id, { declencheur: 'MANUEL', auteur: { id: ids.ass, role: 'ASSISTANTE' } })
    expect(r).toMatchObject({ financeur: 'Solubail', envoi: 'ok' })
    expect((await prisma.finDemande.findUniqueOrThrow({ where: { id: r.id } })).repliDeId).toBe(o.id)
    await expect(rp.creerDemandeRepli(o.id, { declencheur: 'MANUEL', auteur: { id: ids.ass, role: 'ASSISTANTE' } })).rejects.toMatchObject({ status: 409 }) // déjà créée
  })

  it('pas de repli sur une demande envoyée en attente, ni sur une demande de repli elle-même ; durée indisponible chez Solubail : échec expliqué dans l’historique', async () => {
    const attente = await grenkeDemande()
    await expect(rp.creerDemandeRepli(attente.id, { declencheur: 'MANUEL', auteur: { id: ids.admin, role: 'ADMIN' } })).rejects.toMatchObject({ status: 409 })
    const repliDe = await prisma.finDemande.findFirstOrThrow({ where: { repliDeId: { not: null } } })
    await expect(rp.creerDemandeRepli(repliDe.id, { declencheur: 'MANUEL', auteur: { id: ids.admin, role: 'ADMIN' } })).rejects.toMatchObject({ status: 409 })
    const incompatible = await grenkeDemande({ statut: 'REFUSEE', dureeMois: 18 }) // durée absente du barème Solubail
    await rp.repliAutomatiqueApresRefus(incompatible.id)
    expect(await prisma.finDemande.count({ where: { repliDeId: incompatible.id } })).toBe(0)
    const h = await prisma.finHistorique.findFirstOrThrow({ where: { demandeId: incompatible.id, commentaire: { startsWith: 'Demande de repli non créée automatiquement' } } })
    expect(h.commentaire).toContain('Solubail non créée')
  })

  it('sans financeur Solubail configuré : la fonction reste muette', async () => {
    await prisma.finFinanceur.update({ where: { id: ids.solubail }, data: { actif: false } })
    const o = await grenkeDemande({ statut: 'REFUSEE' })
    await rp.repliAutomatiqueApresRefus(o.id)
    expect(await prisma.finHistorique.count({ where: { demandeId: o.id } })).toBe(0)
    await prisma.finFinanceur.update({ where: { id: ids.solubail }, data: { actif: true } })
  })
})
