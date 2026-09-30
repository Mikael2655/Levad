export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'Prompt manquant' }, { status: 400 })

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return NextResponse.json({ error: 'UNSPLASH_ACCESS_KEY manquante' }, { status: 500 })

  // Extract meaningful keywords — skip common filler words
  const stopwords = new Set([
    'photo','realistic','taken','showing','their','using','with','from','that','this',
    'they','have','been','were','will','would','could','should','small','large','french',
    'simple','modern','typical','natural','slightly','genuine','relatable','staged','style',
    'feeling','looking','working','sitting','standing','holding','background','environment',
    'atmosphere','elements','setting','scene','image','picture','photography','documentary',
    'imperfect','polished','overly','muted','tones','decor','space','open','american','lighting',
    'soft','focused','calm','expression','casual','dressed','functional','cluttered','coming',
    'through','while','which','about','after','before','between','during','without','within',
    'around','against','along','across','behind','below','above','under','over',
  ])

  const keywords = prompt
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter((w: string) => w.length > 3 && !stopwords.has(w))
    .slice(0, 5)
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
