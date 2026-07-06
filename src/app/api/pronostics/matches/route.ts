import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const matches = await prisma.match.findMany({ orderBy: { kickoff: 'asc' } })
  return NextResponse.json(matches)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const homeTeam = body?.homeTeam?.trim()
  const awayTeam = body?.awayTeam?.trim()
  const kickoff = body?.kickoff

  if (!homeTeam || !awayTeam || !kickoff) {
    return NextResponse.json({ error: 'Équipes et date/heure du match requises.' }, { status: 400 })
  }

  const match = await prisma.match.create({
    data: { homeTeam, awayTeam, kickoff: new Date(kickoff) },
  })

  return NextResponse.json(match, { status: 201 })
}
