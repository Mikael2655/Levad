// Test sur une vraie base PostgreSQL (voir acces.integration.test.ts) : base jetable, vidée par le test.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { COMMERCIAL_LIGNES, GRENKE_REEL_LIGNES } from './baremes'
import { lignesVersMatrice } from './grilles'
import { verifier } from './motdepasse'

const URL_TEST = process.env.FIN_TEST_DATABASE_URL
const d = URL_TEST ? describe : describe.skip

d('administration (base réelle)', () => {
  let prisma: typeof import('@/lib/db').prisma
  let admin: typeof import('./admin')
  let grenke: number
  let adminId: number

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_TEST
    prisma = (await import('@/lib/db')).prisma
    admin = await import('./admin')
    await prisma.finContrat.deleteMany()
    await prisma.finDemande.deleteMany()
    await prisma.finGrille.deleteMany()
    await prisma.finUtilisateur.deleteMany()
    await prisma.finFinanceur.deleteMany()
    grenke = (await admin.creerFinanceur({ nom: 'Grenke' })).id
    adminId = (await admin.creerUtilisateur({ email: 'Boss@Levad.fr', prenom: 'B', nom: 'Oss', role: 'ADMIN' })).utilisateur.id
  })
  afterAll(async () => { await prisma?.$disconnect() })

  describe('utilisateurs', () => {
    it('crée un compte avec un mot de passe provisoire valide, à changer, adresse en minuscules', async () => {
      const { utilisateur, motDePasseProvisoire } = await admin.creerUtilisateur({ email: ' Marie@Levad.fr ', prenom: 'Marie', nom: 'D', role: 'COMMERCIAL' })
      expect(utilisateur.email).toBe('marie@levad.fr')
      expect(utilisateur.doitChangerMotDePasse).toBe(true)
      const brut = await prisma.finUtilisateur.findUniqueOrThrow({ where: { id: utilisateur.id } })
      expect(await verifier(motDePasseProvisoire, brut.motDePasseHash)).toBe(true)
      expect(JSON.stringify(utilisateur)).not.toContain('Hash')
    })
    it('refuse un doublon, une adresse invalide, un rôle inconnu', async () => {
      await expect(admin.creerUtilisateur({ email: 'marie@levad.fr', prenom: 'M', nom: 'D', role: 'COMMERCIAL' })).rejects.toThrow('déjà')
      await expect(admin.creerUtilisateur({ email: 'pasunemail', prenom: 'M', nom: 'D', role: 'COMMERCIAL' })).rejects.toThrow('invalide')
      await expect(admin.creerUtilisateur({ email: 'x@levad.fr', prenom: 'M', nom: 'D', role: 'PATRON' })).rejects.toThrow('Rôle')
    })
    it('protège le dernier administrateur actif (rétrogradation, désactivation) et son propre compte', async () => {
      await expect(admin.modifierUtilisateur(adminId, adminId, { role: 'COMMERCIAL' })).rejects.toThrow('au moins un administrateur')
      await expect(admin.modifierUtilisateur(adminId, adminId, { actif: false })).rejects.toThrow('propre compte')
      const autre = (await admin.creerUtilisateur({ email: 'admin2@levad.fr', prenom: 'A', nom: '2', role: 'ADMIN' })).utilisateur.id
      await expect(admin.modifierUtilisateur(adminId, autre, { role: 'ASSISTANTE' })).resolves.toMatchObject({ role: 'ASSISTANTE' })
      await expect(admin.modifierUtilisateur(autre, adminId, { actif: false })).rejects.toThrow('au moins un administrateur')
    })
    it('réinitialise un mot de passe : nouveau provisoire, changement obligatoire, sessions anciennes périmées', async () => {
      const id = (await prisma.finUtilisateur.findUniqueOrThrow({ where: { email: 'marie@levad.fr' } })).id
      const avant = Date.now() - 1
      const { motDePasseProvisoire } = await admin.reinitialiserMotDePasse(id)
      const u = await prisma.finUtilisateur.findUniqueOrThrow({ where: { id } })
      expect(await verifier(motDePasseProvisoire, u.motDePasseHash)).toBe(true)
      expect(u.doitChangerMotDePasse).toBe(true)
      expect(u.motDePasseChangeLe.getTime()).toBeGreaterThan(avant)
    })
    it('changement de son mot de passe : ancien exigé, 10 caractères, différent', async () => {
      const { utilisateur, motDePasseProvisoire } = await admin.creerUtilisateur({ email: 'luc@levad.fr', prenom: 'L', nom: 'U', role: 'ASSISTANTE' })
      await expect(admin.changerMotDePasse(utilisateur.id, 'faux', 'NouveauMotDePasse1')).rejects.toThrow('incorrect')
      await expect(admin.changerMotDePasse(utilisateur.id, motDePasseProvisoire, 'court')).rejects.toThrow('10 caractères')
      await expect(admin.changerMotDePasse(utilisateur.id, motDePasseProvisoire, motDePasseProvisoire)).rejects.toThrow('différent')
      await admin.changerMotDePasse(utilisateur.id, motDePasseProvisoire, 'NouveauMotDePasse1')
      const u = await prisma.finUtilisateur.findUniqueOrThrow({ where: { id: utilisateur.id } })
      expect(u.doitChangerMotDePasse).toBe(false)
      expect(await verifier('NouveauMotDePasse1', u.motDePasseHash)).toBe(true)
    })
  })

  describe('financeurs', () => {
    it('valide les paramètres', async () => {
      await expect(admin.modifierFinanceur(grenke, { majorationMensuelleBp: 99999 })).rejects.toThrow('Majoration')
      await expect(admin.modifierFinanceur(grenke, { connecteur: 'inconnu' })).rejects.toThrow('Connecteur')
      await expect(admin.creerFinanceur({ nom: 'Grenke' })).rejects.toThrow('existe')
      await expect(admin.modifierFinanceur(grenke, { commissionBp: 200, fraisDossierCentimes: 0 })).resolves.toMatchObject({ commissionBp: 200 })
    })
  })

  describe('barèmes', () => {
    let marie: number
    beforeAll(async () => { marie = (await prisma.finUtilisateur.findUniqueOrThrow({ where: { email: 'marie@levad.fr' } })).id })

    it('enregistre puis relit le barème réel et le barème commun (sans perte)', async () => {
      await admin.enregistrerGrille({ financeurId: grenke, type: 'REELLE', utilisateurId: null }, 'MENSUEL', lignesVersMatrice(GRENKE_REEL_LIGNES))
      await admin.enregistrerGrille({ financeurId: grenke, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', lignesVersMatrice(COMMERCIAL_LIGNES))
      const g = await admin.lireGrille({ financeurId: grenke, type: 'COMMERCIALE', utilisateurId: null })
      expect(g!.base).toBe('TRIMESTRIEL')
      expect(g!.matrice).toEqual(lignesVersMatrice(COMMERCIAL_LIGNES))
    })
    it('réenregistrer remplace les lignes (pas de doublons)', async () => {
      await admin.enregistrerGrille({ financeurId: grenke, type: 'REELLE', utilisateurId: null }, 'MENSUEL', lignesVersMatrice(GRENKE_REEL_LIGNES))
      expect(await prisma.finGrilleLigne.count({ where: { grille: { financeurId: grenke, type: 'REELLE' } } })).toBe(GRENKE_REEL_LIGNES.length)
      expect(await prisma.finGrille.count({ where: { financeurId: grenke, type: 'REELLE' } })).toBe(1)
    })
    it('refuse une grille invalide sans toucher à l’existante', async () => {
      const m = lignesVersMatrice(COMMERCIAL_LIGNES)
      await expect(admin.enregistrerGrille({ financeurId: grenke, type: 'COMMERCIALE', utilisateurId: null }, 'TRIMESTRIEL', { ...m, cellules: [[1, null, 3], ...m.cellules.slice(1)] })).rejects.toThrow('remplies')
      expect((await admin.lireGrille({ financeurId: grenke, type: 'COMMERCIALE', utilisateurId: null }))!.matrice).toEqual(m)
    })
    it('un barème réel ne peut pas être lié à un commercial ; un barème propre seulement à un commercial', async () => {
      const m = lignesVersMatrice(COMMERCIAL_LIGNES)
      await expect(admin.enregistrerGrille({ financeurId: grenke, type: 'REELLE', utilisateurId: marie }, 'MENSUEL', m)).rejects.toThrow('réel')
      await expect(admin.creerGrillePropre(grenke, adminId)).rejects.toThrow('commercial')
    })
    it('barème propre : copie du commun, prioritaire pour ce commercial, supprimable', async () => {
      expect(await admin.grilleCommercialePour(grenke, marie)).toMatchObject({ base: 'TRIMESTRIEL' })
      await admin.creerGrillePropre(grenke, marie)
      await expect(admin.creerGrillePropre(grenke, marie)).rejects.toThrow('déjà')
      const propre = lignesVersMatrice(COMMERCIAL_LIGNES)
      propre.cellules[0][0] = 9.5
      await admin.enregistrerGrille({ financeurId: grenke, type: 'COMMERCIALE', utilisateurId: marie }, 'TRIMESTRIEL', propre)
      const pour = await admin.grilleCommercialePour(grenke, marie)
      expect(pour!.lignes.find(l => l.dureeMois === 36 && l.montantMinCentimes === 0)!.coefficientBp).toBe(950)
      const commune = await admin.grilleCommercialePour(grenke, 0)
      expect(commune!.lignes.find(l => l.dureeMois === 36 && l.montantMinCentimes === 0)!.coefficientBp).toBe(985)
      await admin.supprimerGrillePropre(grenke, marie)
      expect((await admin.grilleCommercialePour(grenke, marie))!.lignes.find(l => l.dureeMois === 36 && l.montantMinCentimes === 0)!.coefficientBp).toBe(985)
    })
  })
})
