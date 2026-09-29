import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const product = searchParams.get('product')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (product) where.product = product
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
    ]
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(leads)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { firstName, lastName, email, phone, company, jobTitle, product, message } = body

  if (!firstName || !lastName || !email || !product) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const lead = await prisma.lead.create({
    data: { firstName, lastName, email, phone, company, jobTitle, product, message },
  })
  return NextResponse.json(lead, { status: 201 })
}
