export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { publishToLinkedIn } from '@/lib/linkedin'
import { publishToInstagram } from '@/lib/instagram'

// Vercel Cron: "*/15 * * * *" (toutes les 15 minutes)
// Publie les posts dont scheduledAt est passé et status === 'scheduled'
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
    if (!config) return NextResponse.json({ skipped: 'no config' })

    const now = new Date()
    const duePosts = await prisma.socialPost.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
    })

    if (duePosts.length === 0) return NextResponse.json({ published: 0 })

    const results = []
    for (const post of duePosts) {
      const errors: string[] = []
      let linkedinPostId: string | undefined
      let instagramPostId: string | undefined

      if (config.linkedinEnabled && post.contentLI) {
        const token = process.env.LINKEDIN_ACCESS_TOKEN
        if (!token) {
          errors.push('LINKEDIN_ACCESS_TOKEN manquant')
        } else {
          try {
            linkedinPostId = await publishToLinkedIn(post.contentLI, token)
          } catch (e) {
            errors.push(`LinkedIn: ${String(e)}`)
          }
        }
      }

      if (config.instagramEnabled && post.contentIG) {
        const token = process.env.INSTAGRAM_ACCESS_TOKEN
        const accountId = process.env.INSTAGRAM_ACCOUNT_ID
        if (!token || !accountId) {
          errors.push('Instagram non configuré')
        } else {
          try {
            instagramPostId = await publishToInstagram(post.contentIG, token, accountId)
          } catch (e) {
            errors.push(`Instagram: ${String(e)}`)
          }
        }
      }

      const published = !!(linkedinPostId || instagramPostId)
      await prisma.socialPost.update({
        where: { id: post.id },
        data: {
          status: published ? 'published' : errors.length > 0 ? 'failed' : 'published',
          publishedAt: published ? now : undefined,
          linkedinPostId: linkedinPostId ?? undefined,
          instagramPostId: instagramPostId ?? undefined,
          errorMessage: errors.length > 0 ? errors.join(' | ') : undefined,
        },
      })

      results.push({ id: post.id, topic: post.topic, published, errors })
    }

    return NextResponse.json({ published: results.filter(r => r.published).length, results })
  } catch (err) {
    console.error('[cron/publish]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
