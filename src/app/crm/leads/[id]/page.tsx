import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { LeadDetail } from '@/components/LeadDetail'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({ where: { id: Number(params.id) } })
  if (!lead) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-800 text-white px-6 py-4 shadow">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-brand-800 font-black">L</span>
              </div>
              <span className="font-bold text-lg">Levad</span>
            </Link>
            <span className="text-blue-300">
              / <Link href="/crm" className="hover:text-white transition">CRM</Link> / {lead.firstName} {lead.lastName}
            </span>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <LeadDetail lead={JSON.parse(JSON.stringify(lead))} />
      </main>
    </div>
  )
}
