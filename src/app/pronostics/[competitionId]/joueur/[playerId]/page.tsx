import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import {
  computeMatchPoints,
  getEffectiveScore,
  classifyMatchResult,
  parseCorrectAnswers,
  isBonusAnswerCorrect,
} from '@/lib/scoring'
import { Avatar } from '@/components/pronostics/Avatar'
import { TeamCrest } from '@/components/pronostics/TeamCrest'
import { LiveSyncPoller } from '@/components/pronostics/LiveSyncPoller'

export default async function PlayerDetailPage({
  params,
}: {
  params: { competitionId: string; playerId: string }
}) {
  const competitionId = Number(params.competitionId)
  const playerId = Number(params.playerId)
  await getCompetitionSession(competitionId) // protégé par le middleware

  const player = await prisma.player.findFirst({
    where: { id: playerId, competitionId },
    select: { id: true, name: true, avatarUrl: true },
  })
  if (!player) notFound()

  const now = new Date()

  // Pronostics sur des matchs déjà commencés (live ou terminés).
  const predictions = await prisma.prediction.findMany({
    where: {
      playerId,
      match: { competitionId, OR: [{ status: { in: ['LIVE', 'FINISHED'] } }, { kickoff: { lte: now } }] },
    },
    include: { match: { include: { phase: true } } },
    orderBy: { match: { kickoff: 'desc' } },
  })

  // Réponses bonus verrouillées (corrigées ou date limite dépassée).
  const bonusAnswers = await prisma.bonusAnswer.findMany({
    where: {
      playerId,
      bonusQuestion: {
        competitionId,
        OR: [{ correctAnswer: { not: null } }, { deadline: { lte: now } }],
      },
    },
    include: { bonusQuestion: true },
    orderBy: { bonusQuestion: { createdAt: 'desc' } },
  })

  // Calcule les points (définitifs si terminé, provisoires si live).
  const rows = predictions.map((p) => {
    const actual = getEffectiveScore(p.match)
    let points: number | null = null
    let provisional = false
    if (p.match.status === 'FINISHED') {
      points = p.points
    } else if (actual) {
      points = computeMatchPoints({ homeScore: p.homeScore, awayScore: p.awayScore }, actual, p.match.phase)
      provisional = true
    }
    return { p, actual, points, provisional, isLive: p.match.status === 'LIVE' }
  })

  const matchTotal = rows.reduce((s, r) => s + (r.p.match.status === 'FINISHED' ? r.p.points ?? 0 : 0), 0)
  const bonusTotal = bonusAnswers.reduce((s, a) => s + (a.points ?? 0), 0)

  // Statistiques sur les matchs terminés (départage et détail).
  const finishedRows = rows.filter((r) => r.p.match.status === 'FINISHED')
  const stats = { played: finishedRows.length, exact: 0, diff: 0, outcome: 0 }
  for (const r of finishedRows) {
    if (!r.actual) continue
    const cat = classifyMatchResult({ homeScore: r.p.homeScore, awayScore: r.p.awayScore }, r.actual)
    if (cat === 'exact') stats.exact++
    else if (cat === 'diff') stats.diff++
    else if (cat === 'outcome') stats.outcome++
  }
  const bonusWon = bonusAnswers.filter((a) => (a.points ?? 0) > 0).length

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <LiveSyncPoller competitionId={competitionId} />

      <div className="flex items-center gap-3">
        <Avatar name={player.name} avatarUrl={player.avatarUrl} size={48} />
        <div>
          <h1 className="text-2xl font-bold">{player.name}</h1>
          <p className="text-sm text-pitch-400">{matchTotal + bonusTotal} pts acquis</p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Pronos joués', value: stats.played },
          { label: 'Bons scores', value: stats.exact },
          { label: 'Bons écarts', value: stats.diff },
          { label: 'Bonnes tendances', value: stats.outcome },
          { label: 'Bonus gagnés', value: bonusWon },
          { label: 'Total', value: matchTotal + bonusTotal, highlight: true },
        ].map((tile) => (
          <div key={tile.label} className="bg-pitch-900 border border-pitch-800 rounded-xl p-3 text-center">
            <div className={`text-2xl font-black ${tile.highlight ? 'text-gold-500' : ''}`}>{tile.value}</div>
            <div className="text-[11px] text-pitch-400 leading-tight mt-1">{tile.label}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-bold mb-3">Pronostics des matchs</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-pitch-400">Aucun match commencé pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(({ p, actual, points, provisional, isLive }) => (
              <div key={p.id} className="bg-pitch-900 border border-pitch-800 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-gold-500 font-semibold">{p.match.phase.name}</span>
                  {isLive && (
                    <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                      EN DIRECT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex-1 flex items-center gap-1.5 justify-end text-right min-w-0">
                    <span className="truncate">{p.match.homeTeam}</span>
                    <TeamCrest src={p.match.homeCrest} alt={p.match.homeTeam} size={20} />
                  </div>
                  <div className="shrink-0 text-center">
                    <div className="font-black tabular-nums">
                      {actual ? `${actual.homeScore} - ${actual.awayScore}` : 'vs'}
                    </div>
                    <div className="text-xs text-pitch-400 tabular-nums">
                      prono {p.homeScore} - {p.awayScore}
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                    <TeamCrest src={p.match.awayCrest} alt={p.match.awayTeam} size={20} />
                    <span className="truncate">{p.match.awayTeam}</span>
                  </div>
                </div>
                {points !== null && (
                  <div className="text-right mt-1">
                    <span className="text-sm font-bold text-gold-500">
                      +{points} pts{provisional && <span className="text-pitch-400 font-normal"> (en cours)</span>}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {bonusAnswers.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Questions bonus</h2>
          <div className="space-y-2">
            {bonusAnswers.map((a) => {
              const correctAnswers = parseCorrectAnswers(a.bonusQuestion.correctAnswer)
              const graded = correctAnswers.length > 0
              const correct = graded && isBonusAnswerCorrect(a.answer, correctAnswers)
              return (
                <div key={a.id} className="bg-pitch-900 border border-pitch-800 rounded-xl p-3">
                  <div className="font-semibold text-sm">{a.bonusQuestion.question}</div>
                  <div className="text-sm text-pitch-300 mt-1 flex items-center justify-between gap-2">
                    <span>
                      Réponse : <span className={graded ? (correct ? 'text-gold-500 font-semibold' : '') : ''}>{a.answer}</span>
                    </span>
                    {a.points !== null && <span className="font-bold text-gold-500">+{a.points} pts</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
