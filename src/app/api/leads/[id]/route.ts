import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({ where: { id: Number(params.id) } })
  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
  return NextResponse.json(lead)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const lead = await prisma.lead.update({
    where: { id: Number(params.id) },
    data: body,
  })
  return NextResponse.json(lead)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.lead.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
