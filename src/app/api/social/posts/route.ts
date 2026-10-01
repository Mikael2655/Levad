export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (id) {
    const post = await prisma.socialPost.findUnique({ where: { id: parseInt(id) } })
    return NextResponse.json({ post })
  }
  const posts = await prisma.socialPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    omit: { imageUrl: true },
  })
  return NextResponse.json({ posts })
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, topic, contentLI, contentIG, status, publishedAt, scheduledAt, imageUrl } = await req.json()
    const post = await prisma.socialPost.update({
      where: { id },
      data: {
        ...(topic !== undefined && { topic }),
        ...(contentLI !== undefined && { contentLI }),
        ...(contentIG !== undefined && { contentIG }),
        ...(status !== undefined && { status }),
        ...(publishedAt !== undefined && { publishedAt: new Date(publishedAt) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      },
    })
    return NextResponse.json({ post })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  await prisma.socialPost.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
