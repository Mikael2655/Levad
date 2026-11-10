export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSlots, setSlots } from '@/lib/queue'

export async function GET() {
  return NextResponse.json(await getSlots())
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const days = Array.isArray(body.days) ? body.days : []
    if (days.length === 0) return NextResponse.json({ error: 'Choisissez au moins un jour' }, { status: 400 })
    return NextResponse.json(await setSlots(body))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
