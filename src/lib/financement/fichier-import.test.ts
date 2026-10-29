import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { lireFichier } from './fichier-import'

async function xlsx(lignes: (string | number | Date)[][]): Promise<Buffer> {
  const classeur = new ExcelJS.Workbook()
  const feuille = classeur.addWorksheet('Contrats')
  lignes.forEach(l => feuille.addRow(l))
  return Buffer.from(await classeur.xlsx.writeBuffer())
}

describe('lecture des fichiers d’import', () => {
  it('Excel : en-tête, nombres, dates', async () => {
    const buf = await xlsx([['N° contrat', 'Client', 'Loyer', 'Début'], ['C1', 'ACME', 723.5, new Date('2026-01-01T00:00:00Z')], ['C2', 'Dupont', 100, new Date('2026-02-15T00:00:00Z')]])
    const r = await lireFichier('export.xlsx', buf)
    expect(r.entetes).toEqual(['N° contrat', 'Client', 'Loyer', 'Début'])
    expect(r.lignes).toEqual([['C1', 'ACME', '723.5', '2026-01-01'], ['C2', 'Dupont', '100', '2026-02-15']])
  })
  it('CSV à point-virgule', async () => {
    const r = await lireFichier('export.csv', Buffer.from('N° contrat;Client;Loyer\nC1;ACME;723,50\n'))
    expect(r.entetes).toEqual(['N° contrat', 'Client', 'Loyer'])
    expect(r.lignes).toEqual([['C1', 'ACME', '723,50']])
  })
  it('CSV enregistré en ANSI (accents Excel)', async () => {
    const r = await lireFichier('export.csv', Buffer.from('Société;Loyer\nÉlectricité Müller;10\n', 'latin1'))
    expect(r.lignes[0][0]).toBe('Électricité Müller')
  })
  it('refuse les formats inconnus et les fichiers vides', async () => {
    await expect(lireFichier('export.xls', Buffer.from(''))).rejects.toThrow('.xlsx ou .csv')
    await expect(lireFichier('export.csv', Buffer.from('seulement un en-tête\n'))).rejects.toThrow('au moins une ligne')
    await expect(lireFichier('faux.xlsx', Buffer.from('pas un excel'))).rejects.toThrow('illisible')
  })
})
