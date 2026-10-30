import { describe, expect, it } from 'vitest'
import { colonnesManquantes, detecterUniteLoyer, dureeDepuisDates, lireCsv, lireDate, lireDureeMois, lireLignes, lireMontantCentimes, lirePeriodicite, suggererMapping } from './import-contrats'

describe('CSV', () => {
  it('séparateur « ; », guillemets, virgules françaises, BOM, lignes vides', () => {
    const t = '﻿N° contrat;Client;Loyer\r\n"123";"ACME, SAS";"1 234,56"\r\n\r\n124;"Dupont ""Père"""\r\n'
    expect(lireCsv(t)).toEqual([['N° contrat', 'Client', 'Loyer'], ['123', 'ACME, SAS', '1 234,56'], ['124', 'Dupont "Père"']])
  })
  it('détecte la tabulation (collage Excel) et la virgule', () => {
    expect(lireCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']])
    expect(lireCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('valeurs', () => {
  it('montants', () => {
    expect(lireMontantCentimes('1 234,56 €')).toBe(123456)
    expect(lireMontantCentimes('1.234,56')).toBe(123456)
    expect(lireMontantCentimes('1,234.56')).toBe(123456)
    expect(lireMontantCentimes('723')).toBe(72300)
    expect(lireMontantCentimes('723.5')).toBe(72350)
    expect(lireMontantCentimes('abc')).toBeNull()
    expect(lireMontantCentimes('')).toBeNull()
  })
  it('dates', () => {
    const iso = (d: Date | null) => d?.toISOString().slice(0, 10)
    expect(iso(lireDate('31/12/2026'))).toBe('2026-12-31')
    expect(iso(lireDate('1.2.2027'))).toBe('2027-02-01')
    expect(iso(lireDate('2026-12-31T00:00:00.000Z'))).toBe('2026-12-31')
    expect(lireDate('31/02/2026')).toBeNull()
    expect(lireDate('demain')).toBeNull()
  })
  it('périodicités', () => {
    expect(lirePeriodicite('Trimestriel')).toBe('TRIMESTRIELLE')
    expect(lirePeriodicite('Quarterly')).toBe('TRIMESTRIELLE')
    expect(lirePeriodicite('Mensuelle')).toBe('MENSUELLE')
    expect(lirePeriodicite('M')).toBe('MENSUELLE')
    expect(lirePeriodicite('semestriel')).toBeNull()
  })
  it('durées (mois ou trimestres)', () => {
    expect(lireDureeMois('63', 'MOIS')).toBe(63)
    expect(lireDureeMois('21', 'TRIMESTRES')).toBe(63)
    expect(lireDureeMois('21T', 'MOIS')).toBe(63)
    expect(lireDureeMois('36 mois', 'TRIMESTRES')).toBe(36)
    expect(lireDureeMois('0', 'MOIS')).toBeNull()
    expect(lireDureeMois('abc', 'MOIS')).toBeNull()
  })
})

describe('reconnaissance des colonnes', () => {
  it('en-têtes français', () => {
    const m = suggererMapping(['N° de contrat', 'Raison sociale', 'SIREN', 'Désignation', 'Loyer HT', 'Périodicité', 'Durée (mois)', 'Date du 1er loyer', 'Date de fin', 'Montant financé', 'Commercial'])
    expect(m).toEqual({ ref: 0, client: 1, siret: 2, materiel: 3, loyer: 4, periodicite: 5, duree: 6, dateDebut: 7, dateFin: 8, montantReel: 9, commercial: 10 })
  })
  it('en-têtes anglais, « financement » ne devient pas « fin »', () => {
    const m = suggererMapping(['Contract number', 'Customer', 'Rent', 'Duration', 'Start date', 'End date', 'Financing amount'])
    expect(m).toMatchObject({ ref: 0, client: 1, loyer: 2, duree: 3, dateDebut: 4, dateFin: 5, montantReel: 6 })
  })
  it('colonne inconnue : pas de correspondance inventée', () => {
    expect(suggererMapping(['Truc', 'Machin'])).toEqual({})
  })
})

describe('lecture des lignes', () => {
  const mapping = { ref: 0, client: 1, loyer: 2, periodicite: 3, duree: 4, dateDebut: 5, dateFin: 6, montantReel: 7 }
  const opts = { mapping, uniteDuree: 'TRIMESTRES' as const, periodiciteDefaut: 'TRIMESTRIELLE' as const }
  it('lit une ligne complète ; la fin se déduit du 1er loyer + durée', () => {
    const { lues, erreurs } = lireLignes([['C1', 'ACME', '723,00', 'Trimestriel', '21', '01/01/2026', '', '12 552,08 €']], opts)
    expect(erreurs).toEqual([])
    expect(lues[0]).toMatchObject({ numero: 2, ref: 'C1', client: 'ACME', loyerCentimes: 72300, dureeMois: 63, montantReelCentimes: 1255208 })
    expect(lues[0].dateFin?.toISOString().slice(0, 10)).toBe('2031-04-01')
  })
  it('périodicité par défaut quand la colonne est vide ; lignes vides ignorées', () => {
    const { lues } = lireLignes([['C1', 'ACME', '723', '', '21', '', '', ''], ['', '', '', '', '', '', '', '']], opts)
    expect(lues).toHaveLength(1)
    expect(lues[0].periodicite).toBe('TRIMESTRIELLE')
  })
  it('signale chaque problème avec le numéro de ligne du fichier', () => {
    const { lues, erreurs } = lireLignes([['C1', '', 'abc', 'Trimestriel', 'xx', '', '', ''], ['C2', 'OK', '10', 'bizarre', '21', '', '', '']], opts)
    expect(lues).toEqual([])
    expect(erreurs[0]).toEqual({ numero: 2, message: 'client manquant, loyer illisible, durée illisible' })
    expect(erreurs[1].message).toContain('périodicité inconnue')
  })
})

// Format de l'export « My Contracts » de Grenke (en-têtes réels, valeurs fictives de même forme).
describe('export Grenke « My Contracts »', () => {
  const entetes = ['Contract No.', 'Status', 'Lessee', 'Sublessee', 'Term of lease', 'Amount', 'Leasing instalment', 'Start of primary period', 'End of primary period']
  const lignes = [
    ['100-00001', 'RunningContract', 'CLIENT A', '', '63', '27253.89', '526', '2026-07-01', '2031-10-01'],
    ['100-00002', 'ApplicationSettled', 'CLIENT B', '', '24', '4094.83', '190', '2027-01-01', '2029-01-01'],
    ['100-00003', 'DefectiveContract', 'CLIENT C', '', '63', '11025.64', '215', '2026-07-01', '2031-10-01'],
    ['100-00004', 'RunningContract', 'CLIENT D', '', '36', '5345.91', '170', '2026-07-01', '2029-07-01'],
  ]
  it('colonnes reconnues automatiquement', () => {
    expect(suggererMapping(entetes)).toEqual({ ref: 0, statut: 1, client: 2, duree: 4, montantReel: 5, loyer: 6, dateDebut: 7, dateFin: 8 })
  })
  it('« Statut du contrat » devient le statut, pas le n° de contrat', () => {
    expect(suggererMapping(['Statut du contrat', 'N° contrat'])).toMatchObject({ statut: 0, ref: 1 })
  })
  it('le loyer du fichier est mensuel : détecté, puis converti en loyer trimestriel (×3)', () => {
    const mapping = suggererMapping(entetes)
    expect(detecterUniteLoyer(lignes, mapping, 'MOIS')).toBe('PAR_MOIS')
    const { lues, erreurs } = lireLignes(lignes, { mapping, uniteDuree: 'MOIS', uniteLoyer: 'PAR_MOIS', periodiciteDefaut: 'TRIMESTRIELLE' })
    expect(erreurs).toEqual([])
    expect(lues[0]).toMatchObject({ ref: '100-00001', statut: 'RunningContract', client: 'CLIENT A', dureeMois: 63, loyerCentimes: 52600 * 3, montantReelCentimes: 2725389, periodicite: 'TRIMESTRIELLE' })
    expect(lues[0].dateDebut?.toISOString().slice(0, 10)).toBe('2026-07-01')
    expect(lues[0].dateFin?.toISOString().slice(0, 10)).toBe('2031-10-01')
  })
  it('un loyer mensuel reste mensuel si le contrat est mensuel', () => {
    const { lues } = lireLignes(lignes, { mapping: suggererMapping(entetes), uniteDuree: 'MOIS', uniteLoyer: 'PAR_MOIS', periodiciteDefaut: 'MENSUELLE' })
    expect(lues[0].loyerCentimes).toBe(52600)
  })
  it('un fichier dont le loyer est trimestriel est reconnu comme tel ; trop peu de lignes = pas de conclusion', () => {
    const trimestriel = lignes.map(l => [...l.slice(0, 6), String(Number(l[6]) * 3), ...l.slice(7)])
    expect(detecterUniteLoyer(trimestriel, suggererMapping(entetes), 'MOIS')).toBe('PAR_PERIODE')
    expect(detecterUniteLoyer(lignes.slice(0, 2), suggererMapping(entetes), 'MOIS')).toBeNull()
  })
})

describe('contrats d’un ancien financeur (liste BNP sans durée ni loyer par défaut)', () => {
  const entetes = ['Solde renouvelant', 'Raison sociale du client', 'N° Client', 'N° SIRET', 'N° Contrat', 'N° Lot', 'CP', 'Date début', 'Date fin', 'Matériel', 'Type/Modèle', 'Total']
  it('les colonnes sont reconnues, la durée peut se déduire des deux dates', () => {
    const m = suggererMapping(entetes)
    expect(m).toMatchObject({ client: 1, siret: 3, ref: 4, dateDebut: 7, dateFin: 8, materiel: 9 })
    expect(colonnesManquantes(m)).toEqual(['loyer'])
    expect(colonnesManquantes({ client: 0, loyer: 1, duree: 2 })).toEqual([])
    expect(colonnesManquantes({ client: 0, loyer: 1 })).toEqual(['duree'])
  })
  it('durée = écart entre les dates, au trimestre le plus proche pour un loyer trimestriel', () => {
    const d = (s: string) => new Date(`${s}T00:00:00Z`)
    expect(dureeDepuisDates(d('2022-07-01'), d('2027-10-01'), 'TRIMESTRIELLE')).toBe(63)
    expect(dureeDepuisDates(d('2020-05-25'), d('2027-10-01'), 'TRIMESTRIELLE')).toBe(87)
    expect(dureeDepuisDates(d('2022-07-01'), d('2023-07-01'), 'MENSUELLE')).toBe(12)
    expect(dureeDepuisDates(d('2027-01-01'), d('2026-01-01'), 'MENSUELLE')).toBeNull()
  })
  it('lecture complète : loyer saisi à la main, durée déduite, dates au format français', () => {
    const lignes = [['OUI', 'SAHAM EUROPE SAS', '11953118', '48007897100029', 'A1L65243', '1', '75008', '01/07/2022', '01/10/2027', 'COPIEUR MULTIFO...', '', '1512,20']]
    const m = { client: 1, siret: 3, ref: 4, dateDebut: 7, dateFin: 8, materiel: 9, loyer: 11 }
    const r = lireLignes(lignes, { mapping: m, uniteDuree: 'MOIS', uniteLoyer: 'PAR_PERIODE', periodiciteDefaut: 'TRIMESTRIELLE' })
    expect(r.erreurs).toEqual([])
    expect(r.lues[0]).toMatchObject({ client: 'SAHAM EUROPE SAS', ref: 'A1L65243', siret: '48007897100029', loyerCentimes: 151220, dureeMois: 63 })
    expect(r.lues[0].dateFin?.toISOString().slice(0, 10)).toBe('2027-10-01')
  })
  it('durée impossible à déduire : message précis', () => {
    const r = lireLignes([['X', '10', '2027-01-01', '2026-01-01']], { mapping: { client: 0, loyer: 1, dateDebut: 2, dateFin: 3 }, uniteDuree: 'MOIS', uniteLoyer: 'PAR_PERIODE', periodiciteDefaut: 'TRIMESTRIELLE' })
    expect(r.erreurs[0].message).toContain('durée non déductible')
  })
})
