export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { publishEverywhere } from '@/lib/publish'
import { generateQueuedPost, getHold, getSlots, rebuildSlots, sortQueue, workFillJobIfIdle } from '@/lib/queue'
import { latestSlotAtOrBefore } from '@/lib/slots'

const SLOT_WINDOW_MS = 6 * 3600000

// Appelé toutes les 15 minutes. Au créneau réglé dans Configuration (fenêtre de 6 h),
// publie le premier post VALIDÉ de la file, puis en génère un nouveau pour garder la file pleine.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const response = await publishPass()

  // Aucune publication ce coup-ci : si une préparation de posts a été abandonnée par le navigateur, on avance d'un post.
  try {
    const body = await response.clone().json()
    if (response.status === 200 && !body.published) await workFillJobIfIdle()
  } catch (e) {
    console.error('[cron/publish] fill job', e)
  }
  return response
}

async function publishPass(): Promise<NextResponse> {
  try {
    const config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
    if (!config) return NextResponse.json({ skipped: 'no config' })

    const now = new Date()
    const slot = latestSlotAtOrBefore(now, await getSlots())
    if (!slot || now.getTime() - slot.getTime() > SLOT_WINDOW_MS) {
      await rebuildSlots()
      return NextResponse.json({ published: 0, reason: 'hors créneau' })
    }

    const hold = await getHold(true)
    if (hold && slot.getTime() <= hold.getTime()) {
      await rebuildSlots()
      return NextResponse.json({ published: 0, reason: 'créneau décalé' })
    }

    const consumed = await prisma.socialPost.count({
      where: {
        OR: [
          { status: 'published', publishedAt: { gte: slot } },
          { status: 'failed', updatedAt: { gte: slot } },
        ],
      },
    })
    if (consumed > 0) return NextResponse.json({ published: 0, reason: 'créneau déjà traité' })

    const validated = sortQueue(await prisma.socialPost.findMany({
      where: { status: 'scheduled' },
      select: { id: true, status: true, scheduledAt: true },
    }))
    if (validated.length === 0) {
      await rebuildSlots()
      return NextResponse.json({ published: 0, reason: 'aucun post validé' })
    }

    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: validated[0].id } })
    const { published, linkedinPostId, instagramPostId, errors } =
      await publishEverywhere(post, config, post.imageUrl)

    await prisma.socialPost.update({
      where: { id: post.id },
      data: {
        status: published ? 'published' : 'failed',
        publishedAt: published ? now : undefined,
        linkedinPostId: linkedinPostId ?? undefined,
        instagramPostId: instagramPostId ?? undefined,
        errorMessage: errors.length > 0 ? errors.join(' | ') : undefined,
      },
    })

    if (published) {
      try {
        await generateQueuedPost()
      } catch (e) {
        console.error('[cron/publish] refill failed', e)
        await rebuildSlots()
      }
    } else {
      await rebuildSlots()
    }

    return NextResponse.json({ published: published ? 1 : 0, postId: post.id, errors })
  } catch (err) {
    console.error('[cron/publish]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
