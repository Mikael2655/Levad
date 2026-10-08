export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { COULEURS, NOM_COULEUR, clientsEnAlerte, type ClientEtat } from '@/lib/connect/alertes'

// Mail récapitulatif quotidien des alertes d'encre (17 h, heure de Paris), un seul par jour, aucun les jours sans alerte.
// Appelé plusieurs fois par jour par .github/workflows/alertes-quotidiennes.yml (qui gère l'heure d'été / d'hiver) :
// ce code n'envoie que si on est entre 17 h et 19 h à Paris et que le mail du jour n'est pas déjà parti.
// Même protection que les autres tâches planifiées : en-tête « Authorization: Bearer CRON_SECRET ».
// Paramètres de test : ?force=1 (envoie sans tenir compte de l'heure ni du mail déjà envoyé),
// ?apercu=1 (affiche le mail au lieu de l'envoyer).

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function parisMaintenant() {
  const parties = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const v = (t: string) => parties.find((p) => p.type === t)?.value ?? ''
  return { jour: `${v('year')}-${v('month')}-${v('day')}`, heure: Number(v('hour')) }
}

function construireMail(clients: ClientEtat[], urlParc: string) {
  const nbMachines = clients.reduce((n, c) => n + c.nbAlertes, 0)
  const blocs = clients
    .map((c) => {
      const lignes = [...c.machines]
        .sort((a, b) => Number(b.enAlerte) - Number(a.enAlerte))
        .map((m) => {
          const niveaux = m.couleurs
            .map((x) => {
              const txt = `${NOM_COULEUR[x.couleur]} ${x.pourcent === null ? '—' : x.pourcent + ' %'}`
              return x.alerte
                ? `<strong style="color:#dc2626">${txt} (alerte)</strong>`
                : x.bas
                  ? `<span style="color:#d97706">${txt} (en stock)</span>`
                  : txt
            })
            .join(' · ')
          return `<tr>
            <td style="padding:6px 10px;border-top:1px solid #e5e7eb;${m.enAlerte ? 'font-weight:bold' : 'color:#6b7280'}">${esc(m.nom)}</td>
            <td style="padding:6px 10px;border-top:1px solid #e5e7eb">${niveaux}</td></tr>`
        })
        .join('')
      const stock = COULEURS.map((k) => `${NOM_COULEUR[k]} ${c.stock[k]}`).join(' · ')
      return `<h3 style="margin:22px 0 4px">${esc(c.nom)}</h3>
        <p style="margin:0 0 6px;font-size:12px;color:#6b7280">Stock de cartouches chez le client : ${stock}</p>
        <table style="border-collapse:collapse;width:100%;font-size:13px">${lignes}</table>`
    })
    .join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin-top:0">Alertes d'encre : ${clients.length} client${clients.length > 1 ? 's' : ''}, ${nbMachines} machine${nbMachines > 1 ? 's' : ''}</h2>
  <p style="color:#4b5563">Niveau sous le seuil et plus de cartouche en stock. Les autres machines du client sont indiquées pour grouper la livraison.</p>
  ${blocs}
  <p style="margin-top:28px"><a href="${esc(urlParc)}/parc/alertes" style="color:#4b6b4b">Ouvrir les alertes</a> · <a href="${esc(urlParc)}/parc/stocks" style="color:#4b6b4b">Saisir un envoi</a></p>
</body></html>`
  return { html, sujet: `Alertes d'encre — ${clients.length} client${clients.length > 1 ? 's' : ''}, ${nbMachines} machine${nbMachines > 1 ? 's' : ''}` }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = req.nextUrl.searchParams.get('force') === '1'
  const apercu = req.nextUrl.searchParams.get('apercu') === '1'
  const { jour, heure } = parisMaintenant()

  if (!force && !apercu) {
    if (heure < 17 || heure > 18) return NextResponse.json({ envoye: false, raison: `hors de la plage 17 h - 19 h (il est ${heure} h à Paris)` })
    const deja = await prisma.connectAlerteEnvoi.findUnique({ where: { jour } })
    if (deja) return NextResponse.json({ envoye: false, raison: 'mail du jour déjà envoyé' })
  }

  const clients = await clientsEnAlerte()
  if (clients.length === 0) return NextResponse.json({ envoye: false, raison: 'aucune alerte aujourd’hui' })

  const urlParc = process.env.PARC_URL || 'https://connect.levad.fr'
  const { html, sujet } = construireMail(clients, urlParc)
  if (apercu) return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: process.env.RELEVE_EMAIL_FROM || 'Levad Relevés <social@levad.fr>',
    to: process.env.RELEVE_EMAIL_TO || 'mobadia@levad.fr',
    subject: sujet,
    html,
  })
  if (error) {
    console.error('alertes: Resend', error)
    return NextResponse.json({ envoye: false, erreur: String(error.message ?? 'envoi impossible') }, { status: 502 })
  }
  if (!force) await prisma.connectAlerteEnvoi.create({ data: { jour, nbAlertes: clients.length } })
  return NextResponse.json({ envoye: true, clients: clients.length })
}
