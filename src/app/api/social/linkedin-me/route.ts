export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'LINKEDIN_ACCESS_TOKEN manquant' }, { status: 500 })

  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return NextResponse.json({ status: res.status, data })
}
