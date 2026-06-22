import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateSocialPosts } from '@/lib/claude-ai'
import { publishToLinkedIn } from '@/lib/linkedin'
import { publishToInstagram } from '@/lib/instagram'

// Called by Vercel Cron — protected by CRON_SECRET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
    if (!config) return NextResponse.json({ skipped: 'no config' })

    const now = new Date()
    const dayName = now.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase()
    const currentHour = now.getHours()
    const scheduledDays = config.scheduleDays.split(',').map(d => d.trim().toLowerCase())

    if (!scheduledDays.includes(dayName) || currentHour !== config.scheduleHour) {
      return NextResponse.json({ skipped: `not a scheduled time (${dayName} ${currentHour}h, expected ${scheduledDays.join('/')} at ${config.scheduleHour}h)` })
    }

    // Pick a topic randomly from the configured list
    const topics = config.topics.split(',').map(t => t.trim()).filter(Boolean)
    const topic = topics[Math.floor(Math.random() * topics.length)]

    // Generate content
    const generated = await generateSocialPosts({
      topic,
      companyName: config.companyName,
      companyDesc: config.companyDesc,
      tone: config.tone,
      targetAudience: config.targetAudience,
    })

    const post = await prisma.socialPost.create({
      data: {
        topic,
        contentLI: generated.linkedin,
        contentIG: generated.instagram,
        imagePrompt: generated.imagePrompt,
        status: 'publishing',
        scheduledAt: now,
      },
    })

    const errors: string[] = []
    let linkedinPostId: string | undefined
    let instagramPostId: string | undefined

    if (config.linkedinEnabled && post.contentLI) {
      const token = process.env.LINKEDIN_ACCESS_TOKEN
      const urn = process.env.LINKEDIN_PERSON_URN
      if (token && urn) {
        try {
          linkedinPostId = await publishToLinkedIn(post.contentLI, token, urn)
        } catch (e) {
          errors.push(`LinkedIn: ${String(e)}`)
        }
      }
    }

    if (config.instagramEnabled && post.contentIG) {
      const token = process.env.INSTAGRAM_ACCESS_TOKEN
      const accountId = process.env.INSTAGRAM_ACCOUNT_ID
      if (token && accountId) {
        try {
          instagramPostId = await publishToInstagram(post.contentIG, token, accountId)
        } catch (e) {
          errors.push(`Instagram: ${String(e)}`)
        }
      }
    }

    const published = linkedinPostId || instagramPostId
    await prisma.socialPost.update({
      where: { id: post.id },
      data: {
        status: published ? 'published' : errors.length > 0 ? 'failed' : 'draft',
        publishedAt: published ? new Date() : undefined,
        linkedinPostId: linkedinPostId ?? undefined,
        instagramPostId: instagramPostId ?? undefined,
        errorMessage: errors.length > 0 ? errors.join(' | ') : undefined,
      },
    })

    return NextResponse.json({ success: true, postId: post.id, topic, linkedinPostId, instagramPostId, errors })
  } catch (err) {
    console.error('[cron/social]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
