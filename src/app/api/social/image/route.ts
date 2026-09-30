export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'Prompt manquant' }, { status: 400 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
    })

    const item = response.data?.[0]
    const imageUrl = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null)
    return NextResponse.json({ imageUrl })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    const detail = (e as Record<string, unknown>)?.status ?? (e as Record<string, unknown>)?.code ?? ''
    const keyPresent = !!process.env.OPENAI_API_KEY
    return NextResponse.json({ error: msg, detail, keyPresent }, { status: 500 })
  }
}
