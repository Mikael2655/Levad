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

/** Lien privé de l'espace client (consultation du parc) : code distinct de celui du programme résident. */
export async function assurerCodeEspace(clientId: number): Promise<string> {
  const c = await prisma.connectClient.findUnique({ where: { id: clientId }, select: { codeEspace: true } })
  if (c?.codeEspace) return c.codeEspace
  return regenererCodeEspace(clientId)
}

export async function regenererCodeEspace(clientId: number): Promise<string> {
  for (let essai = 0; essai < 5; essai++) {
    const code = nouveauCode()
    try {
      await prisma.connectClient.update({ where: { id: clientId }, data: { codeEspace: code } })
      return code
    } catch {
      // collision (quasi impossible) : on retente
    }
  }
  throw new Error("Impossible de créer le lien de l'espace client")
}

export function urlEspace(code: string): string {
  return `${process.env.PARC_URL || 'https://connect.levad.fr'}/espace/${code}`
}

export function urlLien(code: string): string {
  return `${process.env.PARC_URL || 'https://connect.levad.fr'}/telecharger/${code}`
}

/** Liens de téléchargement direct du programme pour ce client (le nom du fichier contient son code). */
export function urlsTelechargement(code: string): { windows: string; mac: string; linux: string; page: string; aideWindows: string; aideMac: string } {
  const base = process.env.PARC_URL || 'https://connect.levad.fr'
  return { windows: `${base}/telecharger/${code}/windows`, mac: `${base}/telecharger/${code}/mac`, linux: `${base}/telecharger/${code}/linux`, page: `${base}/telecharger/${code}#avertissements`, aideWindows: `${base}/telecharger/${code}?os=windows#avertissements`, aideMac: `${base}/telecharger/${code}?os=mac#avertissements` }
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

/**
 * La dernière erreur du programme est-elle encore d'actualité ? Elle est considérée comme résolue dès qu'un signal de vie
 * (erreur de réseau) ou une lecture réussie (erreur de lecture, de mise à jour) est arrivé après elle.
 */
export function erreurEnCours(p: { derniereErreur: string | null; derniereErreurLe: Date | null; derniereConnexion: Date | null; derniereLectureOk: Date | null }): boolean {
  if (!p.derniereErreur || !p.derniereErreurLe) return false
  const quand = p.derniereErreurLe.getTime()
  const erreurDeReseau = !/^(lecture|mise à jour)/i.test(p.derniereErreur)
  const resolue = erreurDeReseau
    ? Boolean(p.derniereConnexion && p.derniereConnexion.getTime() > quand + 30_000)
    : Boolean(p.derniereLectureOk && p.derniereLectureOk.getTime() > quand)
  return !resolue
}

const MOTIF_IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

/** Les adresses IP valides d'un texte (une par ligne, ou séparées par des virgules / espaces), sans doublon. */
export function listeIps(texte: string | null | undefined): string[] {
  const vues = new Set<string>()
  for (const x of (texte ?? '').split(/[\s,;]+/)) {
    const ip = x.trim()
    if (MOTIF_IPV4.test(ip)) vues.add(ip.split('.').map(Number).join('.'))
  }
  return Array.from(vues).slice(0, 50)
}
