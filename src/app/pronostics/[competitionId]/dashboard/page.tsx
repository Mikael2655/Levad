import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import { getLeaderboard } from '@/lib/scoring'
import { PredictionsForm } from '@/components/pronostics/PredictionsForm'
import { BonusQuestionCard } from '@/components/pronostics/BonusQuestionCard'
import { LiveSyncPoller } from '@/components/pronostics/LiveSyncPoller'

export default async function DashboardPage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)
  const session = await getCompetitionSession(competitionId)
  const playerId = session!.playerId

  const [matches, predictions, bonusQuestions, bonusAnswers, leaderboard] = await Promise.all([
    prisma.match.findMany({
      where: { competitionId },
      orderBy: { kickoff: 'asc' },
      include: { phase: { select: { name: true } } },
    }),
    prisma.prediction.findMany({ where: { playerId } }),
    prisma.bonusQuestion.findMany({ where: { competitionId }, orderBy: { createdAt: 'desc' } }),
    prisma.bonusAnswer.findMany({ where: { playerId } }),
    getLeaderboard(competitionId),
  ])

  const answerByQuestion = new Map(bonusAnswers.map((a) => [a.bonusQuestionId, a]))
  const myRank = leaderboard.find((row) => row.id === playerId)

  const now = new Date()
  const upcoming = matches.filter((m) => m.status === 'SCHEDULED' && new Date(m.kickoff) > now)

  const upcomingForForm = upcoming.map((m) => ({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeCrest: m.homeCrest,
    awayCrest: m.awayCrest,
    kickoff: m.kickoff.toISOString(),
    phaseName: m.phase.name,
  }))
  const predictionsForForm = predictions.map((p) => ({
    matchId: p.matchId,
    homeScore: p.homeScore,
    awayScore: p.awayScore,
  }))

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      <LiveSyncPoller competitionId={competitionId} />

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 text-center">
          <div className="text-xs text-pitch-400 uppercase tracking-wide">Ton total</div>
          <div className="text-3xl font-black text-gold-500">{myRank?.totalPoints ?? 0} pts</div>
        </div>
        <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 text-center">
          <div className="text-xs text-pitch-400 uppercase tracking-wide">Ton classement</div>
          <div className="text-3xl font-black">{myRank ? `#${myRank.rank}` : '—'}</div>
        </div>
        <Link
          href={`/pronostics/${competitionId}/classement`}
          className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 text-center hover:border-gold-500 transition flex flex-col justify-center"
        >
          <div className="text-sm font-semibold text-gold-500">Voir le classement →</div>
        </Link>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4">Matchs à pronostiquer</h2>
        <PredictionsForm competitionId={competitionId} matches={upcomingForForm} predictions={predictionsForForm} />
      </section>

      {bonusQuestions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Questions bonus</h2>
          <div className="space-y-3">
            {bonusQuestions.map((q) => (
              <BonusQuestionCard
                key={q.id}
                competitionId={competitionId}
                question={{ ...q, deadline: q.deadline ? q.deadline.toISOString() : null }}
                answer={answerByQuestion.get(q.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
