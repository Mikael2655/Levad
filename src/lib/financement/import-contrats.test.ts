import { describe, expect, it } from 'vitest'
import { lireCsv, lireDate, lireDureeMois, lireLignes, lireMontantCentimes, lirePeriodicite, suggererMapping } from './import-contrats'

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
