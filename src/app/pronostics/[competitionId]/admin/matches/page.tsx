import Link from 'next/link'
import { prisma } from '@/lib/db'
import { AdminMatchForm } from '@/components/pronostics/admin/AdminMatchForm'
import { AdminMatchImport } from '@/components/pronostics/admin/AdminMatchImport'
import { AdminMatchRow } from '@/components/pronostics/admin/AdminMatchRow'

export default async function AdminMatchesPage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const [phases, matches] = await Promise.all([
    prisma.phase.findMany({ where: { competitionId }, orderBy: { order: 'asc' } }),
    prisma.match.findMany({
      where: { competitionId },
      orderBy: { kickoff: 'asc' },
      include: { phase: { select: { id: true, name: true, allowsExtraTime: true } } },
    }),
  ])

  if (phases.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-4">Gestion des matchs</h1>
        <p className="text-pitch-300">
          Crée d'abord une{' '}
          <Link href={`/pronostics/${competitionId}/admin/phases`} className="text-gold-400 hover:underline">
            phase
          </Link>{' '}
          (ex. "Poules", "1/8 de finale") avant d'ajouter des matchs.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Gestion des matchs</h1>

      <AdminMatchForm competitionId={competitionId} phases={phases} />
      <AdminMatchImport competitionId={competitionId} phases={phases} />

      <div className="space-y-3">
        {matches.length === 0 ? (
          <p className="text-pitch-400 text-sm">Aucun match créé pour le moment.</p>
        ) : (
          matches.map((match) => (
            <AdminMatchRow
              key={match.id}
              competitionId={competitionId}
              match={{ ...match, kickoff: match.kickoff.toISOString() }}
            />
          ))
        )}
      </div>
    </div>
  )
}
