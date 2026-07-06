import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth'
import { generateJoinCode } from '@/lib/competition'

export async function GET() {
  const competitions = await prisma.competition.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { players: true } },
    },
  })

  return NextResponse.json(
    competitions.map((c) => ({ id: c.id, name: c.name, createdAt: c.createdAt, playerCount: c._count.players }))
  )
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const competitionName = body?.competitionName?.trim()
  const adminName = body?.adminName?.trim()
  const adminEmail = body?.adminEmail?.trim().toLowerCase()
  const adminPassword = body?.adminPassword

  if (!competitionName || !adminName || !adminEmail || !adminPassword || adminPassword.length < 6) {
    return NextResponse.json(
      { error: 'Nom de la compétition, nom, email et mot de passe (6 caractères min.) de l\'administrateur sont requis.' },
      { status: 400 }
    )
  }

  let joinCode = generateJoinCode()
  for (let attempts = 0; attempts < 5; attempts++) {
    const existing = await prisma.competition.findUnique({ where: { joinCode } })
    if (!existing) break
    joinCode = generateJoinCode()
  }

  const competition = await prisma.competition.create({
    data: { name: competitionName, joinCode },
  })

  const passwordHash = await hashPassword(adminPassword)
  const admin = await prisma.player.create({
    data: {
      competitionId: competition.id,
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
    },
  })

  const token = await createSessionToken({ playerId: admin.id, competitionId: competition.id, role: 'ADMIN' })
  await setSessionCookie(token)

  return NextResponse.json({ id: competition.id, name: competition.name, joinCode: competition.joinCode }, { status: 201 })
}
