import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function notifyPostReady(params: {
  postId: number
  topic: string
  contentLI: string
  contentIG: string
  appUrl: string
  toEmail: string
}) {
  const { postId, topic, contentLI, contentIG, appUrl, toEmail } = params
  const reviewUrl = `${appUrl}/social?post=${postId}`

  await resend.emails.send({
    from: 'Levad Social <social@levad.fr>',
    to: toEmail,
    subject: `✍️ Post à valider : ${topic}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <div style="background:#1e3a5f;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:18px;">Levad — Nouveau post à valider</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <p style="margin-top:0;">Claude AI a généré un nouveau post qui attend votre validation.</p>
    <p><strong>Sujet :</strong> ${topic}</p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:bold;color:#0369a1;text-transform:uppercase;">LinkedIn</p>
      <p style="margin:0;font-size:13px;white-space:pre-wrap;">${contentLI.substring(0, 400)}${contentLI.length > 400 ? '…' : ''}</p>
    </div>
    <div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:bold;color:#7c3aed;text-transform:uppercase;">Instagram</p>
      <p style="margin:0;font-size:13px;white-space:pre-wrap;">${contentIG.substring(0, 400)}${contentIG.length > 400 ? '…' : ''}</p>
    </div>
    <a href="${reviewUrl}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Valider ou modifier →
    </a>
    <p style="margin-top:24px;font-size:11px;color:#9ca3af;">Contenu généré automatiquement. Vérifiez avant de publier.</p>
  </div>
</body></html>`,
  })
}
