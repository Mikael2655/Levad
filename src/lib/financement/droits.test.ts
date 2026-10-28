import { describe, expect, it } from 'vitest'
import { peutAnnuler, peutArchiver, peutModifier, peutSupprimer, peutVoir, vueContrat, vueDemande, type DemandeBase } from './droits'

const admin = { id: 1, role: 'ADMIN' as const }
const assistante = { id: 2, role: 'ASSISTANTE' as const }
const comA = { id: 3, role: 'COMMERCIAL' as const }
const comB = { id: 4, role: 'COMMERCIAL' as const }

const demande: DemandeBase = {
  id: 1, reference: 'LEV-2026-0001', creeLe: new Date(), majLe: new Date(), statut: 'BROUILLON', archivee: false,
  infosManquantes: null, refFinanceur: 'GRK-SECRET', financeurId: 1, commercialId: 3, saisiParId: 3,
  raisonSociale: 'ACME', siret: '12345678900011', formeJuridique: 'SAS', adresse: '1 rue X', codePostal: null, ville: null, pays: 'France',
  contactPrenom: 'A', contactNom: 'B', contactEmail: 'a@b.fr', contactTel: null,
  dureeMois: 63, periodicite: 'TRIMESTRIELLE', loyerCentimes: 72300,
  montantCommercialCentimes: 1215126, coefficientCommercialPpm: 59500,
  montantReelCentimes: 1255208, coefficientReelPpm: 57600, horsTranche: false,
}

describe('visibilité', () => {
  it('un commercial ne voit que ses demandes', () => {
    expect(peutVoir(comA, demande)).toBe(true)
    expect(peutVoir(comB, demande)).toBe(false)
    expect(peutVoir(assistante, demande)).toBe(true)
    expect(peutVoir(admin, demande)).toBe(true)
  })
})

describe('vue commerciale : rien du réel ne sort', () => {
  const json = JSON.stringify(vueDemande(comA, demande))
  it('aucun champ réel ni marge ni référence financeur', () => {
    for (const interdit of ['montantReel', 'coefficientReel', 'marge', 'refFinanceur', '1255208', '57600', 'GRK-SECRET']) {
      expect(json).not.toContain(interdit)
    }
  })
  it('mais il a son montant et son coefficient', () => {
    expect(json).toContain('montantCommercialCentimes')
    expect(json).toContain('59500')
  })
  it('un champ ajouté plus tard à la table ne fuit pas', () => {
    const avecNouveau = { ...demande, champSecret: 'xyz' } as DemandeBase
    expect(JSON.stringify(vueDemande(comA, avecNouveau))).not.toContain('xyz')
  })
  it('l’assistante et l’admin voient le réel et la marge', () => {
    for (const u of [assistante, admin]) {
      const v = vueDemande(u, demande) as { montantReelCentimes: number; margeCentimes: number }
      expect(v.montantReelCentimes).toBe(1255208)
      expect(v.margeCentimes).toBe(1255208 - 1215126)
    }
  })
})

describe('vue contrat commerciale', () => {
  const c = { id: 1, creeLe: new Date(), demandeId: null, importe: true, refFinanceur: 'X', financeurId: 1, commercialId: 3, raisonSociale: 'A', siret: null, materiel: 'm', periodicite: 'TRIMESTRIELLE', dureeMois: 63, loyerCentimes: 1, dateDebut: new Date(), dateFin: new Date(), montantCommercialCentimes: 5, montantReelCentimes: 999 }
  it('pas de montant réel pour le commercial', () => {
    const json = JSON.stringify(vueContrat(comA, c))
    expect(json).not.toContain('montantReel')
    expect(json).not.toContain('marge')
    expect(json).not.toContain('refFinanceur')
  })
})

describe('actions', () => {
  it('annuler : admin toujours ; commercial son brouillon seulement ; assistante jamais', () => {
    expect(peutAnnuler(admin, { ...demande, statut: 'ENVOYEE' })).toBe(true)
    expect(peutAnnuler(comA, demande)).toBe(true)
    expect(peutAnnuler(comA, { ...demande, statut: 'ENVOYEE' })).toBe(false)
    expect(peutAnnuler(comB, demande)).toBe(false)
    expect(peutAnnuler(assistante, demande)).toBe(false)
  })
  it('archiver : tous pour ce qu’ils voient ; supprimer : admin seul', () => {
    expect(peutArchiver(assistante, demande)).toBe(true)
    expect(peutArchiver(comA, demande)).toBe(true)
    expect(peutArchiver(comB, demande)).toBe(false)
    expect(peutSupprimer(admin)).toBe(true)
    expect(peutSupprimer(assistante)).toBe(false)
    expect(peutSupprimer(comA)).toBe(false)
  })
  it('modifier : le commercial seulement en brouillon / infos manquantes', () => {
    expect(peutModifier(comA, demande)).toBe(true)
    expect(peutModifier(comA, { ...demande, statut: 'ENVOYEE' })).toBe(false)
    expect(peutModifier(comB, demande)).toBe(false)
    expect(peutModifier(admin, { ...demande, statut: 'ENVOYEE' })).toBe(true)
    expect(peutModifier(admin, { ...demande, statut: 'ANNULEE' })).toBe(false)
  })
})
