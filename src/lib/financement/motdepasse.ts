import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'

export const hasher = (motDePasse: string) => bcrypt.hash(motDePasse, 10)
export const verifier = (motDePasse: string, hash: string) => bcrypt.compare(motDePasse, hash)

// Hash factice : sert à faire le même travail quand l'adresse n'existe pas (on ne révèle pas quelles adresses existent).
export const HASH_FACTICE = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.cG0o0Jwd1OZxOVqR2kJ0lFHcrDeq'

// Mot de passe provisoire lisible (sans caractères ambigus), à communiquer à l'utilisateur.
export function genererMotDePasseProvisoire(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join('')
}

export function motDePasseValide(motDePasse: string): string | null {
  if (motDePasse.length < 10) return 'Le mot de passe doit faire au moins 10 caractères.'
  return null
}
