import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { timingSafeEqual } from 'crypto'
import { enregistrerReleve } from '@/lib/connect/ingestion'

// Réception des relevés envoyés par le programme de relevé LEVAD (dossier releve-snmp/).
// Le programme poste un JSON ; on le transmet par mail (en pièce jointe, avec un résumé lisible).
// Variables Vercel : RELEVE_TOKEN (obligatoire, même valeur que dans releve-snmp/config_envoi.py),
// RELEVE_EMAIL_TO et RELEVE_EMAIL_FROM (facultatifs), RESEND_API_KEY (obligatoire).

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_OCTETS = 3_500_000 // Vercel refuse les requêtes de plus de 4,5 Mo

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

// Texte sans retour à la ligne ni caractère de contrôle (pour l'objet du mail et le nom de fichier)
const propre = (v: unknown, max = 80) =>
  String(v ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max)

function jetonValide(recu: string, attendu: string) {
  const a = Buffer.from(recu)
  const b = Buffer.from(attendu)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  const attendu = process.env.RELEVE_TOKEN
  if (!attendu) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const recu = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jetonValide(recu, attendu)) return NextResponse.json({ error: 'refusé' }, { status: 401 })

  try {
    return await traiter(req)
  } catch (e) {
    // Jamais de "500" muet : on journalise et on dit au programme ce qui ne va pas
    console.error('releve:', e)
    const detail = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'erreur serveur', detail: detail.slice(0, 200) }, { status: 500 })
  }
}

async function traiter(req: Request) {
  const brut = await req.text()
  if (Buffer.byteLength(brut) > MAX_OCTETS) {
    return NextResponse.json({ error: 'trop volumineux' }, { status: 413 })
  }

  let data: any
  try {
    data = JSON.parse(brut)
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }
  if (!data || !Array.isArray(data.machines)) {
    return NextResponse.json({ error: 'format inattendu' }, { status: 400 })
  }

  // Enregistrement dans le tableau de bord. Si la base n'est pas prête, le mail part quand même.
  try {
    await enregistrerReleve(data)
  } catch (e) {
    console.error('releve: enregistrement dans la base impossible', e)
  }

  const societe = propre(data.societe) || '(non indiqué)'
  const machines: any[] = data.machines
  const imprimantes = machines.filter((m) => m && m.repond && m.brut !== undefined)

  const lignes = imprimantes
    .map(
      (m) =>
        `<tr><td>${esc(m.ip)}</td><td>${esc(m.marque)}</td><td>${esc(m.modele)}</td><td>${esc(m.numero_serie)}</td></tr>`
    )
    .join('')
  const details = imprimantes
    .map(
      (m) =>
        `<pre style="background:#f6f8fa;padding:12px;border-radius:6px;font-size:12px;overflow:auto;">${esc(m.resume_texte)}</pre>`
    )
    .join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h2 style="margin-top:0;">Relevé SNMP reçu</h2>
  <p><strong>Société saisie :</strong> ${esc(societe)}<br>
  <strong>PC :</strong> ${esc(propre(data.pc))} (${esc(propre(data.systeme, 120))})<br>
  <strong>Réseau analysé :</strong> ${esc(propre(data.plage))}<br>
  <strong>Date :</strong> ${esc(propre(data.date))} — programme v${esc(propre(data.version_programme, 20))}</p>
  <p>${imprimantes.length} copieur(s) lu(s) sur ${machines.length} équipement(s) répondant en SNMP.</p>
  ${
    lignes
      ? `<table cellpadding="6" style="border-collapse:collapse;font-size:13px;" border="1">
    <tr><th>IP</th><th>Marque</th><th>Modèle</th><th>N° de série</th></tr>${lignes}</table>`
      : ''
  }
  ${details}
  <p style="font-size:11px;color:#6b7280;">Le détail brut complet est dans le fichier JSON joint.</p>
</body></html>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const fichier = `releve_${propre(societe, 40).replace(/[^A-Za-z0-9_-]+/g, '_')}_${propre(data.date, 20).replace(/[^0-9_-]/g, '')}.json`
  const { error } = await resend.emails.send({
    from: process.env.RELEVE_EMAIL_FROM || 'Levad Relevés <social@levad.fr>',
    to: process.env.RELEVE_EMAIL_TO || 'mobadia@levad.fr',
    subject: `Relevé SNMP — ${societe} — ${imprimantes.length} copieur(s)`,
    html,
    attachments: [{ filename: fichier, content: Buffer.from(brut, 'utf-8') }],
  })
  if (error) {
    console.error('releve: Resend', error)
    return NextResponse.json({ error: 'envoi du mail impossible', detail: String(error.message ?? '').slice(0, 200) }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
