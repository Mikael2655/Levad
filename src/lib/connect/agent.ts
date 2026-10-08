import { randomInt } from 'crypto'
import { prisma } from '@/lib/db'

// Programme résident installé chez les clients : identification par le code de leur lien personnel.
// Le code est permanent (lié au client, pas au PC) ; le régénérer invalide l'ancien lien.

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // sans caractères ambigus (i, l, o, 0, 1)
export const MOTIF_CODE = /^[a-hj-km-np-z2-9]{16}$/

export function nouveauCode(): string {
  let c = ''
  for (let i = 0; i < 16; i++) c += ALPHABET[randomInt(ALPHABET.length)]
  return c
}

/** Le client dont le code est donné dans l'en-tête « Authorization: Bearer <code> », ou null. */
export async function clientParRequete(req: Request) {
  const m = (req.headers.get('authorization') ?? '').match(/^Bearer\s+([a-z0-9]{16})$/i)
  if (!m) return null
  return prisma.connectClient.findUnique({ where: { codeLien: m[1].toLowerCase() } })
}

/** Le code du client ; il est créé à la première demande. */
export async function assurerCode(clientId: number): Promise<string> {
  const c = await prisma.connectClient.findUnique({ where: { id: clientId }, select: { codeLien: true } })
  if (c?.codeLien) return c.codeLien
  return regenererCode(clientId)
}

export async function regenererCode(clientId: number): Promise<string> {
  for (let essai = 0; essai < 5; essai++) {
    const code = nouveauCode()
    try {
      await prisma.connectClient.update({ where: { id: clientId }, data: { codeLien: code } })
      return code
    } catch {
      // collision (quasi impossible) : on retente avec un autre code
    }
  }
  throw new Error('Impossible de créer un code de lien')
}

export function urlLien(code: string): string {
  return `${process.env.PARC_URL || 'https://connect.levad.fr'}/telecharger/${code}`
}

export type StatutConnexion = 'jamais' | 'connecte' | 'inactif' | 'deconnecte'

/** connecté : signal de moins de 10 minutes ; déconnecté : plus de signal depuis le délai réglé (10 jours par défaut). */
export function statutConnexion(derniere: Date | null, seuilJours: number): StatutConnexion {
  if (!derniere) return 'jamais'
  const ageMs = Date.now() - derniere.getTime()
  if (ageMs < 10 * 60 * 1000) return 'connecte'
  if (ageMs < seuilJours * 24 * 3600 * 1000) return 'inactif'
  return 'deconnecte'
}
