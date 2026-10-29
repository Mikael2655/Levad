// Contrôles d'accès à placer en tête de chaque page et de chaque route de l'outil de financement.
import { NextResponse } from 'next/server'
import { notFound, redirect } from 'next/navigation'
import { utilisateurCourant, type Utilisateur } from './auth'
import { ErreurMetier } from './erreurs'
import type { Role } from './droits'

interface Options {
  roles?: Role[]
  autoriserChangementMdp?: boolean // seule la page / route de changement de mot de passe l'autorise
}

// Pages : redirige vers la connexion, ou vers le changement de mot de passe obligatoire.
export async function exigerUtilisateur(o: Options = {}): Promise<Utilisateur> {
  const u = await utilisateurCourant()
  if (!u) redirect('/financement/connexion')
  if (u.doitChangerMotDePasse && !o.autoriserChangementMdp) redirect('/financement/mot-de-passe')
  if (o.roles && !o.roles.includes(u.role)) notFound()
  return u
}

// Routes API : renvoie l'utilisateur, ou directement la réponse d'erreur à retourner.
export async function acteurApi(o: Options = {}): Promise<Utilisateur | NextResponse> {
  const u = await utilisateurCourant()
  if (!u) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  if (u.doitChangerMotDePasse && !o.autoriserChangementMdp) return NextResponse.json({ error: 'Changez d’abord votre mot de passe.' }, { status: 403 })
  if (o.roles && !o.roles.includes(u.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  return u
}

export async function repondre(fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn())
  } catch (e) {
    if (e instanceof ErreurMetier) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Erreur du serveur.' }, { status: 500 })
  }
}

export async function corps(req: Request): Promise<Record<string, any>> {
  const c = await req.json().catch(() => null)
  return c && typeof c === 'object' ? c : {}
}
