import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCompetitionSession, verifyPassword, hashPassword } from '@/lib/auth'

const MAX_AVATAR_LENGTH = 400_000 // ~300 Ko en base64, largement suffisant après redimensionnement

export async function PATCH(request: Request, { params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  if (!session) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const data: Record<string, unknown> = {}

  if (body?.name !== undefined) {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: 'Le pseudo ne peut pas être vide.' }, { status: 400 })
    data.name = name
  }

  if (body?.avatarUrl !== undefined) {
    const avatar = body.avatarUrl
    if (avatar === null || avatar === '') {
      data.avatarUrl = null
    } else if (typeof avatar === 'string' && avatar.startsWith('data:image/') && avatar.length <= MAX_AVATAR_LENGTH) {
      data.avatarUrl = avatar
    } else {
      return NextResponse.json({ error: 'Image invalide ou trop volumineuse.' }, { status: 400 })
    }
  }

  // Changement de mot de passe : nécessite le mot de passe actuel.
  if (body?.newPassword) {
    if (typeof body.newPassword !== 'string' || body.newPassword.length < 6) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères.' }, { status: 400 })
    }
    const player = await prisma.player.findUnique({ where: { id: session.playerId } })
    if (!player || !(await verifyPassword(body.currentPassword ?? '', player.passwordHash))) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 403 })
    }
    data.passwordHash = await hashPassword(body.newPassword)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 })
  }

  const updated = await prisma.player.update({
    where: { id: session.playerId },
    data,
    select: { id: true, name: true, avatarUrl: true },
  })

  return NextResponse.json(updated)
}
