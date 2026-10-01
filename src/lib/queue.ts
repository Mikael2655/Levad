import { prisma } from '@/lib/db'
import { generateSocialPosts, selectTopic } from '@/lib/claude-ai'

export const SLOT_HOUR_PARIS = 18
const SLOT_WEEKDAYS = [2, 4] // mardi, jeudi
export const QUEUE_STATUSES = ['draft', 'scheduled'] // draft = à valider, scheduled = validé

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

function parisToUtc(y: number, m0: number, d: number, hour: number): Date {
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
export async function rebuildSlots(): Promise<void> {
  const queue = await prisma.socialPost.findMany({
    where: { status: { in: QUEUE_STATUSES } },
    select: { id: true, status: true, scheduledAt: true },
  })
  let slot = nextSlotAfter(new Date())
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

export async function generateQueuedPost() {
  let config = await prisma.socialConfig.findFirst({ where: { id: 1 } })
  if (!config) config = await prisma.socialConfig.create({ data: { id: 1 } })

  const recent = await prisma.socialPost.findMany({
    where: {
      OR: [
        { status: { in: QUEUE_STATUSES } },
        { createdAt: { gte: new Date(Date.now() - 60 * 86400000) } },
      ],
    },
    select: { topic: true },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })
  const recentTopics = recent.map(p => p.topic.split(' — ')[0])
  const configTopics = config.topics.split(',').map(t => t.trim()).filter(Boolean)

  const { topic, angle } = await selectTopic(recentTopics, configTopics)
  const fullTopic = angle ? `${topic} — ${angle}` : topic

  const generated = await generateSocialPosts({
    topic: fullTopic,
    companyName: config.companyName,
    companyDesc: config.companyDesc,
    tone: config.tone,
    targetAudience: config.targetAudience,
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
