import { prisma } from '@/lib/db'
import { AdminPhaseForm } from '@/components/pronostics/admin/AdminPhaseForm'
import { AdminPhaseRow } from '@/components/pronostics/admin/AdminPhaseRow'

export default async function AdminPhasesPage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const phases = await prisma.phase.findMany({ where: { competitionId }, orderBy: { order: 'asc' } })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Phases & barème de points</h1>
      <p className="text-sm text-pitch-400">
        Chaque phase a son propre barème et sa propre règle de prolongation (score retenu à 90 ou 120 minutes).
      </p>

      <AdminPhaseForm competitionId={competitionId} />

      <div className="space-y-3">
        {phases.length === 0 ? (
          <p className="text-pitch-400 text-sm">Aucune phase créée pour le moment.</p>
        ) : (
          phases.map((phase) => <AdminPhaseRow key={phase.id} competitionId={competitionId} phase={phase} />)
        )}
      </div>
    </div>
  )
}
