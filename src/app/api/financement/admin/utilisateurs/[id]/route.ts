import { NextResponse } from 'next/server'
import { modifierUtilisateur } from '@/lib/financement/admin'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(() =>
    modifierUtilisateur(u.id, Number(params.id), {
      ...(typeof c.prenom === 'string' ? { prenom: c.prenom } : {}),
      ...(typeof c.nom === 'string' ? { nom: c.nom } : {}),
      ...(typeof c.role === 'string' ? { role: c.role } : {}),
      ...(typeof c.actif === 'boolean' ? { actif: c.actif } : {}),
    }),
  )
}
