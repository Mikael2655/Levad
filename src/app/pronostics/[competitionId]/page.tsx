import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getCompetitionSession } from '@/lib/auth'
import { MAX_PLAYERS_PER_COMPETITION } from '@/lib/competition'

export default async function CompetitionHomePage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)

  const [competition, playerCount, phases, session] = await Promise.all([
    prisma.competition.findUniqueOrThrow({ where: { id: competitionId } }),
    prisma.player.count({ where: { competitionId } }),
    prisma.phase.findMany({ where: { competitionId }, orderBy: { order: 'asc' } }),
    getCompetitionSession(competitionId),
  ])

  return (
    <div className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
      <p className="inline-block bg-pitch-800 text-pitch-100 text-xs font-semibold tracking-wide uppercase px-3 py-1 rounded-full mb-6">
        {playerCount} / {MAX_PLAYERS_PER_COMPETITION} joueurs inscrits
      </p>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">{competition.name}</h1>
      <p className="text-pitch-200 text-lg max-w-2xl mx-auto mb-8">
        Pronostique les scores, réponds aux questions bonus et grimpe au classement.
      </p>
      <div className="flex items-center justify-center gap-3">
        {session ? (
          <Link
            href={`/pronostics/${competitionId}/dashboard`}
            className="bg-gold-500 hover:bg-gold-400 text-white font-bold px-6 py-3 rounded-xl transition"
          >
            Voir mes pronostics
          </Link>
        ) : (
          <>
            <Link
              href={`/pronostics/${competitionId}/register`}
              className="bg-gold-500 hover:bg-gold-400 text-white font-bold px-6 py-3 rounded-xl transition"
            >
              Je rejoins avec mon code
            </Link>
            <Link
              href={`/pronostics/${competitionId}/login`}
              className="bg-pitch-800 hover:bg-pitch-700 text-gray-900 font-semibold px-6 py-3 rounded-xl transition"
            >
              Connexion
            </Link>
          </>
        )}
      </div>

      {competition.rulesText && (
        <div className="mt-16 max-w-2xl mx-auto text-left">
          <h2 className="text-2xl font-bold mb-4 text-center">Règlement du tournoi</h2>
          <div className="bg-pitch-900 border border-pitch-800 rounded-2xl p-6 whitespace-pre-wrap text-pitch-200 leading-relaxed">
            {competition.rulesText}
          </div>
        </div>
      )}

      {phases.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8">Barème de points par phase</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {phases.map((phase) => (
              <div key={phase.id} className="bg-pitch-900 border border-pitch-800 rounded-2xl p-6 text-left">
                <div className="font-bold text-gold-500 mb-3">{phase.name}</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-pitch-400">Score exact</div>
                    <div className="font-bold text-lg">{phase.pointsExactScore}</div>
                  </div>
                  <div>
                    <div className="text-pitch-400">Écart de buts</div>
                    <div className="font-bold text-lg">{phase.pointsGoalDifference}</div>
                  </div>
                  <div>
                    <div className="text-pitch-400">Tendance</div>
                    <div className="font-bold text-lg">{phase.pointsCorrectOutcome}</div>
                  </div>
                </div>
                {phase.allowsExtraTime && (
                  <div className="text-xs text-pitch-400 mt-3">Score retenu après prolongation si nécessaire</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
