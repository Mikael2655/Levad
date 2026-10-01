export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'LINKEDIN_ACCESS_TOKEN manquant' }, { status: 500 })

  const [r1, r2] = await Promise.all([
    fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${token}` } }),
    fetch('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' } }),
  ])
  const [userinfo, me] = await Promise.all([r1.json(), r2.json()])
  return NextResponse.json({ userinfo_status: r1.status, userinfo, me_status: r2.status, me })
}
