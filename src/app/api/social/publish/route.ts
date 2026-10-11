export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { publishEverywhere } from '@/lib/publish'
import { generateQueuedPost, rebuildSlots } from '@/lib/queue'

export async function POST(req: NextRequest) {
  try {
    const { postId, imageUrl } = await req.json()
    if (!postId) return NextResponse.json({ error: 'postId requis' }, { status: 400 })

    const [post, config] = await Promise.all([
      prisma.socialPost.findUnique({ where: { id: postId } }),
      prisma.socialConfig.findFirst({ where: { id: 1 } }),
    ])

    if (!post) return NextResponse.json({ error: 'Post introuvable' }, { status: 404 })
    if (!config) return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })

    const { published, linkedinPostId, instagramPostId, errors } =
      await publishEverywhere(post, config, imageUrl ?? post.imageUrl)

    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: published ? 'published' : errors.length > 0 ? 'failed' : undefined,
        publishedAt: published ? new Date() : undefined,
        linkedinPostId: linkedinPostId ?? undefined,
        instagramPostId: instagramPostId ?? undefined,
        errorMessage: errors.length > 0 ? errors.join(' | ') : undefined,
      },
    })

    if (published) {
      try {
        await generateQueuedPost()
      } catch (e) {
        console.error('[publish] refill failed', e)
        await rebuildSlots()
      }
    } else {
      await rebuildSlots()
    }

    return NextResponse.json({ success: published, linkedinPostId, instagramPostId, errors })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
