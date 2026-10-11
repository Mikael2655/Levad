import { prisma } from '@/lib/db'
import { generateSocialPosts, NEWS_THEMES, selectTopic, type SelectedTopic } from '@/lib/claude-ai'

export const SLOT_HOUR_PARIS = 18
const SLOT_WEEKDAYS = [2, 4] // mardi, jeudi
export const QUEUE_STATUSES = ['draft', 'scheduled'] // draft = à valider, scheduled = validé
const HOLD_STATUS = 'hold' // ligne technique : « ne rien publier avant scheduledAt »
const CURSOR_STATUS = 'themecursor' // ligne technique : ordre des thèmes (contentLI = JSON)

export function queueTarget(): number {
  const n = parseInt(process.env.QUEUE_TARGET ?? '10', 10)
  return Number.isFinite(n) && n > 0 ? n : 10
}

function parisOffsetHours(at: Date): number {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
    .formatToParts(at).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+1'
  const m = part.match(/GMT([+-]\d+)/)
  return m ? parseInt(m[1], 10) : 1
}

export function parisToUtc(y: number, m0: number, d: number, hour: number): Date {
  const guess = new Date(Date.UTC(y, m0, d, hour))
  return new Date(guess.getTime() - parisOffsetHours(guess) * 3600000)
}

function parisDateParts(at: Date): { y: number; m0: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(at)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value, 10)
  return { y: get('year'), m0: get('month') - 1, d: get('day') }
}

export function nextSlotAfter(after: Date): Date {
  const { y, m0, d } = parisDateParts(after)
  for (let i = 0; i < 15; i++) {
    const day = new Date(Date.UTC(y, m0, d + i))
    if (!SLOT_WEEKDAYS.includes(day.getUTCDay())) continue
    const candidate = parisToUtc(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), SLOT_HOUR_PARIS)
    if (candidate.getTime() > after.getTime()) return candidate
  }
  throw new Error('Aucun créneau trouvé')
}

export function latestSlotAtOrBefore(now: Date): Date | null {
  let s = nextSlotAfter(new Date(now.getTime() - 8 * 86400000))
  let last: Date | null = null
  while (s.getTime() <= now.getTime()) {
    last = s
    s = nextSlotAfter(s)
  }
  return last
}

type QueueRow = { id: number; status: string; scheduledAt: Date | null }

export function sortQueue<T extends QueueRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const va = a.status === 'scheduled' ? 0 : 1
    const vb = b.status === 'scheduled' ? 0 : 1
    if (va !== vb) return va - vb
    const ta = a.scheduledAt ? a.scheduledAt.getTime() : Infinity
    const tb = b.scheduledAt ? b.scheduledAt.getTime() : Infinity
    return ta - tb || a.id - b.id
  })
}

// Réattribue un créneau (mardi/jeudi 18h Paris) à chaque post de la file, dans l'ordre :
// d'abord les posts validés, puis ceux à valider.
// includePast = true : renvoie aussi un décalage dont l'heure est passée (le cron en a besoin
// pour ne pas publier le créneau sauté). Les décalages vieux de plus d'un jour sont supprimés.
export async function getHold(includePast = false): Promise<Date | null> {
  const row = await prisma.socialPost.findFirst({ where: { status: HOLD_STATUS } })
  if (!row?.scheduledAt) return null
  const age = Date.now() - row.scheduledAt.getTime()
  if (age > 86400000) {
    await prisma.socialPost.deleteMany({ where: { status: HOLD_STATUS } })
    return null
  }
  if (age >= 0 && !includePast) return null
  return row.scheduledAt
}

async function setHold(until: Date | null): Promise<void> {
  await prisma.socialPost.deleteMany({ where: { status: HOLD_STATUS } })
  if (until) {
    await prisma.socialPost.create({ data: { topic: '__hold__', status: HOLD_STATUS, scheduledAt: until } })
  }
}

export async function rebuildSlots(): Promise<void> {
  const hold = await getHold()
  const queue = await prisma.socialPost.findMany({
    where: { status: { in: QUEUE_STATUSES } },
    select: { id: true, status: true, scheduledAt: true },
  })
  const now = new Date()
  let slot = nextSlotAfter(hold && hold.getTime() > now.getTime() ? hold : now)
  const ops = []
  for (const p of sortQueue(queue)) {
    if (!p.scheduledAt || p.scheduledAt.getTime() !== slot.getTime()) {
      ops.push(prisma.socialPost.update({ where: { id: p.id }, data: { scheduledAt: slot } }))
    }
    slot = nextSlotAfter(slot)
  }
  if (ops.length > 0) await prisma.$transaction(ops)
}

export async function movePost(id: number, direction: 'up' | 'down'): Promise<boolean> {
  await rebuildSlots()
  const queue = sortQueue(await prisma.socialPost.findMany({
    where: { status: { in: QUEUE_STATUSES } },
    select: { id: true, status: true, scheduledAt: true },
  }))
  const i = queue.findIndex(p => p.id === id)
  const j = direction === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= queue.length || queue[i].status !== queue[j].status) return false
  await prisma.$transaction([
    prisma.socialPost.update({ where: { id: queue[i].id }, data: { scheduledAt: queue[j].scheduledAt } }),
    prisma.socialPost.update({ where: { id: queue[j].id }, data: { scheduledAt: queue[i].scheduledAt } }),
  ])
  await rebuildSlots()
  return true
}

async function loadConfig() {
  let config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
  if (!config) config = await prisma.socialConfig.create({ data: { id: 1 } })
  return config
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Thème suivant : l'ordre est tiré au sort une fois par cycle, puis suivi dans l'ordre.
// Tous les thèmes passent une fois avant qu'un thème ne revienne. L'état est gardé dans une ligne technique.
async function nextTheme(configTopics: string[]): Promise<string> {
  const pool = Array.from(new Set([...configTopics, ...NEWS_THEMES]))
  const row = await prisma.socialPost.findFirst({ where: { status: CURSOR_STATUS } })
  let state: { bag: string[]; known: string[] } = { bag: [], known: [] }
  try {
    if (row?.contentLI) state = JSON.parse(row.contentLI)
  } catch { /* état illisible : on repart d'un nouveau cycle */ }

  const added = pool.filter(t => !state.known.includes(t))
  let bag = state.bag.filter(t => pool.includes(t))
  if (added.length > 0) bag = shuffle([...bag, ...added])
  if (bag.length === 0) bag = shuffle(pool)

  const theme = bag.shift() as string
  const data = { contentLI: JSON.stringify({ bag, known: pool }) }
  if (row) {
    await prisma.socialPost.update({ where: { id: row.id }, data })
  } else {
    await prisma.socialPost.create({ data: { topic: '__themes__', status: CURSOR_STATUS, ...data } })
  }
  return theme
}

// Étape 1 : choisir le sujet (avec recherche web), sans rien écrire en base.
export async function pickTopic(): Promise<SelectedTopic> {
  const config = await loadConfig()
  const recent = await prisma.socialPost.findMany({
    where: {
      status: { notIn: [HOLD_STATUS, CURSOR_STATUS] },
      OR: [
        { status: { in: QUEUE_STATUSES } },
        { createdAt: { gte: new Date(Date.now() - 60 * 86400000) } },
      ],
    },
    select: { topic: true },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })
  const recentTopics = recent.map(p => p.topic.slice(0, 120))
  const configTopics = config.topics.split(',').map(t => t.trim()).filter(Boolean)
  return selectTopic(recentTopics, await nextTheme(configTopics))
}

// Étape 2 : rédiger le post pour ce sujet et l'ajouter à la file.
export async function writeQueuedPost(picked: SelectedTopic) {
  const config = await loadConfig()
  const fullTopic = picked.angle ? `${picked.topic} — ${picked.angle}` : picked.topic

  const generated = await generateSocialPosts({
    topic: fullTopic,
    companyName: config.companyName,
    companyDesc: config.companyDesc,
    tone: config.tone,
    targetAudience: config.targetAudience,
    context: picked.facts,
  })

  const post = await prisma.socialPost.create({
    data: {
      topic: fullTopic,
      contentLI: generated.linkedin,
      contentIG: generated.instagram,
      imagePrompt: generated.imagePrompt,
      status: 'draft',
    },
  })
  await rebuildSlots()
  return post
}

export async function generateQueuedPost() {
  return writeQueuedPost(await pickTopic())
}

// Décale toute la file d'un créneau : le prochain créneau n'est pas utilisé.
export async function shiftOneSlot(): Promise<void> {
  await rebuildSlots()
  const hold = await getHold()
  const now = new Date()
  const head = nextSlotAfter(hold && hold.getTime() > now.getTime() ? hold : now)
  await setHold(head)
  await rebuildSlots()
}

// Ne rien publier avant le jour indiqué (AAAA-MM-JJ, heure de Paris) ; null pour annuler le décalage.
export async function holdUntilDay(day: string | null): Promise<void> {
  if (!day) {
    await setHold(null)
  } else {
    const m = day.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) throw new Error('Date invalide')
    await setHold(new Date(parisToUtc(+m[1], +m[2] - 1, +m[3], 0).getTime() - 1))
  }
  await rebuildSlots()
}
