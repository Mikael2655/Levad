export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateSocialPosts, selectTopic } from '@/lib/claude-ai'
import { notifyPostReady } from '@/lib/email'

// Vercel Cron: "0 7 * * 2,4" (mardi + jeudi 7h UTC = 8h ou 9h Paris)
// Génère un post et planifie sa publication le même jour à 9h (heure de Paris)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
    if (!config) return NextResponse.json({ skipped: 'no config' })

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

    // Planifie la publication à 9h heure de Paris (UTC+1 hiver / UTC+2 été)
    // Le cron tourne à 7h UTC, on planifie 2h plus tard = 9h UTC = 10h-11h Paris
    const scheduledAt = new Date()
    scheduledAt.setUTCHours(9, 0, 0, 0)

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
