import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ player: null })

  const player = await prisma.player.findUnique({
    where: { id: session.playerId },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json({ player })
}
