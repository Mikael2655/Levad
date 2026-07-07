import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import { MAX_PLAYERS_PER_COMPETITION } from '@/lib/competition'
import { AdminJoinCodeCard } from '@/components/pronostics/admin/AdminJoinCodeCard'
import { AdminPlayerRow } from '@/components/pronostics/admin/AdminPlayerRow'

export default async function AdminPlayersPage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const [competition, players, session] = await Promise.all([
    prisma.competition.findUniqueOrThrow({ where: { id: competitionId } }),
    prisma.player.findMany({
      where: { competitionId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    }),
    getCompetitionSession(competitionId),
  ])

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Joueurs</h1>
        <span className="text-sm text-pitch-400">
          {players.length} / {MAX_PLAYERS_PER_COMPETITION}
        </span>
      </div>

      <AdminJoinCodeCard competitionId={competitionId} joinCode={competition.joinCode} />

      <div className="bg-pitch-900 border border-pitch-800 rounded-xl divide-y divide-pitch-800">
        {players.map((player) => (
          <AdminPlayerRow
            key={player.id}
            competitionId={competitionId}
            player={player}
            isSelf={player.id === session?.playerId}
          />
        ))}
      </div>
    </div>
  )
}
