export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

// Le middleware vérifie la session et renouvelle le cookie : cette route n'a rien d'autre à faire.
export async function POST() {
  return NextResponse.json({ ok: true })
}
