import { prisma } from '@/lib/db'
import { fetchCompetitionMatches, mapExternalStatus, getPhaseTemplate } from '@/lib/football-data'
import { recomputeMatchPredictions } from '@/lib/scoring'

const THROTTLE_MS = 45_000

export interface SyncResult {
  synced: boolean
  reason?: 'not-configured' | 'throttled'
  matchCount?: number
}

export async function syncCompetition(competitionId: number, options?: { force?: boolean }): Promise<SyncResult> {
  const competition = await prisma.competition.findUnique({ where: { id: competitionId } })
  if (!competition?.externalCode) {
    return { synced: false, reason: 'not-configured' }
  }

  if (
    !options?.force &&
    competition.lastSyncedAt &&
    Date.now() - competition.lastSyncedAt.getTime() < THROTTLE_MS
  ) {
    return { synced: false, reason: 'throttled' }
  }

  const externalMatches = await fetchCompetitionMatches(competition.externalCode)
  const existingPhases = await prisma.phase.findMany({ where: { competitionId } })
  const phaseIdByStage = new Map<string, number>()

  for (const externalMatch of externalMatches) {
    const mappedStatus = mapExternalStatus(externalMatch.status)
    if (!mappedStatus) continue // match annulé : on l'ignore

    let phaseId = phaseIdByStage.get(externalMatch.stage)
    if (!phaseId) {
      const template = getPhaseTemplate(externalMatch.stage)
      let phase = existingPhases.find((p) => p.name === template.name)
      if (!phase) {
        phase = await prisma.phase.create({
          data: {
            competitionId,
            name: template.name,
            order: template.order,
            allowsExtraTime: template.allowsExtraTime,
          },
        })
        existingPhases.push(phase)
      }
      phaseId = phase.id
      phaseIdByStage.set(externalMatch.stage, phaseId)
    }

    const existingMatch = await prisma.match.findUnique({ where: { externalId: externalMatch.id } })
    const wasFinished = existingMatch?.status === 'FINISHED'

    const data = {
      competitionId,
      phaseId,
      // Équipe pas encore connue (ex. 1/4 avant la fin des 1/8) : nom
      // provisoire, remplacé automatiquement à une prochaine synchro.
      homeTeam: externalMatch.homeTeam?.name ?? 'À déterminer',
      awayTeam: externalMatch.awayTeam?.name ?? 'À déterminer',
      kickoff: new Date(externalMatch.utcDate),
      status: mappedStatus,
      homeScoreFullTime: externalMatch.score.fullTime.home,
      awayScoreFullTime: externalMatch.score.fullTime.away,
      homeScoreExtraTime: externalMatch.score.extraTime?.home ?? null,
      awayScoreExtraTime: externalMatch.score.extraTime?.away ?? null,
    }

    const saved = await prisma.match.upsert({
      where: { externalId: externalMatch.id },
      update: data,
      create: { ...data, externalId: externalMatch.id },
    })

    if (mappedStatus === 'FINISHED' && !wasFinished) {
      await recomputeMatchPredictions(saved.id)
    }
  }

  await prisma.competition.update({ where: { id: competitionId }, data: { lastSyncedAt: new Date() } })

  return { synced: true, matchCount: externalMatches.length }
}
