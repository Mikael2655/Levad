export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getPersona, setPersona } from '@/lib/queue'

export async function GET() {
  return NextResponse.json(await getPersona())
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const bio = String(body.bio ?? '').slice(0, 8000)
    const rhythm = Math.min(20, Math.max(0, Math.round(Number(body.rhythm ?? 4))))
    await setPersona({ bio, rhythm: Number.isFinite(rhythm) ? rhythm : 4 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
