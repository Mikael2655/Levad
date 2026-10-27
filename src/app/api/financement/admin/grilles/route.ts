import { NextResponse } from 'next/server'
import { creerGrillePropre, enregistrerGrille, lireGrille, supprimerGrillePropre, type CibleGrille } from '@/lib/financement/admin'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

function cible(src: URLSearchParams | Record<string, any>): CibleGrille {
  const lire = (k: string) => (src instanceof URLSearchParams ? src.get(k) : src[k])
  const utilisateur = lire('utilisateurId')
  return {
    financeurId: Number(lire('financeurId')),
    type: lire('type') === 'REELLE' ? 'REELLE' : 'COMMERCIALE',
    utilisateurId: utilisateur === null || utilisateur === undefined || utilisateur === '' ? null : Number(utilisateur),
  }
}

export async function GET(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  return repondre(() => lireGrille(cible(new URL(req.url).searchParams)))
}

// Remplace entièrement le barème (base + tableau) ; le crée s'il n'existe pas encore.
export async function PUT(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(async () => {
    await enregistrerGrille(cible(c), String(c.base ?? ''), c.matrice)
    return { ok: true }
  })
}

// Crée le barème propre d'un commercial (copie du barème commun).
export async function POST(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(async () => {
    await creerGrillePropre(Number(c.financeurId), Number(c.utilisateurId))
    return { ok: true }
  })
}

// Supprime le barème propre d'un commercial : il retombe sur le barème commun.
export async function DELETE(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(async () => {
    await supprimerGrillePropre(Number(c.financeurId), Number(c.utilisateurId))
    return { ok: true }
  })
}
