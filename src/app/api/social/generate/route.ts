import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateSocialPosts } from '@/lib/claude-ai'

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json()
    if (!topic) return NextResponse.json({ error: 'topic requis' }, { status: 400 })

    const config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
    if (!config) return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })

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
        status: 'draft',
      },
    })

    return NextResponse.json({ post })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
