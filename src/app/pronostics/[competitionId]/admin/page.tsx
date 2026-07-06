import Link from 'next/link'
import { prisma } from '@/lib/db'
import { MAX_PLAYERS_PER_COMPETITION } from '@/lib/competition'

export default async function AdminHomePage({ params }: { params: { competitionId: string } }) {
  const competitionId = Number(params.competitionId)

  const [competition, playerCount, matchCount, finishedCount, bonusCount, phaseCount] = await Promise.all([
    prisma.competition.findUniqueOrThrow({ where: { id: competitionId } }),
    prisma.player.count({ where: { competitionId } }),
    prisma.match.count({ where: { competitionId } }),
    prisma.match.count({ where: { competitionId, status: 'FINISHED' } }),
    prisma.bonusQuestion.count({ where: { competitionId } }),
    prisma.phase.count({ where: { competitionId } }),
  ])

  const base = `/pronostics/${competitionId}/admin`
  const cards = [
    { label: 'Joueurs inscrits', value: `${playerCount} / ${MAX_PLAYERS_PER_COMPETITION}`, href: `${base}/joueurs` },
    { label: 'Phases configurées', value: phaseCount, href: `${base}/phases` },
    { label: 'Matchs', value: `${finishedCount} / ${matchCount} terminés`, href: `${base}/matches` },
    { label: 'Questions bonus', value: bonusCount, href: `${base}/bonus` },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">Administration</h1>
      <p className="text-pitch-400 text-sm mb-6">{competition.name}</p>

      <div className="bg-pitch-900 border border-gold-500/40 rounded-xl p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs text-pitch-400 uppercase tracking-wide">Code d'accès à donner aux joueurs</div>
          <div className="text-2xl font-black tracking-widest text-gold-400">{competition.joinCode}</div>
        </div>
        <Link href={`${base}/joueurs`} className="text-sm text-gold-400 hover:underline">
          Gérer / régénérer →
        </Link>
      </div>

      {phaseCount === 0 && (
        <div className="bg-pitch-900 border border-pitch-800 rounded-xl p-4 mb-6 text-sm">
          Commence par <Link href={`${base}/phases`} className="text-gold-400 hover:underline">créer une phase</Link> (ex.
          "Poules", "1/8 de finale") avant d'ajouter des matchs.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-pitch-900 border border-pitch-800 rounded-xl p-6 hover:border-gold-500 transition"
          >
            <div className="text-sm text-pitch-400 uppercase tracking-wide mb-2">{card.label}</div>
            <div className="text-2xl font-black">{card.value}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
