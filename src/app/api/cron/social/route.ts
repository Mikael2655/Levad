export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateSocialPosts, selectTopic } from '@/lib/claude-ai'
import { notifyPostReady, notifyTokenExpiry } from '@/lib/email'

// Vercel Cron: "0 7 * * 1,3" (lundi + mercredi 7h UTC)
// Génère un brouillon et propose une publication le lendemain (mardi/jeudi) à 18h heure de Paris
function parisOffsetHours(at: Date): number {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
    .formatToParts(at).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+1'
  const m = part.match(/GMT([+-]\d+)/)
  return m ? parseInt(m[1], 10) : 1
}

function tomorrowAtParisHour(hour: number): Date {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(tomorrow)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value, 10)
  const guess = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), hour))
  return new Date(guess.getTime() - parisOffsetHours(guess) * 60 * 60 * 1000)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
    if (!config) return NextResponse.json({ skipped: 'no config' })

    const tokenExpiresAt = process.env.LINKEDIN_TOKEN_EXPIRES_AT
    if (tokenExpiresAt && process.env.RESEND_API_KEY) {
      const daysLeft = Math.ceil((new Date(`${tokenExpiresAt}T23:59:59Z`).getTime() - Date.now()) / 86400000)
      if (!Number.isNaN(daysLeft) && daysLeft <= 10) {
        try {
          await notifyTokenExpiry({ daysLeft, expiresAt: tokenExpiresAt, toEmail: config.notifyEmail })
        } catch (e) {
          console.error('[cron/social] token expiry email failed', e)
        }
      }
    }

    // Récupère les sujets récents (14 derniers jours) pour éviter les répétitions
    const recentPosts = await prisma.socialPost.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      select: { topic: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    const recentTopics = recentPosts.map(p => p.topic)
    const configTopics = config.topics.split(',').map(t => t.trim()).filter(Boolean)

    // Claude choisit le sujet le plus pertinent
    const { topic, angle } = await selectTopic(recentTopics, configTopics)
    const fullTopic = angle ? `${topic} — ${angle}` : topic

    // Génère le contenu
    const generated = await generateSocialPosts({
      topic: fullTopic,
      companyName: config.companyName,
      companyDesc: config.companyDesc,
      tone: config.tone,
      targetAudience: config.targetAudience,
    })

    const scheduledAt = tomorrowAtParisHour(18)

    const post = await prisma.socialPost.create({
      data: {
        topic: fullTopic,
        contentLI: generated.linkedin,
        contentIG: generated.instagram,
        imagePrompt: generated.imagePrompt,
        status: 'draft',
        scheduledAt,
      },
    })

    // Notification email pour validation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://social.levad.fr'
    if (process.env.RESEND_API_KEY) {
      await notifyPostReady({
        postId: post.id,
        topic: fullTopic,
        contentLI: generated.linkedin,
        contentIG: generated.instagram,
        appUrl,
        toEmail: config.notifyEmail,
      })
    }

    return NextResponse.json({ success: true, postId: post.id, topic: fullTopic, scheduledAt })
  } catch (err) {
    console.error('[cron/social]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
