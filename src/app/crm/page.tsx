import { prisma } from '@/lib/db'
import { LeadProduct, LeadStatus, PRODUCT_LABELS, STATUS_LABELS } from '@/lib/types'
import { StatusBadge } from '@/components/StatusBadge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CRMPage({
  searchParams,
}: {
  searchParams: { status?: string; product?: string; search?: string }
}) {
  const where: Record<string, unknown> = {}
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.product) where.product = searchParams.product
  if (searchParams.search) {
    where.OR = [
      { firstName: { contains: searchParams.search } },
      { lastName: { contains: searchParams.search } },
      { email: { contains: searchParams.search } },
      { company: { contains: searchParams.search } },
    ]
  }

  const [leads, allLeads] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } }),
    prisma.lead.findMany(),
  ])

  const stats = {
    total: allLeads.length,
    nouveau: allLeads.filter(l => l.status === 'nouveau').length,
    qualifie: allLeads.filter(l => l.status === 'qualifie').length,
    gagne: allLeads.filter(l => l.status === 'gagne').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-800 text-white px-6 py-4 shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-brand-800 font-black">L</span>
              </div>
              <span className="font-bold text-lg">Levad</span>
            </Link>
            <span className="text-blue-300">/ CRM Leads</span>
          </div>
          <Link href="/" className="text-sm text-blue-200 hover:text-white transition">
            ← Retour au site
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total leads', value: stats.total, color: 'bg-white border-gray-200' },
            { label: 'Nouveaux', value: stats.nouveau, color: 'bg-blue-50 border-blue-200' },
            { label: 'Qualifiés', value: stats.qualifie, color: 'bg-yellow-50 border-yellow-200' },
            { label: 'Gagnés', value: stats.gagne, color: 'bg-green-50 border-green-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-5 ${s.color}`}>
              <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
          <form className="flex flex-wrap gap-3 flex-1">
            <input
              name="search"
              defaultValue={searchParams.search}
              placeholder="Rechercher (nom, email, société...)"
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
            <select name="status" defaultValue={searchParams.status ?? ''}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600">
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select name="product" defaultValue={searchParams.product ?? ''}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600">
              <option value="">Tous les produits</option>
              {Object.entries(PRODUCT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button type="submit" className="bg-brand-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition">
              Filtrer
            </button>
            <Link href="/crm" className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 transition">
              Réinitialiser
            </Link>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{leads.length} lead{leads.length > 1 ? 's' : ''}</h2>
          </div>
          {leads.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-lg font-medium">Aucun lead trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Nom', 'Société', 'Email', 'Téléphone', 'Produit', 'Statut', 'Date', ''].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{lead.company ?? '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{lead.email}</td>
                      <td className="px-6 py-4 text-gray-600">{lead.phone ?? '—'}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {PRODUCT_LABELS[lead.product as LeadProduct]}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={lead.status as LeadStatus} />
                      </td>
                      <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/crm/leads/${lead.id}`}
                          className="text-brand-800 hover:underline font-medium text-xs">
                          Voir →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
