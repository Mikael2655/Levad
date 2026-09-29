export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateSocialPosts } from '@/lib/claude-ai'
import { notifyPostReady } from '@/lib/email'

// Vercel Cron: "0 9 * * 2,4" (mardi + jeudi 9h UTC)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
    if (!config) return NextResponse.json({ skipped: 'no config' })

    // Choisit un sujet aléatoire parmi ceux configurés
    const topics = config.topics.split(',').map(t => t.trim()).filter(Boolean)
    const topic = topics[Math.floor(Math.random() * topics.length)]

    // Génère le contenu avec Claude AI
    const generated = await generateSocialPosts({
      topic,
      companyName: config.companyName,
      companyDesc: config.companyDesc,
      tone: config.tone,
      targetAudience: config.targetAudience,
    })

    // Sauvegarde en brouillon — PAS de publication automatique
    const post = await prisma.socialPost.create({
      data: {
        topic,
        contentLI: generated.linkedin,
        contentIG: generated.instagram,
        imagePrompt: generated.imagePrompt,
        status: 'draft',
      },
    })

    // Envoie la notification email pour validation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levad.fr'
    if (process.env.RESEND_API_KEY) {
      await notifyPostReady({
        postId: post.id,
        topic,
        contentLI: generated.linkedin,
        contentIG: generated.instagram,
        appUrl,
        toEmail: config.notifyEmail,
      })
    }

    return NextResponse.json({ success: true, postId: post.id, topic })
  } catch (err) {
    console.error('[cron/social]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
