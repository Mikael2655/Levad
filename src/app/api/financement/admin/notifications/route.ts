import { NextResponse } from 'next/server'
import { ErreurMetier } from '@/lib/financement/erreurs'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { ecrireParametre, PARAM_DOSSIER_COMPLET, PARAM_SIGNATAIRE_LEVAD } from '@/lib/financement/notifications'
import { prisma } from '@/lib/db'

// Choix de l'administrateur ou de l'assistante qui reçoit « LEVAD doit signer » et « dossier complet ».
async function identifiant(v: unknown): Promise<string | null> {
  if (v === null || v === '' || v === undefined) return null
  const u = await prisma.finUtilisateur.findUnique({ where: { id: Number(v) } })
  if (!u || !u.actif || (u.role !== 'ADMIN' && u.role !== 'ASSISTANTE')) throw new ErreurMetier('Choisissez un administrateur ou une assistante actifs.')
  return String(u.id)
}

export async function PATCH(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(async () => {
    const signataire = await identifiant(c.signataireLevadId)
    const complet = await identifiant(c.dossierCompletId)
    await ecrireParametre(PARAM_SIGNATAIRE_LEVAD, signataire)
    await ecrireParametre(PARAM_DOSSIER_COMPLET, complet)
    return { ok: true }
  })
}
