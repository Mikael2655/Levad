import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession, verifyPassword, clearSessionCookie } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const data: Record<string, unknown> = {}

  if (body?.externalCode !== undefined) {
    const code = body.externalCode?.trim().toUpperCase()
    data.externalCode = code || null
  }

  if (body?.rulesText !== undefined) {
    const rules = typeof body.rulesText === 'string' ? body.rulesText : ''
    data.rulesText = rules.trim() || null
  }

  const competition = await prisma.competition.update({ where: { id: competitionId }, data })
  return NextResponse.json(competition)
}

// Supprime définitivement la compétition (joueurs, matchs, pronostics,
// bonus... tout est en cascade côté schéma). Le mot de passe de l'admin est
// revérifié pour éviter une suppression déclenchée par erreur ou par un
// tiers qui aurait mis la main sur la session.
export async function DELETE(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''

  const admin = await prisma.player.findUnique({ where: { id: session.playerId } })
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 403 })
  }

  await prisma.competition.delete({ where: { id: competitionId } })
  clearSessionCookie()

  return NextResponse.json({ deleted: true })
}
