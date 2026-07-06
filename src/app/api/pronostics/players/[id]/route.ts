import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const id = Number(params.id)
  const body = await request.json().catch(() => null)
  const role = body?.role

  if (role !== 'ADMIN' && role !== 'PLAYER') {
    return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
  }
  if (id === session.playerId && role === 'PLAYER') {
    return NextResponse.json({ error: 'Vous ne pouvez pas retirer vos propres droits admin.' }, { status: 400 })
  }

  const player = await prisma.player.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(player)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  const id = Number(params.id)
  if (id === session.playerId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 400 })
  }

  await prisma.player.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
