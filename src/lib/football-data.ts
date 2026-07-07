const BASE_URL = 'https://api.football-data.org/v4'

interface FootballDataTeam {
  // null tant que l'équipe n'est pas déterminée (ex. 1/4 de finale avant la
  // fin des 1/8), et l'objet entier peut manquer sur certains matchs.
  name: string | null
  crest?: string | null // URL du logo/drapeau de l'équipe
}

interface FootballDataScore {
  fullTime: { home: number | null; away: number | null }
  extraTime?: { home: number | null; away: number | null }
}

export interface FootballDataMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  homeTeam?: FootballDataTeam | null
  awayTeam?: FootballDataTeam | null
  score: FootballDataScore
}

interface FootballDataMatchesResponse {
  matches: FootballDataMatch[]
}

export class FootballDataError extends Error {}

async function footballDataFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    throw new FootballDataError("Aucune clé d'API football-data.org configurée (FOOTBALL_DATA_API_KEY).")
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  })

  if (res.status === 429) {
    throw new FootballDataError("Quota de l'API football-data.org atteint, réessaie dans une minute.")
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new FootballDataError(`football-data.org a répondu ${res.status} : ${body.slice(0, 200)}`)
  }

  return res.json()
}

export async function fetchCompetitionMatches(code: string): Promise<FootballDataMatch[]> {
  const data = await footballDataFetch<FootballDataMatchesResponse>(`/competitions/${code}/matches`)
  return data.matches
}

const SCHEDULED_STATUSES = new Set(['SCHEDULED', 'TIMED', 'POSTPONED', 'SUSPENDED'])
const LIVE_STATUSES = new Set(['IN_PLAY', 'PAUSED'])
const FINISHED_STATUSES = new Set(['FINISHED'])

/** Retourne null si le match doit être ignoré (annulé). */
export function mapExternalStatus(status: string): 'SCHEDULED' | 'LIVE' | 'FINISHED' | null {
  if (SCHEDULED_STATUSES.has(status)) return 'SCHEDULED'
  if (LIVE_STATUSES.has(status)) return 'LIVE'
  if (FINISHED_STATUSES.has(status)) return 'FINISHED'
  return null // CANCELLED ou statut inconnu
}

interface PhaseTemplate {
  name: string
  order: number
  allowsExtraTime: boolean
}

const STAGE_TEMPLATES: Record<string, PhaseTemplate> = {
  GROUP_STAGE: { name: 'Poules', order: 1, allowsExtraTime: false },
  LEAGUE_STAGE: { name: 'Phase de ligue', order: 1, allowsExtraTime: false },
  LAST_32: { name: '1/16 de finale', order: 2, allowsExtraTime: true },
  LAST_16: { name: '1/8 de finale', order: 3, allowsExtraTime: true },
  QUARTER_FINALS: { name: '1/4 de finale', order: 4, allowsExtraTime: true },
  SEMI_FINALS: { name: '1/2 finale', order: 5, allowsExtraTime: true },
  THIRD_PLACE: { name: 'Match pour la 3e place', order: 6, allowsExtraTime: false },
  FINAL: { name: 'Finale', order: 7, allowsExtraTime: true },
}

export function getPhaseTemplate(stage: string): PhaseTemplate {
  return (
    STAGE_TEMPLATES[stage] ?? {
      name: stage
        .toLowerCase()
        .split('_')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' '),
      order: 99,
      allowsExtraTime: false,
    }
  )
}
