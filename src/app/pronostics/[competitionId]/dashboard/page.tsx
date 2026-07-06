import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import { getLeaderboard } from '@/lib/scoring'
import { MatchPredictionCard } from '@/components/pronostics/MatchPredictionCard'
import { BonusQuestionCard } from '@/components/pronostics/BonusQuestionCard'

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

  const predictionByMatch = new Map(predictions.map((p) => [p.matchId, p]))
  const answerByQuestion = new Map(bonusAnswers.map((a) => [a.bonusQuestionId, a]))
  const myRank = leaderboard.find((row) => row.id === playerId)
  const top5 = leaderboard.slice(0, 5)

  const now = new Date()
  const upcoming = matches.filter((m) => m.status === 'SCHEDULED' && new Date(m.kickoff) > now)

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 text-center">
          <div className="text-xs text-pitch-400 uppercase tracking-wide">Ton total</div>
          <div className="text-3xl font-black text-gold-400">{myRank?.totalPoints ?? 0} pts</div>
        </div>
        <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 text-center">
          <div className="text-xs text-pitch-400 uppercase tracking-wide">Ton classement</div>
          <div className="text-3xl font-black">{myRank ? `#${myRank.rank}` : '—'}</div>
        </div>
        <Link
          href={`/pronostics/${competitionId}/classement`}
          className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 text-center hover:border-gold-500 transition flex flex-col justify-center"
        >
          <div className="text-sm font-semibold text-gold-400">Voir le classement complet →</div>
        </Link>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4">Matchs à pronostiquer</h2>
        {upcoming.length === 0 ? (
          <p className="text-pitch-400 text-sm">Aucun match à venir pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((match) => (
              <MatchPredictionCard
                key={match.id}
                competitionId={competitionId}
                match={{ ...match, kickoff: match.kickoff.toISOString() }}
                prediction={predictionByMatch.get(match.id)}
              />
            ))}
          </div>
        )}
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

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Top 5</h2>
          <Link href={`/pronostics/${competitionId}/resultats`} className="text-sm text-gold-400 hover:underline">
            Voir les résultats des matchs joués →
          </Link>
        </div>
        <div className="bg-pitch-900 border border-pitch-800 rounded-xl divide-y divide-pitch-800">
          {top5.map((row) => (
            <div key={row.id} className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="w-6 text-pitch-400 font-bold">#{row.rank}</span>
                <span className={row.id === playerId ? 'font-bold text-gold-400' : ''}>{row.name}</span>
              </span>
              <span className="font-semibold">{row.totalPoints} pts</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
