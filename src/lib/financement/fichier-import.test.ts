import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { lireFichier } from './fichier-import'
import { lireXlsxSimple } from './xlsx-simple'

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

  it('lecteur de secours : même résultat qu’ExcelJS (textes, nombres, dates, cellules vides, accents, &)', async () => {
    const buf = await xlsx([['N° contrat', 'Client', 'Loyer', 'Début', 'Note'], ['C1', 'Dupont & Fils <SARL>', 723.5, new Date('2026-01-01T00:00:00Z'), ''], ['C2', 'Électricité', 100, new Date('2026-02-15T00:00:00Z'), 'ok']])
    const secours = await lireXlsxSimple(buf)
    expect(secours).toEqual([['N° contrat', 'Client', 'Loyer', 'Début', 'Note'], ['C1', 'Dupont & Fils <SARL>', '723.5', '2026-01-01', ''], ['C2', 'Électricité', '100', '2026-02-15', 'ok']])
  })
  it('messages clairs : ancien .xls, page web renommée, texte renommé, faux fichier', async () => {
    await expect(lireFichier('a.xlsx', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0]))).rejects.toThrow('ancien format Excel')
    await expect(lireFichier('a.xlsx', Buffer.from('<html><table><tr><td>x</td></tr></table></html>'))).rejects.toThrow('page web')
    const r = await lireFichier('a.xlsx', Buffer.from('N° contrat;Client\nC1;ACME\n'))
    expect(r.lignes).toEqual([['C1', 'ACME']])
    await expect(lireFichier('a.xlsx', Buffer.from('abc'))).rejects.toThrow('pas un vrai fichier')
    await expect(lireFichier('a.xlsx', Buffer.from('PK\u0003\u0004 zip cassé'))).rejects.toThrow('illisible')
  })

  it('un .xlsx atypique qu’ExcelJS refuse (pas de [Content_Types].xml, dates en format personnalisé) est lu par le lecteur de secours', async () => {
    const zip = new JSZip()
    zip.file('xl/workbook.xml', '<workbook xmlns:r="x"><sheets><sheet name="Contrats" sheetId="1" r:id="rId7"/></sheets></workbook>')
    zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId7" Type="t" Target="worksheets/feuille1.xml"/></Relationships>')
    zip.file('xl/sharedStrings.xml', '<sst><si><t>N° contrat</t></si><si><t>Début</t></si><si><r><t>GRK</t></r><r><t>-1</t></r></si></sst>')
    zip.file('xl/styles.xml', '<styleSheet><numFmts><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>')
    zip.file('xl/worksheets/feuille1.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>723.5</v></c><c r="C2" s="1"><v>46023</v></c></row></sheetData></worksheet>')
    const r = await lireFichier('MyContracts-2.xlsx', Buffer.from(await zip.generateAsync({ type: 'uint8array' })))
    expect(r.entetes).toEqual(['N° contrat', 'Colonne 2', 'Début'])
    expect(r.lignes).toEqual([['GRK-1', '723.5', '2026-01-01']])
  })
})
