import { describe, expect, it } from 'vitest'
import { construireDemandeGrenke, repartirMontant, type DemandePourGrenke, type LigneDemande } from './demande'

const ligne = (o: Partial<LigneDemande> = {}): LigneDemande => ({ designation: 'Copieur', quantite: 1, constructeur: 'Canon', typeBien: null, montantHtCentimes: null, ...o })
const total = (r: ReturnType<typeof repartirMontant>) => r.reduce((s, x) => s + x.quantite * x.prixUnitaireCentimes, 0)

describe('répartition du montant réel sur les matériels', () => {
  it('une ligne : tout le montant, au centime près', () => {
    expect(repartirMontant(1255208, [ligne()])).toEqual([{ designation: 'Copieur', constructeur: 'Canon', typeBien: null, quantite: 1, prixUnitaireCentimes: 1255208 }])
  })
  it('quantité 2 : 12 552,08 € = 2 x 6 276,04 €', () => {
    const r = repartirMontant(1255208, [ligne({ quantite: 2 })])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ quantite: 2, prixUnitaireCentimes: 627604 })
  })
  it('un centime qui ne se divise pas : la ligne est coupée en deux objets', () => {
    const r = repartirMontant(1001, [ligne({ quantite: 3 })]) // 1001 = 3 x 333 + 2 : deux unités portent 1 centime de plus
    expect(r.map(x => [x.quantite, x.prixUnitaireCentimes])).toEqual([[1, 333], [2, 334]])
    expect(total(r)).toBe(1001)
  })
  it('proportionnellement aux montants des lignes quand ils sont tous donnés', () => {
    const r = repartirMontant(1000000, [ligne({ designation: 'A', montantHtCentimes: 300000 }), ligne({ designation: 'B', montantHtCentimes: 100000 })])
    expect(r.map(x => x.prixUnitaireCentimes)).toEqual([750000, 250000])
  })
  it('à parts égales par unité quand les montants manquent', () => {
    const r = repartirMontant(900000, [ligne({ quantite: 2 }), ligne({ designation: 'B', quantite: 1 })])
    expect(r.map(x => x.quantite * x.prixUnitaireCentimes)).toEqual([600000, 300000])
  })
  it('1 000 cas aléatoires : la somme retombe TOUJOURS exactement sur le total, sans prix négatif', () => {
    let graine = 12345
    const alea = (max: number) => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine % max }
    for (let i = 0; i < 1000; i++) {
      const lignes = Array.from({ length: 1 + alea(4) }, () => ligne({ quantite: 1 + alea(6), montantHtCentimes: alea(2) ? 1 + alea(500000) : null }))
      const t = 50000 + alea(9_000_000)
      const r = repartirMontant(t, lignes)
      expect(total(r)).toBe(t)
      expect(r.every(x => x.prixUnitaireCentimes >= 0 && x.quantite >= 1)).toBe(true)
    }
  })
})

const demande = (o: Partial<DemandePourGrenke> = {}): DemandePourGrenke => ({
  raisonSociale: 'ACME SAS', siret: '35600000000048', adresse: '6 rue du Port', codePostal: '67300', ville: 'Schiltigheim', pays: 'France',
  contactEmail: 'jeanne@acme.fr', contactTel: '0388000000', dureeMois: 63, periodicite: 'TRIMESTRIELLE', montantReelCentimes: 1255208,
  lignes: [ligne({ typeBien: '7' })], ...o,
})
const options = { modePaiement: 'Direct Debit' as const, commissionPourcent: 2, typeObjetParDefaut: 7, formatIdentifiant: 'SIREN' as const }

describe('demande au format Grenke', () => {
  it('le MONTANT RÉEL part chez Grenke (jamais le montant commercial)', () => {
    const { requete } = construireDemandeGrenke(demande(), options) as { requete: any }
    expect(requete).toMatchObject({ FinancingAmount: 12552.08, Period: 63, PaymentFrequency: 'Quarterly', PaymentMethod: 'Direct Debit', Currency: 'EUR', ProductType: 'ClassicLease', Commission: 2 })
    expect(requete.FinancingObjects).toEqual([{ Quantity: 1, ObjectTypeId: 7, Manufacturer: 'Canon', NetPricePerObject: 12552.08, Details: 'Copieur' }])
    const somme = requete.FinancingObjects.reduce((s: number, o: any) => s + o.Quantity * Math.round(o.NetPricePerObject * 100), 0)
    expect(somme).toBe(requete.FinancingAmount * 100 > 0 ? 1255208 : 0)
  })
  it('client : SIREN à 9 chiffres, adresse principale en France, e-mail et téléphone', () => {
    const { requete } = construireDemandeGrenke(demande(), options) as { requete: any }
    expect(requete.Lessee).toMatchObject({ CompanyName: 'ACME SAS', ExternalId: '356000000', Email: 'jeanne@acme.fr', Telephones: [{ Number: '0388000000', Type: 'Phone' }] })
    expect(requete.Lessee.Addresses).toEqual([{ Line1: '6 rue du Port', PostCode: '67300', City: 'Schiltigheim', Country: 'FR', Type: 'Main' }])
  })
  it('paiement mensuel et commission par défaut', () => {
    const { requete } = construireDemandeGrenke(demande({ periodicite: 'MENSUELLE' }), { ...options, commissionPourcent: null }) as { requete: any }
    expect(requete.PaymentFrequency).toBe('Monthly')
    expect('Commission' in requete).toBe(false)
  })
  it('type de bien non précisé : type par défaut + avertissement ; constructeur absent : « Other »', () => {
    const r = construireDemandeGrenke(demande({ lignes: [ligne({ typeBien: null, constructeur: null })] }), options)
    expect((r.requete.FinancingObjects as any[])[0]).toMatchObject({ ObjectTypeId: 7, Manufacturer: 'Other' })
    expect(r.avertissements[0]).toContain('Type de bien non précisé')
  })
  it('dossier incomplet : refusé avec la liste de ce qui manque', () => {
    expect(() => construireDemandeGrenke(demande({ siret: '' , codePostal: null, ville: null }), options)).toThrow(/SIREN.*code postal et ville/)
    expect(() => construireDemandeGrenke(demande({ lignes: [] }), options)).toThrow('ligne de matériel')
    expect(() => construireDemandeGrenke(demande({ pays: 'Atlantide' }), options)).toThrow('Pays non reconnu')
  })
})
