import { prisma } from '@/lib/db'

export const MAX_PLAYERS = 300

export async function getScoringRule() {
  const existing = await prisma.scoringRule.findFirst()
  if (existing) return existing
  return prisma.scoringRule.create({ data: {} })
}

export function computeMatchPoints(
  pred: { homeScore: number; awayScore: number },
  actual: { homeScore: number; awayScore: number },
  rule: { pointsExactScore: number; pointsGoalDifference: number; pointsCorrectOutcome: number }
) {
  if (pred.homeScore === actual.homeScore && pred.awayScore === actual.awayScore) {
    return rule.pointsExactScore
  }

  const predDiff = pred.homeScore - pred.awayScore
  const actualDiff = actual.homeScore - actual.awayScore

  if (predDiff === actualDiff) {
    return rule.pointsGoalDifference
  }

  const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)
  if (sign(predDiff) === sign(actualDiff)) {
    return rule.pointsCorrectOutcome
  }

  return 0
}

export async function recomputeMatchPredictions(matchId: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match || match.homeScore === null || match.awayScore === null) return

  const rule = await getScoringRule()
  const predictions = await prisma.prediction.findMany({ where: { matchId } })

  await Promise.all(
    predictions.map((pred) => {
      const points = computeMatchPoints(
        { homeScore: pred.homeScore, awayScore: pred.awayScore },
        { homeScore: match.homeScore!, awayScore: match.awayScore! },
        rule
      )
      return prisma.prediction.update({ where: { id: pred.id }, data: { points } })
    })
  )
}

export async function recomputeAllFinishedMatches() {
  const finishedMatches = await prisma.match.findMany({ where: { status: 'FINISHED' } })
  for (const match of finishedMatches) {
    await recomputeMatchPredictions(match.id)
  }
}

export async function recomputeBonusAnswers(bonusQuestionId: number) {
  const question = await prisma.bonusQuestion.findUnique({ where: { id: bonusQuestionId } })
  if (!question || !question.correctAnswer) return

  const answers = await prisma.bonusAnswer.findMany({ where: { bonusQuestionId } })
  const normalize = (s: string) => s.trim().toLowerCase()
  const correct = normalize(question.correctAnswer)

  await Promise.all(
    answers.map((answer) => {
      const points = normalize(answer.answer) === correct ? question.points : 0
      return prisma.bonusAnswer.update({ where: { id: answer.id }, data: { points } })
    })
  )
}

export async function getLeaderboard() {
  const players = await prisma.player.findMany({
    include: {
      predictions: { select: { points: true } },
      bonusAnswers: { select: { points: true } },
    },
  })

  const ranked = players
    .map((player) => {
      const matchPoints = player.predictions.reduce((sum, p) => sum + (p.points ?? 0), 0)
      const bonusPoints = player.bonusAnswers.reduce((sum, a) => sum + (a.points ?? 0), 0)
      return {
        id: player.id,
        name: player.name,
        matchPoints,
        bonusPoints,
        totalPoints: matchPoints + bonusPoints,
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)

  return ranked.map((row, index) => ({ ...row, rank: index + 1 }))
}
