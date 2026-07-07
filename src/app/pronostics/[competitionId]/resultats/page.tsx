import { prisma } from '@/lib/db'
import { getEffectiveScore } from '@/lib/scoring'
import { LiveSyncPoller } from '@/components/pronostics/LiveSyncPoller'
import { TeamCrest } from '@/components/pronostics/TeamCrest'
import { Avatar } from '@/components/pronostics/Avatar'

export default async function ResultatsPage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const now = new Date()

  const matches = await prisma.match.findMany({
    where: {
      competitionId,
      OR: [{ status: { in: ['LIVE', 'FINISHED'] } }, { kickoff: { lte: now } }],
    },
    orderBy: { kickoff: 'desc' },
    include: {
      phase: { select: { name: true } },
      predictions: {
        include: { player: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { player: { name: 'asc' } },
      },
    },
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <LiveSyncPoller competitionId={competitionId} />
      <h1 className="text-2xl font-bold">Résultats</h1>
      <p className="text-sm text-pitch-400">
        Les pronostics de tous les joueurs apparaissent ici une fois le coup d'envoi donné.
      </p>

      {matches.length === 0 ? (
        <p className="text-pitch-400 text-sm">Aucun match n'a encore commencé.</p>
      ) : (
        <div className="space-y-6">
          {matches.map((match) => {
            const effective = getEffectiveScore(match)
            const isLive = match.status === 'LIVE'

            return (
              <div key={match.id} className="bg-pitch-900 border border-pitch-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-pitch-800">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs text-gold-500 font-semibold">{match.phase.name}</div>
                    {isLive && (
                      <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                        EN DIRECT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 justify-end text-right min-w-0">
                      <span className="font-semibold truncate">{match.homeTeam}</span>
                      <TeamCrest src={match.homeCrest} alt={match.homeTeam} size={28} />
                    </div>
                    <div className="text-2xl font-black shrink-0 tabular-nums">
                      {effective ? `${effective.homeScore} - ${effective.awayScore}` : 'vs'}
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <TeamCrest src={match.awayCrest} alt={match.awayTeam} size={28} />
                      <span className="font-semibold truncate">{match.awayTeam}</span>
                    </div>
                  </div>
                  <div className="text-xs text-pitch-400 text-center mt-2">
                    {new Date(match.kickoff).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>

                {match.predictions.length === 0 ? (
                  <p className="text-sm text-pitch-400 p-4">Personne n'a pronostiqué ce match.</p>
                ) : (
                  <div className="divide-y divide-pitch-800">
                    {match.predictions.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <Avatar name={p.player.name} avatarUrl={p.player.avatarUrl} size={24} />
                          {p.player.name}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-pitch-300 tabular-nums">
                            {p.homeScore} - {p.awayScore}
                          </span>
                          {match.status === 'FINISHED' && p.points !== null && (
                            <span className="font-bold text-gold-500">+{p.points} pts</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
