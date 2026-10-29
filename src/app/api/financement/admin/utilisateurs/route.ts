import { NextResponse } from 'next/server'
import { creerUtilisateur, listerUtilisateurs } from '@/lib/financement/admin'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function GET() {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  return repondre(() => listerUtilisateurs())
}

// Réponse : l'utilisateur créé + son mot de passe provisoire (affiché une seule fois).
export async function POST(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() => creerUtilisateur({ email: String(c.email ?? ''), prenom: String(c.prenom ?? ''), nom: String(c.nom ?? ''), role: String(c.role ?? '') }))
}
