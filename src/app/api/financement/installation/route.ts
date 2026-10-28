import { installer } from '@/lib/financement/installation'
import { corps, repondre } from '@/lib/financement/garde'

// Publique mais verrouillée (voir lib/financement/installation.ts).
export async function POST(req: Request) {
  const c = await corps(req)
  return repondre(() => installer({ code: String(c.code ?? ''), email: String(c.email ?? ''), prenom: String(c.prenom ?? ''), nom: String(c.nom ?? '') }))
}
