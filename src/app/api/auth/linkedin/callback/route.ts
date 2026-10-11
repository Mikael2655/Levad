export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return new Response(`<html><body><h2>Erreur LinkedIn : ${error}</h2></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  if (!code) {
    return new Response('<html><body><h2>Code manquant</h2></body></html>', {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    return new Response(`<html><body><h2>Erreur token</h2><pre>${err}</pre></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const { access_token } = await tokenRes.json()

  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  const profile = await profileRes.json()
  const personUrn = `urn:li:person:${profile.sub}`

  return new Response(`<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:24px;">
  <h2 style="color:#1e3a5f;">✅ LinkedIn connecté !</h2>
  <p>Ajoute ces 2 variables dans <strong>Vercel → Settings → Environment Variables</strong> :</p>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">LINKEDIN_ACCESS_TOKEN</td>
      <td style="padding:8px;border:1px solid #e5e7eb;word-break:break-all;">${access_token}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">LINKEDIN_PERSON_URN</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${personUrn}</td>
    </tr>
  </table>
  <p style="color:#ef4444;margin-top:16px;">⚠️ Ferme cette page après avoir copié les valeurs.</p>
</body></html>`, {
    headers: { 'Content-Type': 'text/html' },
  })
}
