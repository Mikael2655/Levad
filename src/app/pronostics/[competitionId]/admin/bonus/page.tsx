import { prisma } from '@/lib/db'
import { AdminBonusForm } from '@/components/pronostics/admin/AdminBonusForm'
import { AdminBonusRow } from '@/components/pronostics/admin/AdminBonusRow'

export default async function AdminBonusPage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const questions = await prisma.bonusQuestion.findMany({ where: { competitionId }, orderBy: { createdAt: 'desc' } })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Questions bonus</h1>

      <AdminBonusForm competitionId={competitionId} />

      <div className="space-y-3">
        {questions.length === 0 ? (
          <p className="text-pitch-400 text-sm">Aucune question bonus créée pour le moment.</p>
        ) : (
          questions.map((q) => <AdminBonusRow key={q.id} competitionId={competitionId} question={q} />)
        )}
      </div>
    </div>
  )
}
