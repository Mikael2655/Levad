import { notFound } from 'next/navigation'
import { getCompetitionSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CompetitionNav } from '@/components/pronostics/CompetitionNav'

export default async function CompetitionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { competitionId: string }
}) {
  const competitionId = Number(params.competitionId)
  const competition = await prisma.competition.findUnique({ where: { id: competitionId } })
  if (!competition) notFound()

  const session = await getCompetitionSession(competitionId)
  const player = session
    ? await prisma.player.findUnique({
        where: { id: session.playerId },
        select: { id: true, name: true, role: true, avatarUrl: true },
      })
    : null

  return (
    <div className="min-h-screen bg-pitch-950 text-gray-900">
      <CompetitionNav competitionId={competitionId} competitionName={competition.name} player={player} />
      <main>{children}</main>
    </div>
  )
}
