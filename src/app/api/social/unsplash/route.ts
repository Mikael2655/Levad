export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'Prompt manquant' }, { status: 400 })

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return NextResponse.json({ error: 'UNSPLASH_ACCESS_KEY manquante' }, { status: 500 })

  // Extract first meaningful keywords from the prompt
  const keywords = prompt
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter((w: string) => w.length > 3)
    .slice(0, 4)
    .join(' ')

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=6&orientation=landscape`,
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

  return NextResponse.json({ photos, keywords })
}
