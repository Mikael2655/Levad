import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getScoringRule, MAX_PLAYERS } from '@/lib/scoring'
import { getSession } from '@/lib/auth'

export default async function PronosticsHomePage() {
  const [playerCount, rule, session] = await Promise.all([
    prisma.player.count(),
    getScoringRule(),
    getSession(),
  ])

  return (
    <div>
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <p className="inline-block bg-pitch-800 text-pitch-100 text-xs font-semibold tracking-wide uppercase px-3 py-1 rounded-full mb-6">
          {playerCount} / {MAX_PLAYERS} joueurs inscrits
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
          Le concours de pronostics entre <span className="text-gold-400">amis</span>
        </h1>
        <p className="text-pitch-200 text-lg max-w-2xl mx-auto mb-8">
          Pronostique les scores, réponds aux questions bonus et grimpe au classement.
          Jusqu'à {MAX_PLAYERS} joueurs, une seule compétition.
        </p>
        <div className="flex items-center justify-center gap-3">
          {session ? (
            <Link
              href="/pronostics/dashboard"
              className="bg-gold-500 hover:bg-gold-400 text-pitch-950 font-bold px-6 py-3 rounded-xl transition"
            >
              Voir mes pronostics
            </Link>
          ) : (
            <>
              <Link
                href="/pronostics/register"
                className="bg-gold-500 hover:bg-gold-400 text-pitch-950 font-bold px-6 py-3 rounded-xl transition"
              >
                Je m'inscris
              </Link>
              <Link
                href="/pronostics/login"
                className="bg-pitch-800 hover:bg-pitch-700 text-white font-semibold px-6 py-3 rounded-xl transition"
              >
                Connexion
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Barème de points</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <RuleCard emoji="🎯" title="Score exact" points={rule.pointsExactScore} />
          <RuleCard emoji="📊" title="Bon écart de buts" points={rule.pointsGoalDifference} />
          <RuleCard emoji="✅" title="Bonne tendance" points={rule.pointsCorrectOutcome} />
        </div>
        <p className="text-center text-pitch-300 text-sm mt-6">
          + des points bonus pour les questions spéciales créées par l'administrateur.
        </p>
      </section>
    </div>
  )
}

function RuleCard({ emoji, title, points }: { emoji: string; title: string; points: number }) {
  return (
    <div className="bg-pitch-900 border border-pitch-800 rounded-2xl p-6 text-center">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="font-semibold text-pitch-100">{title}</div>
      <div className="text-3xl font-black text-gold-400 mt-2">{points} pts</div>
    </div>
  )
}
