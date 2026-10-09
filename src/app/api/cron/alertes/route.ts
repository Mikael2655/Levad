export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { envoyerMail, MAIL_LEVAD } from '@/lib/connect/mail'
import { prisma } from '@/lib/db'
import { COULEURS, NOM_COULEUR, clientsEnAlerte, type ClientEtat } from '@/lib/connect/alertes'
import { dansLaPlageDEnvoi } from '@/lib/connect/horaire'
import { formaterDate } from '@/components/connect/affichage'

// Passage quotidien : (1) mail de déconnexion des clients dont le programme ne donne plus signe de vie ;
// (2) mail récapitulatif quotidien des alertes d'encre (vers 16 h 30, heure de Paris), un seul par jour, aucun les jours sans alerte.
// Appelé plusieurs fois par jour par .github/workflows/alertes-quotidiennes.yml (qui gère l'heure d'été / d'hiver) :
// ce code n'envoie que si on est entre 16 h 30 et 19 h à Paris et que le mail du jour n'est pas déjà parti.
// Protection : en-tête « Authorization: Bearer <secret> », où le secret est la variable ALERTES_SECRET
// (secret propre à ce mail) ou, à défaut, CRON_SECRET comme les autres tâches planifiées.
// Aucun envoi le samedi et le dimanche (heure de Paris).
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
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const v = (t: string) => parties.find((p) => p.type === t)?.value ?? ''
  return { weekend: /^(sam|dim)/i.test(v('weekday')), jour: `${v('year')}-${v('month')}-${v('day')}`, heure: Number(v('hour')), minute: Number(v('minute')) }
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

/** Clients dont le programme n'a plus donné signe de vie depuis leur délai réglé : un seul mail par déconnexion. */
async function signalerDeconnexions(apercu: boolean) {
  const clients = await prisma.connectClient.findMany({
    where: { modeReleve: 'agent', deconnexionSignaleLe: null, postes: { some: {} } },
    include: { postes: { orderBy: { derniereConnexion: 'desc' } } },
  })
  const deconnectes = clients.filter((c) => {
    const derniere = c.postes[0].derniereConnexion.getTime() // tous les PC du client : le plus récent signal compte
    return Date.now() - derniere > c.seuilDeconnexionJours * 24 * 3600 * 1000
  })
  if (apercu || deconnectes.length === 0) return { envoye: false, clients: deconnectes.length }

  const lignes = deconnectes
    .map((c) => {
      const p = c.postes[0]
      return `<tr>
        <td style="padding:6px 10px;border-top:1px solid #e5e7eb;font-weight:bold">${esc(c.nom)}</td>
        <td style="padding:6px 10px;border-top:1px solid #e5e7eb">${esc(formaterDate(p.derniereConnexion))}</td>
        <td style="padding:6px 10px;border-top:1px solid #e5e7eb">${esc(p.nom)}${c.postes.length > 1 ? ` (+${c.postes.length - 1} autre${c.postes.length > 2 ? 's' : ''})` : ''}</td>
        <td style="padding:6px 10px;border-top:1px solid #e5e7eb">${c.seuilDeconnexionJours} j</td></tr>`
    })
    .join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin-top:0">Levad Connect : ${deconnectes.length} client${deconnectes.length > 1 ? 's' : ''} déconnecté${deconnectes.length > 1 ? 's' : ''}</h2>
  <p style="color:#4b5563">Ces clients n'ont plus donné signe de vie depuis le délai réglé. La date de dernière connexion est la date de déconnexion.</p>
  <table style="border-collapse:collapse;width:100%;font-size:13px">
    <tr style="text-align:left;color:#6b7280"><th style="padding:6px 10px">Client</th><th style="padding:6px 10px">Dernière connexion</th><th style="padding:6px 10px">Ordinateur</th><th style="padding:6px 10px">Délai</th></tr>
    ${lignes}
  </table>
  <p style="margin-top:24px"><a href="${esc(process.env.PARC_URL || 'https://connect.levad.fr')}/parc/connexions" style="color:#4b6b4b">Ouvrir les connexions</a></p>
</body></html>`
  await envoyerMail({
    to: MAIL_LEVAD(),
    sujet: `Levad Connect — ${deconnectes.length} client${deconnectes.length > 1 ? 's' : ''} déconnecté${deconnectes.length > 1 ? 's' : ''}`,
    html,
  })
  await prisma.connectClient.updateMany({ where: { id: { in: deconnectes.map((c) => c.id) } }, data: { deconnexionSignaleLe: new Date() } })
  return { envoye: true, clients: deconnectes.length }
}

export async function GET(req: NextRequest) {
  const secret = process.env.ALERTES_SECRET || process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'ALERTES_SECRET non configuré' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = req.nextUrl.searchParams.get('force') === '1'
  const apercu = req.nextUrl.searchParams.get('apercu') === '1'
  const { jour, heure, minute, weekend } = parisMaintenant()

  // Aucun mail d'alerte (encre ou déconnexion) le samedi et le dimanche : ils partent le lundi, l'état étant recalculé à chaque passage.
  if (!force && !apercu && weekend) {
    return NextResponse.json({ envoye: false, raison: 'week-end : aucun mail d’alerte le samedi et le dimanche' })
  }

  if (!force && !apercu && !dansLaPlageDEnvoi(heure, minute)) {
    return NextResponse.json({
      envoye: false,
      raison: `hors de la plage 16 h 30 - 19 h (il est ${heure} h ${String(minute).padStart(2, '0')} à Paris)`,
    })
  }

  // 1) déconnexions (un seul mail par déconnexion, quel que soit le nombre de passages dans la journée)
  let deconnexions: { envoye: boolean; clients: number } | { erreur: string } = { envoye: false, clients: 0 }
  try {
    deconnexions = await signalerDeconnexions(apercu)
  } catch (e) {
    console.error('alertes: déconnexions', e)
    deconnexions = { erreur: e instanceof Error ? e.message : String(e) }
  }

  // 2) alertes d'encre : au plus un mail par jour
  if (!force && !apercu) {
    const deja = await prisma.connectAlerteEnvoi.findUnique({ where: { jour } })
    if (deja) return NextResponse.json({ envoye: false, raison: 'mail du jour déjà envoyé', deconnexions })
  }
  const clients = await clientsEnAlerte()
  if (clients.length === 0) return NextResponse.json({ envoye: false, raison: 'aucune alerte aujourd’hui', deconnexions })

  const urlParc = process.env.PARC_URL || 'https://connect.levad.fr'
  const { html, sujet } = construireMail(clients, urlParc)
  if (apercu) return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })

  try {
    await envoyerMail({ to: MAIL_LEVAD(), sujet, html })
  } catch (e) {
    console.error('alertes: envoi', e)
    return NextResponse.json({ envoye: false, erreur: e instanceof Error ? e.message : 'envoi impossible', deconnexions }, { status: 502 })
  }
  if (!force) await prisma.connectAlerteEnvoi.create({ data: { jour, nbAlertes: clients.length } })
  return NextResponse.json({ envoye: true, clients: clients.length, deconnexions })
}
