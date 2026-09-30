export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY manquante' })

  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const data = await res.json()

  const imageModels = (data.data ?? [])
    .map((m: { id: string }) => m.id)
    .filter((id: string) => id.includes('dall') || id.includes('image'))

  return NextResponse.json({ status: res.status, imageModels, keyPrefix: apiKey.substring(0, 10) })
}
