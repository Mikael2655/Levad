export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateQueuedPost, holdUntilDay, movePost, pickTopic, rebuildSlots, shiftOneSlot, writeQueuedPost } from '@/lib/queue'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.action === 'shift') {
      await shiftOneSlot()
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'hold') {
      await holdUntilDay(body.day ?? null)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'personal') {
      const kind = body.kind === 'parcours' ? 'parcours' : 'metier'
      const post = await writeQueuedPost({ topic: '', angle: '', personal: kind, hint: String(body.hint ?? '').slice(0, 500) || undefined })
      return NextResponse.json({ post })
    }

    if (body.action === 'pick') {
      return NextResponse.json({ picked: await pickTopic() })
    }

    if (body.action === 'write') {
      const { topic, angle, facts, personal, hint } = body.picked ?? {}
      if (!topic && !personal) return NextResponse.json({ error: 'sujet manquant' }, { status: 400 })
      const post = await writeQueuedPost({ topic: topic ?? '', angle: angle ?? '', facts, personal, hint })
      return NextResponse.json({ post })
    }

    if (body.action === 'generate') {
      const post = await generateQueuedPost()
      return NextResponse.json({ post })
    }

    if (body.action === 'move') {
      const moved = await movePost(Number(body.id), body.direction === 'up' ? 'up' : 'down')
      return NextResponse.json({ moved })
    }

    if (body.action === 'validate') {
      const { id, validated, topic, contentLI, contentIG, imageUrl } = body
      const post = await prisma.socialPost.update({
        where: { id: Number(id) },
        data: {
          status: validated ? 'scheduled' : 'draft',
          ...(topic !== undefined && { topic }),
          ...(contentLI !== undefined && { contentLI }),
          ...(contentIG !== undefined && { contentIG }),
          ...(imageUrl !== undefined && { imageUrl: validated ? imageUrl : undefined }),
        },
      })
      await rebuildSlots()
      const fresh = await prisma.socialPost.findUnique({ where: { id: post.id }, omit: { imageUrl: true } })
      return NextResponse.json({ post: fresh })
    }

    return NextResponse.json({ error: 'action inconnue' }, { status: 400 })
  } catch (err) {
    console.error('[queue]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
