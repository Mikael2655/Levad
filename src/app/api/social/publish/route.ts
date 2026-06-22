import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { publishToLinkedIn } from '@/lib/linkedin'
import { publishToInstagram } from '@/lib/instagram'

export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json()
    if (!postId) return NextResponse.json({ error: 'postId requis' }, { status: 400 })

    const post = await prisma.socialPost.findUnique({ where: { id: postId } })
    if (!post) return NextResponse.json({ error: 'Post introuvable' }, { status: 404 })

    const config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
    if (!config) return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })

    let linkedinPostId: string | undefined
    let instagramPostId: string | undefined
    const errors: string[] = []

    if (config.linkedinEnabled && post.contentLI) {
      const token = process.env.LINKEDIN_ACCESS_TOKEN
      const urn = process.env.LINKEDIN_PERSON_URN
      if (!token || !urn) {
        errors.push('LinkedIn: variables LINKEDIN_ACCESS_TOKEN / LINKEDIN_PERSON_URN manquantes')
      } else {
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
      if (!token || !accountId) {
        errors.push('Instagram: variables INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_ACCOUNT_ID manquantes')
      } else {
        try {
          instagramPostId = await publishToInstagram(post.contentIG, token, accountId, post.imageUrl ?? undefined)
        } catch (e) {
          errors.push(`Instagram: ${String(e)}`)
        }
      }
    }

    const published = linkedinPostId || instagramPostId
    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: published ? 'published' : 'failed',
        publishedAt: published ? new Date() : undefined,
        linkedinPostId: linkedinPostId ?? undefined,
        instagramPostId: instagramPostId ?? undefined,
        errorMessage: errors.length > 0 ? errors.join(' | ') : undefined,
      },
    })

    return NextResponse.json({ success: published, linkedinPostId, instagramPostId, errors })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
