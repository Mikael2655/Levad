import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const posts = await prisma.socialPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ posts })
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, topic, contentLI, contentIG, status, publishedAt } = await req.json()
    const post = await prisma.socialPost.update({
      where: { id },
      data: {
        ...(topic !== undefined && { topic }),
        ...(contentLI !== undefined && { contentLI }),
        ...(contentIG !== undefined && { contentIG }),
        ...(status !== undefined && { status }),
        ...(publishedAt !== undefined && { publishedAt: new Date(publishedAt) }),
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
