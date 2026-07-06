export interface MatchCandidate {
  homeTeam: string
  awayTeam: string
  kickoff: string | null // ISO string, ou null si la date/heure n'a pas pu être déterminée
  raw?: string
}

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
}

/** Nettoie grossièrement le wikitexte (liens, gras, templates) pour en tirer du texte lisible. */
function cleanWikitext(value: string): string {
  return value
    .replace(/\{\{[^{}]*\|([^{}|]+)\}\}/g, '$1')
    .replace(/\{\{([^{}|]+)\}\}/g, '$1')
    .replace(/\[\[([^\]|]*\|)?([^\]]+)\]\]/g, '$2')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function extractField(block: string, field: string): string | null {
  const match = block.match(new RegExp(`\\|\\s*${field}\\s*=\\s*([^\\n|]+)`, 'i'))
  return match ? cleanWikitext(match[1]) : null
}

function parseDateTime(dateRaw: string | null, timeRaw: string | null): string | null {
  if (!dateRaw) return null

  let year: number | null = null
  let month: number | null = null
  let day: number | null = null

  const iso = dateRaw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2]) - 1
    day = Number(iso[3])
  } else {
    const long = dateRaw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
    if (long) {
      const monthName = long[2].toLowerCase()
      if (monthName in MONTHS) {
        day = Number(long[1])
        month = MONTHS[monthName]
        year = Number(long[3])
      }
    }
  }

  if (year === null || month === null || day === null) return null

  let hour = 12
  let minute = 0
  const time = timeRaw?.match(/(\d{1,2}):(\d{2})/)
  if (time) {
    hour = Number(time[1])
    minute = Number(time[2])
  }

  const date = new Date(Date.UTC(year, month, day, hour, minute))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/** Extrait les matchs depuis les blocs {{footballbox}} d'une page Wikipédia (best-effort). */
export function parseFootballboxes(wikitext: string): MatchCandidate[] {
  const blocks = wikitext.match(/\{\{\s*[Ff]ootballbox[\s\S]*?\n\}\}/g) ?? []
  const candidates: MatchCandidate[] = []

  for (const block of blocks) {
    const team1 = extractField(block, 'team1')
    const team2 = extractField(block, 'team2')
    if (!team1 || !team2) continue

    const date = extractField(block, 'date')
    const time = extractField(block, 'time')

    candidates.push({
      homeTeam: team1,
      awayTeam: team2,
      kickoff: parseDateTime(date, time),
      raw: block.slice(0, 200),
    })
  }

  return candidates
}

export async function fetchWikipediaFixtures(pageTitle: string): Promise<MatchCandidate[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
    pageTitle
  )}&prop=wikitext&format=json&formatversion=2`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'PronosFootApp/1.0 (usage interne pour concours de pronostics entre amis)' },
  })

  if (!res.ok) {
    throw new Error(`Wikipédia a répondu avec une erreur (${res.status}).`)
  }

  const data = await res.json()
  if (data.error) {
    throw new Error(data.error.info || 'Page introuvable sur Wikipédia.')
  }

  const wikitext: string = data.parse?.wikitext
  if (!wikitext) {
    throw new Error('Impossible de lire le contenu de cette page Wikipédia.')
  }

  return parseFootballboxes(wikitext)
}

/**
 * Parse une liste collée par l'admin, une ligne par match :
 * "Équipe A;Équipe B;2026-06-12 20:00"
 */
export function parsePastedList(text: string): MatchCandidate[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(';').map((p) => p.trim())
      const [homeTeam, awayTeam, dateTimeRaw] = parts

      let kickoff: string | null = null
      if (dateTimeRaw) {
        const date = new Date(dateTimeRaw.replace(' ', 'T'))
        if (!Number.isNaN(date.getTime())) kickoff = date.toISOString()
      }

      return { homeTeam: homeTeam ?? '', awayTeam: awayTeam ?? '', kickoff, raw: line }
    })
    .filter((c) => c.homeTeam && c.awayTeam)
}
