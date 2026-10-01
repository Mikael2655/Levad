export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// One-time migration endpoint
export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "SocialPost" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3)`)
    return NextResponse.json({ success: true, message: 'scheduledAt column added' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
