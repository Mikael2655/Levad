// Utilisateur connecté, côté serveur (pages et routes). Relit toujours l'utilisateur en base.
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import type { Role } from './droits'
import { SESSION_FIN_COOKIE, verifierJeton } from './session'

export interface Utilisateur {
  id: number
  email: string
  prenom: string
  nom: string
  role: Role
  doitChangerMotDePasse: boolean
}

export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const jeton = cookies().get(SESSION_FIN_COOKIE)?.value
  const session = jeton ? await verifierJeton(jeton) : null
  if (!session) return null
  const u = await prisma.finUtilisateur.findUnique({ where: { id: session.utilisateurId } })
  if (!u || !u.actif) return null
  // Une session ouverte avant le dernier changement / réinitialisation de mot de passe n'est plus valable.
  if (session.debut < u.motDePasseChangeLe.getTime()) return null
  return { id: u.id, email: u.email, prenom: u.prenom, nom: u.nom, role: u.role as Role, doitChangerMotDePasse: u.doitChangerMotDePasse }
}
