// E-mails de l'outil de financement : envoi (Resend), journal, destinataires réglables, règles « qui reçoit quoi ».
// Un envoi raté ne bloque JAMAIS l'action de l'utilisateur : il est noté dans le journal (Administration → Notifications).
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { LIBELLES_ETAPE, type EtapeSignature } from './etapes'
import { LIBELLES_STATUT } from './statuts'
import type { Statut } from './droits'

// --- Envoi -------------------------------------------------------------------------------------------------------------

export interface Mail {
  to: string
  sujet: string
  html: string
  texte: string
}
export type Expediteur = (m: Mail) => Promise<void>

export class ConfigurationMailAbsente extends Error {}

const expediteurResend: Expediteur = async m => {
  const cle = process.env.RESEND_API_KEY
  if (!cle) throw new ConfigurationMailAbsente('RESEND_API_KEY absente de cet environnement')
  const r = await new Resend(cle).emails.send({
    from: process.env.FIN_MAIL_FROM || 'Levad Financements <financement@levad.fr>',
    to: m.to,
    subject: m.sujet,
    html: m.html,
    text: m.texte,
  })
  if (r.error) throw new Error(r.error.message)
}

let expediteur: Expediteur = expediteurResend
// Pour les tests : remplace l'envoi réel (null = revient à Resend).
export const remplacerExpediteur = (e: Expediteur | null) => { expediteur = e ?? expediteurResend }

export const urlBase = () => (process.env.FIN_BASE_URL || 'https://leasing.levad.fr').replace(/\/+$/, '')

export type TypeNotification = 'DEMANDE_FINANCEUR' | 'RETOUR_FINANCEUR' | 'CLIENT_A_SIGNE' | 'LEVAD_DOIT_SIGNER' | 'LIVRAISON_A_CONFIRMER' | 'DOSSIER_COMPLET' | 'RACHAT_FINANCEUR'

export async function envoyerEtJournaliser(type: TypeNotification, demandeId: number | null, m: Mail): Promise<'ENVOYE' | 'ECHEC' | 'IGNORE'> {
  let statut: 'ENVOYE' | 'ECHEC' | 'IGNORE' = 'ENVOYE'
  let erreur: string | null = null
  try {
    await expediteur(m)
  } catch (e) {
    statut = e instanceof ConfigurationMailAbsente ? 'IGNORE' : 'ECHEC'
    erreur = (e as Error).message.slice(0, 300)
    console.error(`Notification ${type} : ${statut}`, erreur)
  }
  try {
    await prisma.finNotification.create({ data: { type, demandeId, destinataireEmail: m.to, sujet: m.sujet, statut, erreur } })
  } catch (e) {
    console.error('Journal des notifications indisponible', e)
  }
  return statut
}

// --- Gabarit -----------------------------------------------------------------------------------------------------------

const echapper = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function gabarit(p: { titre: string; intro?: string; lignes?: [string, string][]; lien?: { url: string; texte: string }; pied?: string }): { html: string; texte: string } {
  const lignes = p.lignes ?? []
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <div style="background:#1e3a5f;color:white;padding:16px 24px;border-radius:8px 8px 0 0;"><h1 style="margin:0;font-size:18px;">${echapper(p.titre)}</h1></div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    ${p.intro ? `<p style="margin-top:0;">${echapper(p.intro)}</p>` : ''}
    ${lignes.length ? `<table style="border-collapse:collapse;width:100%;font-size:14px;">${lignes.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap;">${echapper(k)}</td><td style="padding:6px 0;"><b>${echapper(v).replace(/\n/g, '<br>')}</b></td></tr>`).join('')}</table>` : ''}
    ${p.lien ? `<p style="margin-top:20px;"><a href="${p.lien.url}" style="display:inline-block;background:#1e3a5f;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">${echapper(p.lien.texte)}</a></p>` : ''}
    ${p.pied ? `<p style="margin-top:24px;font-size:11px;color:#9ca3af;">${echapper(p.pied)}</p>` : ''}
  </div>
</body></html>`
  const texte = [p.titre, '', p.intro ?? '', ...lignes.map(([k, v]) => `${k} : ${v}`), p.lien ? `\n${p.lien.texte} : ${p.lien.url}` : '', p.pied ? `\n${p.pied}` : ''].filter(l => l !== undefined).join('\n').replace(/\n{3,}/g, '\n\n')
  return { html, texte }
}

// --- Réglages (destinataires) ----------------------------------------------------------------------------------------

export const PARAM_SIGNATAIRE_LEVAD = 'notif.signataireLevadId' // reçoit « LEVAD doit signer »
export const PARAM_DOSSIER_COMPLET = 'notif.dossierCompletId' // reçoit « dossier complet » en plus du commercial

export async function lireParametre(cle: string): Promise<string | null> {
  return (await prisma.finParametre.findUnique({ where: { cle } }))?.valeur ?? null
}

export async function ecrireParametre(cle: string, valeur: string | null) {
  if (valeur === null || valeur === '') await prisma.finParametre.deleteMany({ where: { cle } })
  else await prisma.finParametre.upsert({ where: { cle }, create: { cle, valeur }, update: { valeur } })
}

interface Destinataire { id: number; email: string; prenom: string; nom: string }

async function destinataireActif(id: number | null | undefined): Promise<Destinataire | null> {
  if (!id) return null
  const u = await prisma.finUtilisateur.findUnique({ where: { id } })
  return u && u.actif ? { id: u.id, email: u.email, prenom: u.prenom, nom: u.nom } : null
}

// Non réglé (ou personne désactivée depuis) : le premier administrateur actif, comme au départ.
async function destinataireParametre(cle: string) {
  const v = await lireParametre(cle)
  const choisi = await destinataireActif(v ? Number(v) : null)
  if (choisi) return choisi
  const admin = await prisma.finUtilisateur.findFirst({ where: { role: 'ADMIN', actif: true }, orderBy: { id: 'asc' } })
  return admin ? { id: admin.id, email: admin.email, prenom: admin.prenom, nom: admin.nom } : null
}

// --- Règles : qui reçoit quoi ----------------------------------------------------------------------------------------

export interface ChangementDemande {
  demandeId: number
  acteurId: number | null // null : changement automatique (synchronisation avec le financeur)
  statutAvant: string
  etapeAvant: string | null
  statutApres: string
  etapeApres: string | null
}

// Retour du financeur : accord, refus, pièces complémentaires -> le commercial de la demande.
const RETOURS: Partial<Record<Statut, { titre: string; sujet: string }>> = {
  PRETE_A_SIGNER: { titre: 'Accord du financeur', sujet: 'Accord' },
  REFUSEE: { titre: 'Demande refusée', sujet: 'Refus' },
  INFOS_MANQUANTES: { titre: 'Pièces complémentaires demandées', sujet: 'Pièces complémentaires demandées' },
}

export async function notifierChangement(c: ChangementDemande): Promise<void> {
  try {
    const d = await prisma.finDemande.findUnique({ where: { id: c.demandeId }, include: { commercial: true } })
    if (!d) return
    const commercial = await destinataireActif(d.commercialId)
    const lien = { url: `${urlBase()}/financement/demandes/${d.id}`, texte: 'Ouvrir la demande' }
    const base: [string, string][] = [['Demande', d.reference], ['Client', d.raisonSociale]]
    // l'auteur du changement ne reçoit pas de mail pour ce qu'il vient de faire lui-même
    const pasMoi = (u: Destinataire | null) => (u && u.id !== c.acteurId ? u : null)
    const envois: { type: TypeNotification; to: Destinataire | null; sujet: string; page: ReturnType<typeof gabarit> }[] = []
    const ajouter = (type: TypeNotification, to: Destinataire | null, sujet: string, titre: string, intro: string, plus: [string, string][] = []) => {
      if (to) envois.push({ type, to, sujet: `${sujet} – ${d.reference} ${d.raisonSociale}`, page: gabarit({ titre, intro, lignes: [...base, ...plus], lien, pied: 'Message automatique de l’outil de financement LEVAD.' }) })
    }

    if (c.statutApres !== c.statutAvant) {
      const retour = RETOURS[c.statutApres as Statut]
      if (retour) {
        const detail: [string, string][] = c.statutApres === 'INFOS_MANQUANTES' && d.infosManquantes ? [['Pièces demandées', d.infosManquantes]] : []
        ajouter('RETOUR_FINANCEUR', pasMoi(commercial), retour.sujet, retour.titre, `Le financeur a répondu à votre demande : ${LIBELLES_STATUT[c.statutApres as Statut].toLowerCase()}.`, detail)
      }
      if (c.statutApres === 'SIGNEE') {
        const responsable = await destinataireParametre(PARAM_DOSSIER_COMPLET)
        const tous = [pasMoi(commercial), pasMoi(responsable)].filter((u, i, a): u is Destinataire => !!u && a.findIndex(x => x?.id === u.id) === i)
        for (const u of tous) ajouter('DOSSIER_COMPLET', u, 'Dossier complet', 'Dossier complet', 'Le dossier est complet : le contrat est signé.')
      }
    }

    if (c.etapeApres && c.etapeApres !== c.etapeAvant && c.statutApres === 'EN_SIGNATURE') {
      if (c.etapeApres === 'ATTENTE_LEVAD') {
        ajouter('CLIENT_A_SIGNE', pasMoi(commercial), 'Le client a signé', 'Le client a signé', 'Votre client vient de signer le contrat.')
        ajouter('LEVAD_DOIT_SIGNER', pasMoi(await destinataireParametre(PARAM_SIGNATAIRE_LEVAD)), 'LEVAD doit signer', 'LEVAD doit signer', 'Le client a signé : c’est maintenant à LEVAD de signer le contrat.', [['Étape', LIBELLES_ETAPE.ATTENTE_LEVAD]])
      }
      if (c.etapeApres === 'ATTENTE_LIVRAISON') {
        ajouter('LIVRAISON_A_CONFIRMER', pasMoi(commercial), 'Confirmation de livraison attendue', 'Confirmation de livraison attendue', 'Le client doit confirmer la livraison du matériel.')
      }
    }

    for (const e of envois) await envoyerEtJournaliser(e.type, d.id, { to: e.to!.email, sujet: e.sujet, html: e.page.html, texte: e.page.texte })
  } catch (e) {
    console.error('Notifications : erreur ignorée', e)
  }
}

// --- Mail récapitulatif vers le financeur (via la personne choisie) ---------------------------------------------------

const euros = (c: number) => (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

// Pour un financeur sans API (ex. Solubail) : un mail avec les éléments à transmettre, adressé à la personne choisie
// dans Administration → Financeurs (administrateur ou assistante), qui le transfère au financeur.
export async function envoyerMailFinanceur(demandeId: number): Promise<'ENVOYE' | 'ECHEC' | 'IGNORE' | 'SANS_DESTINATAIRE'> {
  try {
    const d = await prisma.finDemande.findUnique({ where: { id: demandeId }, include: { lignes: { orderBy: { id: 'asc' } }, financeur: true, commercial: true, rachat: { include: { contrat: true } } } })
    if (!d || !d.financeur.envoiParMail) return 'SANS_DESTINATAIRE'
    const to = await destinataireActif(d.financeur.destinataireMailId)
    if (!to) return 'SANS_DESTINATAIRE'
    const siren = d.siret.replace(/\D/g, '').slice(0, 9)
    const duree = d.dureeMois % 3 === 0 ? `${d.dureeMois / 3} trimestres` : `${d.dureeMois} mois`
    const materiel = d.lignes.map(l => `${l.quantite} × ${l.designation}${l.constructeur ? ` (${l.constructeur})` : ''}`).join('\n')
    const page = gabarit({
      titre: `Demande de financement ${d.financeur.nom}`,
      intro: `À transmettre à ${d.financeur.nom} pour étude. Réponse attendue : accord, refus ou pièces complémentaires, avec le montant financé.`,
      lignes: [
        ['SIREN', siren || '(à renseigner)'],
        ['Raison sociale', d.raisonSociale],
        ['Loyer', `${euros(d.loyerCentimes)} HT`],
        ['Périodicité', d.periodicite === 'MENSUELLE' ? 'Mensuelle' : 'Trimestrielle'],
        ['Durée', duree],
        ['Matériel', materiel],
        ...(d.rachat ? [['Rachat de contrat intégré', `${euros(d.rachat.totalCentimes)} (contrat ${d.rachat.contrat.refFinanceur ?? d.rachat.contrat.raisonSociale}, résiliation au ${d.rachat.dateResiliation.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}) — compris dans le montant financé`] as [string, string]] : []),
      ],
      lien: { url: `${urlBase()}/financement/demandes/${d.id}`, texte: 'Ouvrir la demande (pour enregistrer la réponse)' },
      pied: `Référence ${d.reference} · commercial : ${d.commercial.prenom} ${d.commercial.nom}`,
    })
    return await envoyerEtJournaliser('DEMANDE_FINANCEUR', d.id, { to: to.email, sujet: `Demande de financement ${d.financeur.nom} – ${d.raisonSociale} (SIREN ${siren || 'à renseigner'})`, html: page.html, texte: page.texte })
  } catch (e) {
    console.error('Mail financeur : erreur ignorée', e)
    return 'ECHEC'
  }
}
