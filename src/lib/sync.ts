import { prisma } from '@/lib/db'
import { fetchCompetitionMatches, mapExternalStatus, getPhaseTemplate, type FootballDataMatch } from '@/lib/football-data'
import { recomputeMatchPredictions } from '@/lib/scoring'

const THROTTLE_MS = 8_000

export interface SyncResult {
  synced: boolean
  reason?: 'not-configured' | 'throttled'
  matchCount?: number
}

// Fusionne les phases en double (même nom dans une compétition) en une seule :
// réassigne leurs matchs à la phase gardée puis supprime les doublons. Corrige
// les doublons créés par d'anciennes synchronisations concurrentes.
async function dedupePhases(competitionId: number) {
  const phases = await prisma.phase.findMany({
    where: { competitionId },
    orderBy: { id: 'asc' },
  })

  const keepByName = new Map<number, number>() // idÀFusionner -> idGardé
  const seen = new Map<string, number>() // nom -> idGardé

  for (const phase of phases) {
    const kept = seen.get(phase.name)
    if (kept === undefined) {
      seen.set(phase.name, phase.id)
    } else {
      keepByName.set(phase.id, kept)
    }
  }

  for (const [dupId, keptId] of keepByName) {
    await prisma.match.updateMany({ where: { phaseId: dupId }, data: { phaseId: keptId } })
    await prisma.phase.delete({ where: { id: dupId } })
  }
}

export async function syncCompetition(competitionId: number, options?: { force?: boolean }): Promise<SyncResult> {
  const competition = await prisma.competition.findUnique({ where: { id: competitionId } })
  if (!competition?.externalCode) {
    return { synced: false, reason: 'not-configured' }
  }

  // Verrou atomique : une seule synchro peut « réclamer » la compétition dans
  // la fenêtre de throttle. updateMany est un UPDATE ... WHERE unique, donc deux
  // requêtes concurrentes ne peuvent pas la réclamer toutes les deux. On ne
  // touche qu'à lastSyncAttemptAt ici : lastSyncedAt (affiché à l'admin) n'est
  // mis à jour qu'en cas de succès, plus bas, pour ne pas laisser croire à une
  // synchro réussie quand l'appel à football-data.org a échoué.
  if (!options?.force) {
    const threshold = new Date(Date.now() - THROTTLE_MS)
    const claimed = await prisma.competition.updateMany({
      where: {
        id: competitionId,
        OR: [{ lastSyncAttemptAt: null }, { lastSyncAttemptAt: { lt: threshold } }],
      },
      data: { lastSyncAttemptAt: new Date() },
    })
    if (claimed.count === 0) {
      return { synced: false, reason: 'throttled' }
    }
  } else {
    await prisma.competition.update({ where: { id: competitionId }, data: { lastSyncAttemptAt: new Date() } })
  }

  try {
    await dedupePhases(competitionId)

    const externalMatches = await fetchCompetitionMatches(competition.externalCode)

    // Résout toutes les phases nécessaires une bonne fois pour toutes, en
    // séquentiel (il y en a très peu, une poignée par compétition), avant de
    // traiter les matchs en parallèle plus bas. Évite à la fois les requêtes
    // séquentielles inutiles (l'ancienne version faisait 2-3 aller-retours
    // DB par match, l'un après l'autre : sur une compétition avec beaucoup
    // de matchs, ça pouvait dépasser le délai d'attente du planificateur
    // externe) et les races de création de phase en double.
    const phaseIdByName = new Map<string, number>()
    const distinctStages = [...new Set(externalMatches.map((m) => m.stage))]
    for (const stage of distinctStages) {
      const template = getPhaseTemplate(stage)
      if (phaseIdByName.has(template.name)) continue
      const existing = await prisma.phase.findFirst({ where: { competitionId, name: template.name } })
      const phase =
        existing ??
        (await prisma.phase.create({
          data: {
            competitionId,
            name: template.name,
            order: template.order,
            allowsExtraTime: template.allowsExtraTime,
          },
        }))
      phaseIdByName.set(template.name, phase.id)
    }

    async function processMatch(externalMatch: FootballDataMatch) {
      const mappedStatus = mapExternalStatus(externalMatch.status)
      if (!mappedStatus) return // match annulé : on l'ignore

      const phaseId = phaseIdByName.get(getPhaseTemplate(externalMatch.stage).name)!

      const existingMatch = await prisma.match.findUnique({ where: { externalId: externalMatch.id } })
      const wasFinished = existingMatch?.status === 'FINISHED'

      const data = {
        competitionId,
        phaseId,
        // Équipe pas encore connue (ex. 1/4 avant la fin des 1/8) : nom
        // provisoire, remplacé automatiquement à une prochaine synchro.
        homeTeam: externalMatch.homeTeam?.name ?? 'À déterminer',
        awayTeam: externalMatch.awayTeam?.name ?? 'À déterminer',
        homeCrest: externalMatch.homeTeam?.crest ?? null,
        awayCrest: externalMatch.awayTeam?.crest ?? null,
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

    await Promise.all(externalMatches.map(processMatch))

    await prisma.competition.update({
      where: { id: competitionId },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    })

    return { synced: true, matchCount: externalMatches.length }
  } catch (err) {
    // La tentative est marquée en échec (lastSyncAttemptAt déjà posé plus haut
    // pour le throttle) mais lastSyncedAt n'avance pas : l'admin voit la vraie
    // date de la dernière synchro réussie, et le message d'erreur explique pourquoi.
    const message = err instanceof Error ? err.message : 'Erreur de synchronisation inconnue.'
    await prisma.competition.update({
      where: { id: competitionId },
      data: { lastSyncError: message.slice(0, 300) },
    })
    throw err
  }
}
