// Créneaux de publication : calcul pur (sans base de données), utilisé par le serveur et par l'aperçu de la page.
// Tout est exprimé en heure de Paris, heure d'été / d'hiver comprise.

export interface SlotConfig {
  days: number[] // 0 = dimanche, 1 = lundi … 6 = samedi
  hour: number
  minute: number
}

export const DEFAULT_SLOTS: SlotConfig = { days: [2, 4], hour: 18, minute: 0 } // mardi + jeudi 18h

export function normalizeSlots(input: unknown): SlotConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const days = Array.from(new Set((Array.isArray(raw.days) ? raw.days : []).map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b)
  const hour = Math.round(Number(raw.hour))
  const minute = Math.round(Number(raw.minute))
  return {
    days: days.length > 0 ? days : DEFAULT_SLOTS.days,
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : DEFAULT_SLOTS.hour,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : DEFAULT_SLOTS.minute,
  }
}

export function parisOffsetHours(at: Date): number {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
    .formatToParts(at).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+1'
  const m = part.match(/GMT([+-]\d+)/)
  return m ? parseInt(m[1], 10) : 1
}

export function parisToUtc(y: number, m0: number, d: number, hour: number, minute = 0): Date {
  const guess = new Date(Date.UTC(y, m0, d, hour, minute))
  return new Date(guess.getTime() - parisOffsetHours(guess) * 3600000)
}

function parisDateParts(at: Date): { y: number; m0: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(at)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value, 10)
  return { y: get('year'), m0: get('month') - 1, d: get('day') }
}

export function nextSlotAfter(after: Date, cfg: SlotConfig = DEFAULT_SLOTS): Date {
  const { y, m0, d } = parisDateParts(after)
  for (let i = 0; i < 15; i++) {
    const day = new Date(Date.UTC(y, m0, d + i))
    if (!cfg.days.includes(day.getUTCDay())) continue
    const candidate = parisToUtc(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), cfg.hour, cfg.minute)
    if (candidate.getTime() > after.getTime()) return candidate
  }
  throw new Error('Aucun créneau trouvé')
}

export function latestSlotAtOrBefore(now: Date, cfg: SlotConfig = DEFAULT_SLOTS): Date | null {
  let s = nextSlotAfter(new Date(now.getTime() - 8 * 86400000), cfg)
  let last: Date | null = null
  while (s.getTime() <= now.getTime()) {
    last = s
    s = nextSlotAfter(s, cfg)
  }
  return last
}

export function upcomingSlots(from: Date, count: number, cfg: SlotConfig = DEFAULT_SLOTS): Date[] {
  const out: Date[] = []
  let s = from
  for (let i = 0; i < count; i++) {
    s = nextSlotAfter(s, cfg)
    out.push(s)
  }
  return out
}
