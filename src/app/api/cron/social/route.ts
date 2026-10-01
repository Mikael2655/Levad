export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notifyPostReady, notifyTokenExpiry } from '@/lib/email'
import { getTokenExpiry } from '@/lib/linkedin'
import { generateQueuedPost, QUEUE_STATUSES, queueTarget, rebuildSlots } from '@/lib/queue'

// Vercel Cron: "0 7 * * 1,3" (lundi + mercredi 7h UTC)
// Filet de sécurité : complète la file d'attente jusqu'à la taille cible (2 posts max par passage),
// et prévient si le jeton LinkedIn arrive à expiration.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
    if (!config) return NextResponse.json({ skipped: 'no config' })

    const linkedinToken = process.env.LINKEDIN_ACCESS_TOKEN
    if (linkedinToken && process.env.RESEND_API_KEY) {
      try {
        const expiry = await getTokenExpiry(linkedinToken)
        if (expiry) {
          const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000)
          if (daysLeft <= 10) {
            await notifyTokenExpiry({
              daysLeft,
              expiresAt: expiry.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }),
              toEmail: config.notifyEmail,
            })
          }
        }
      } catch (e) {
        console.error('[cron/social] token expiry check failed', e)
      }
    }

    await rebuildSlots()
    const count = await prisma.socialPost.count({ where: { status: { in: QUEUE_STATUSES } } })
    const toCreate = Math.min(Math.max(queueTarget() - count, 0), 2)

    const created: number[] = []
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://social.levad.fr'
    for (let i = 0; i < toCreate; i++) {
      const post = await generateQueuedPost()
      created.push(post.id)
      if (process.env.RESEND_API_KEY) {
        try {
          await notifyPostReady({
            postId: post.id,
            topic: post.topic,
            contentLI: post.contentLI ?? '',
            contentIG: post.contentIG ?? '',
            appUrl,
            toEmail: config.notifyEmail,
          })
        } catch (e) {
          console.error('[cron/social] notify failed', e)
        }
      }
    }

    return NextResponse.json({ success: true, queue: count, created })
  } catch (err) {
    console.error('[cron/social]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
