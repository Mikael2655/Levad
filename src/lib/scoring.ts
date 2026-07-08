import { prisma } from '@/lib/db'

interface ScoreLike {
  homeScore: number
  awayScore: number
}

interface PhaseRule {
  pointsExactScore: number
  pointsGoalDifference: number
  pointsCorrectOutcome: number
}

export function computeMatchPoints(pred: ScoreLike, actual: ScoreLike, rule: PhaseRule) {
  if (pred.homeScore === actual.homeScore && pred.awayScore === actual.awayScore) {
    return rule.pointsExactScore
  }

  const predDiff = pred.homeScore - pred.awayScore
  const actualDiff = actual.homeScore - actual.awayScore

  // Un nul (diff 0) mal deviné (mauvais score exact) retombe ici, jamais
  // dans la case "bonne tendance" : diff prédite === diff réelle === 0.
  if (predDiff === actualDiff) {
    return rule.pointsGoalDifference
  }

  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
  if (sign(predDiff) === sign(actualDiff)) {
    return rule.pointsCorrectOutcome
  }

  return 0
}

export type ResultCategory = 'exact' | 'diff' | 'outcome' | 'none'

/** Classe un pronostic par rapport au score réel (indépendamment du barème). */
export function classifyMatchResult(pred: ScoreLike, actual: ScoreLike): ResultCategory {
  if (pred.homeScore === actual.homeScore && pred.awayScore === actual.awayScore) return 'exact'
  const predDiff = pred.homeScore - pred.awayScore
  const actualDiff = actual.homeScore - actual.awayScore
  if (predDiff === actualDiff) return 'diff'
  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
  if (sign(predDiff) === sign(actualDiff)) return 'outcome'
  return 'none'
}

interface MatchWithScores {
  homeScoreFullTime: number | null
  awayScoreFullTime: number | null
  homeScoreExtraTime: number | null
  awayScoreExtraTime: number | null
}

/** Score retenu pour le calcul des points : prolongation si elle a été jouée, sinon 90 min. */
export function getEffectiveScore(match: MatchWithScores): ScoreLike | null {
  if (match.homeScoreExtraTime !== null && match.awayScoreExtraTime !== null) {
    return { homeScore: match.homeScoreExtraTime, awayScore: match.awayScoreExtraTime }
  }
  if (match.homeScoreFullTime !== null && match.awayScoreFullTime !== null) {
    return { homeScore: match.homeScoreFullTime, awayScore: match.awayScoreFullTime }
  }
  return null
}

export async function recomputeMatchPredictions(matchId: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { phase: true } })
  if (!match || match.status !== 'FINISHED') return

  const actual = getEffectiveScore(match)
  if (!actual) return

  const predictions = await prisma.prediction.findMany({ where: { matchId } })

  await Promise.all(
    predictions.map((pred) => {
      const points = computeMatchPoints({ homeScore: pred.homeScore, awayScore: pred.awayScore }, actual, match.phase)
      return prisma.prediction.update({ where: { id: pred.id }, data: { points } })
    })
  )
}

/** À appeler quand le barème d'une phase change : recalcule tous ses matchs déjà terminés. */
export async function recomputePhaseMatches(phaseId: number) {
  const finishedMatches = await prisma.match.findMany({ where: { phaseId, status: 'FINISHED' } })
  for (const match of finishedMatches) {
    await recomputeMatchPredictions(match.id)
  }
}

const normalizeAnswer = (s: string) => s.trim().toLowerCase()

/**
 * Les bonnes réponses d'une question bonus sont stockées en JSON (tableau)
 * pour permettre plusieurs réponses acceptées. On tolère aussi l'ancien format
 * "chaîne simple" pour compatibilité.
 */
export function parseCorrectAnswers(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    // pas du JSON : ancienne valeur simple
  }
  return [raw]
}

/** La réponse d'un joueur est bonne si elle correspond à l'une des bonnes réponses. */
export function isBonusAnswerCorrect(answer: string, correctAnswers: string[]): boolean {
  const norm = normalizeAnswer(answer)
  return correctAnswers.some((c) => normalizeAnswer(c) === norm)
}

export async function recomputeBonusAnswers(bonusQuestionId: number) {
  const question = await prisma.bonusQuestion.findUnique({ where: { id: bonusQuestionId } })
  if (!question) return
  const correctAnswers = parseCorrectAnswers(question.correctAnswer)
  if (correctAnswers.length === 0) return

  const answers = await prisma.bonusAnswer.findMany({ where: { bonusQuestionId } })

  await Promise.all(
    answers.map((answer) => {
      const points = isBonusAnswerCorrect(answer.answer, correctAnswers) ? question.points : 0
      return prisma.bonusAnswer.update({ where: { id: answer.id }, data: { points } })
    })
  )
}

export interface LeaderboardRow {
  id: number
  name: string
  avatarUrl: string | null
  matchPoints: number
  bonusPoints: number
  totalPoints: number
  goodResults: number // nombre de pronostics gagnants (score/écart/tendance), départage
  rank: number
}

export async function getLeaderboard(competitionId: number, playerIds?: number[]): Promise<LeaderboardRow[]> {
  const players = await prisma.player.findMany({
    where: { competitionId, ...(playerIds ? { id: { in: playerIds } } : {}) },
    include: {
      // Seuls les matchs commencés comptent : les pronostics des matchs à
      // venir n'ont pas encore de points (null), inutile de les charger.
      predictions: {
        where: { match: { status: { in: ['LIVE', 'FINISHED'] } } },
        select: {
          points: true,
          homeScore: true,
          awayScore: true,
          match: {
            select: {
              status: true,
              homeScoreFullTime: true,
              awayScoreFullTime: true,
              homeScoreExtraTime: true,
              awayScoreExtraTime: true,
              phase: { select: { pointsExactScore: true, pointsGoalDifference: true, pointsCorrectOutcome: true } },
            },
          },
        },
      },
      bonusAnswers: { select: { points: true } },
    },
  })

  const ranked = players
    .map((player) => {
      let matchPoints = 0
      let goodResults = 0

      for (const pred of player.predictions) {
        let points: number | null = null
        if (pred.match.status === 'FINISHED') {
          points = pred.points
        } else {
          // Match en direct : points provisoires calculés en temps réel à
          // partir du score actuel, comme sur la page détail d'un joueur.
          const actual = getEffectiveScore(pred.match)
          if (actual) {
            points = computeMatchPoints({ homeScore: pred.homeScore, awayScore: pred.awayScore }, actual, pred.match.phase)
          }
        }
        matchPoints += points ?? 0
        if ((points ?? 0) > 0) goodResults++
      }

      const bonusPoints = player.bonusAnswers.reduce((sum, a) => sum + (a.points ?? 0), 0)
      return {
        id: player.id,
        name: player.name,
        avatarUrl: player.avatarUrl,
        matchPoints,
        bonusPoints,
        totalPoints: matchPoints + bonusPoints,
        goodResults,
      }
    })
    // À égalité de points totaux, le meilleur nombre de bons résultats devance.
    .sort((a, b) => b.totalPoints - a.totalPoints || b.goodResults - a.goodResults)

  return ranked.map((row, index) => ({ ...row, rank: index + 1 }))
}
