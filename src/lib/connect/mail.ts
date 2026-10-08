import { Resend } from 'resend'

// Envoi de mail (Resend) : expéditeur et destinataire réglables par variables Vercel.
export const MAIL_LEVAD = () => process.env.RELEVE_EMAIL_TO || 'mobadia@levad.fr'
export const EXPEDITEUR = () => process.env.RELEVE_EMAIL_FROM || 'Levad Relevés <social@levad.fr>'

export async function envoyerMail(params: { to: string; sujet: string; html: string }) {
  // Mode essai (MAIL_SIMULE=1, jamais activé en production) : le mail est affiché dans les journaux au lieu d'être envoyé.
  if (process.env.MAIL_SIMULE === '1') {
    console.log(`[mail simulé] à ${params.to} — ${params.sujet}`)
    return
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({ from: EXPEDITEUR(), to: params.to, subject: params.sujet, html: params.html })
  if (error) throw new Error(String(error.message ?? 'envoi du mail impossible'))
}
