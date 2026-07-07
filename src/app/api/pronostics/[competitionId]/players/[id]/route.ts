import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: { competitionId: string; id: string } }
) {
  const competitionId = Number(params.competitionId)
  const id = Number(params.id)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const data: Record<string, unknown> = {}

  if (body?.name !== undefined) {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: 'Le nom ne peut pas être vide.' }, { status: 400 })
    data.name = name
  }

  if (body?.role !== undefined) {
    if (body.role !== 'ADMIN' && body.role !== 'PLAYER') {
      return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
    }
    if (id === session.playerId && body.role === 'PLAYER') {
      return NextResponse.json({ error: 'Vous ne pouvez pas retirer vos propres droits admin.' }, { status: 400 })
    }
    data.role = body.role
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 })
  }

  const player = await prisma.player.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(player)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { competitionId: string; id: string } }
) {
  const competitionId = Number(params.competitionId)
  const id = Number(params.id)
  const session = await getCompetitionSession(competitionId)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }
  if (id === session.playerId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 400 })
  }

  await prisma.player.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
