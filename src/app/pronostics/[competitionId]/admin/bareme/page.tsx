import { prisma } from '@/lib/db'
import { AdminPhaseRow } from '@/components/pronostics/admin/AdminPhaseRow'
import { AdminSyncCard } from '@/components/pronostics/admin/AdminSyncCard'
import { AdminRulesForm } from '@/components/pronostics/admin/AdminRulesForm'

export default async function AdminBaremePage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const [competition, phases] = await Promise.all([
    prisma.competition.findUniqueOrThrow({ where: { id: competitionId } }),
    prisma.phase.findMany({ where: { competitionId }, orderBy: { order: 'asc' } }),
  ])

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Barème de points</h1>
        <p className="text-sm text-pitch-400">
          Chaque phase a son propre barème et sa propre règle de prolongation (score retenu à 90 ou 120 minutes). Les
          phases sont créées automatiquement lors de la synchronisation.
        </p>
        <div className="space-y-3">
          {phases.length === 0 ? (
            <p className="text-pitch-400 text-sm">
              Aucune phase pour le moment. Configure la synchronisation ci-dessous pour importer le calendrier.
            </p>
          ) : (
            phases.map((phase) => <AdminPhaseRow key={phase.id} competitionId={competitionId} phase={phase} />)
          )}
        </div>
      </div>

      <AdminSyncCard
        competitionId={competitionId}
        externalCode={competition.externalCode}
        lastSyncedAt={competition.lastSyncedAt ? competition.lastSyncedAt.toISOString() : null}
      />

      <AdminRulesForm competitionId={competitionId} rulesText={competition.rulesText} />
    </div>
  )
}
