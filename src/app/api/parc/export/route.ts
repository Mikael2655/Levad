import ExcelJS from 'exceljs'
import { connecte } from '@/lib/connect/auth'
import { calculerExport, lireParams } from '@/lib/connect/export'

export const dynamic = 'force-dynamic'

function fr(d: Date | null) {
  return d ? d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : ''
}

export async function GET(req: Request) {
  if (!connecte()) return new Response('Non connecté', { status: 401 })
  const q: Record<string, string[]> = {}
  new URL(req.url).searchParams.forEach((v, k) => (q[k] = [...(q[k] ?? []), v]))
  const lu = lireParams(q)
  if (!lu) return new Response('Date invalide', { status: 400 })
  const { params, options } = lu
  const lignes = await calculerExport(params)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Compteurs')
  const colonnes: { header: string; key: string; width: number }[] = [
    { header: 'Client', key: 'client', width: 30 },
    { header: 'Référence', key: 'reference', width: 24 },
    { header: 'N° de série', key: 'serie', width: 18 },
    { header: 'Total N&B', key: 'nb', width: 14 },
    { header: 'Total couleur', key: 'couleur', width: 14 },
  ]
  if (options.scans) colonnes.push({ header: 'Scans (501)', key: 'scans', width: 14 })
  if (options.dateReleve) colonnes.push({ header: 'Date du relevé', key: 'dateReleve', width: 16 })
  if (params.date2) {
    const d2 = params.date2.split('-').reverse().join('/')
    colonnes.push(
      { header: 'Total N&B au ' + d2, key: 'nb2', width: 18 },
      { header: 'Volume N&B', key: 'vnb', width: 14 },
      { header: 'Total couleur au ' + d2, key: 'couleur2', width: 20 },
      { header: 'Volume couleur', key: 'vcouleur', width: 16 },
    )
  }
  ws.columns = colonnes
  for (const l of lignes) {
    ws.addRow({
      client: l.client,
      reference: l.reference,
      serie: l.serie,
      nb: l.nb,
      couleur: l.couleur,
      scans: l.scans,
      dateReleve: fr(l.dateReleve),
      nb2: l.nb2,
      couleur2: l.couleur2,
      vnb: l.nb !== null && l.nb2 !== null ? l.nb - l.nb2 : null,
      vcouleur: l.couleur !== null && l.couleur2 !== null ? l.couleur - l.couleur2 : null,
    })
  }
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  for (const k of ['nb', 'couleur', 'scans', 'nb2', 'couleur2', 'vnb', 'vcouleur']) ws.getColumn(k).numFmt = '#,##0'

  const buf = await wb.xlsx.writeBuffer()
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="compteurs-${params.date}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
