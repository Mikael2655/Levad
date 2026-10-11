export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

async function translateToEnglish(text: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 128,
    messages: [{ role: 'user', content: `Translate to English, return only the translation:\n\n${text}` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : text
}

export async function POST(req: NextRequest) {
  const { topic, page = 1 } = await req.json()
  if (!topic) return NextResponse.json({ error: 'Topic manquant' }, { status: 400 })

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return NextResponse.json({ error: 'UNSPLASH_ACCESS_KEY manquante' }, { status: 500 })

  // Map French topics to English Unsplash search terms
  const topicMap: Record<string, string> = {
    'téléphonie': 'office phone business meeting',
    'telephonie': 'office phone business meeting',
    'impression': 'office printer document business',
    'informatique': 'computer office IT professional',
    'ged': 'document management office archive',
    'productivité': 'productivity office work professional',
    'productivite': 'productivity office work professional',
  }
  const topicLower = topic.toLowerCase()
  const keywords = topicMap[topicLower] ?? await translateToEnglish(`${topic} office professional`)

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=6&page=${page}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${accessKey}` } }
  )

  if (!res.ok) return NextResponse.json({ error: `Unsplash ${res.status}` }, { status: 500 })

  const data = await res.json()
  const photos = data.results.map((p: { id: string; urls: { regular: string }; alt_description: string; user: { name: string }; links: { html: string } }) => ({
    id: p.id,
    url: p.urls.regular,
    alt: p.alt_description,
    author: p.user.name,
    link: p.links.html,
  }))

  return NextResponse.json({ photos, keywords, topic })
}
