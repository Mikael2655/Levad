import { prisma } from '@/lib/db'
import { AdminMatchForm } from '@/components/pronostics/admin/AdminMatchForm'
import { AdminMatchRow } from '@/components/pronostics/admin/AdminMatchRow'

export default async function AdminMatchesPage() {
  const matches = await prisma.match.findMany({ orderBy: { kickoff: 'asc' } })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Gestion des matchs</h1>

      <AdminMatchForm />

      <div className="space-y-3">
        {matches.length === 0 ? (
          <p className="text-pitch-400 text-sm">Aucun match créé pour le moment.</p>
        ) : (
          matches.map((match) => (
            <AdminMatchRow key={match.id} match={{ ...match, kickoff: match.kickoff.toISOString() }} />
          ))
        )}
      </div>
    </div>
  )
}
