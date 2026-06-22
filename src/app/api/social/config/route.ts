import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  let config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
  if (!config) {
    config = await prisma.socialConfig.create({ data: { id: 1 } })
  }
  return NextResponse.json({ config })
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const config = await prisma.socialConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    })
    return NextResponse.json({ config })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
