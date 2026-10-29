import { NextResponse } from 'next/server'
import { ErreurMetier } from '@/lib/financement/erreurs'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { lireDate } from '@/lib/financement/import-contrats'
import { enregistrerRachat, listerRachats, simulerSolde } from '@/lib/financement/rachats'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  return repondre(() => listerRachats(u, Number(params.id)))
}

// enregistrer = false : simple simulation (rien n'est sauvegardé) ; true : la demande de solde est enregistrée.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(async () => {
    const dateResiliation = lireDate(String(c.dateResiliation ?? ''))
    if (!dateResiliation) throw new ErreurMetier('Indiquez la date de résiliation souhaitée.')
    const p = { type: String(c.type ?? ''), dateResiliation }
    return c.enregistrer === true ? enregistrerRachat(u, Number(params.id), { ...p, commentaire: typeof c.commentaire === 'string' ? c.commentaire : undefined }) : simulerSolde(u, Number(params.id), p)
  })
}
