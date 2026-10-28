import { NextResponse } from 'next/server'
import { lireConfigGrenke } from '@/lib/financement/connecteurs/grenke/config'
import { apercuDemande, essaiCalculs, essaiConnexion, essaiContrats, essaiDemandes, essaiTypes } from '@/lib/financement/connecteurs/grenke/essais'
import { ErreurMetier } from '@/lib/financement/erreurs'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'

export const runtime = 'nodejs'

// Essais de l'administrateur : lecture seule (et aperçu sans réseau). Aucune demande n'est créée chez Grenke.
export async function POST(req: Request) {
  const u = await acteurApi({ roles: ['ADMIN'] })
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  const action = String(c.action ?? '')
  return repondre(async () => {
    const cfg = lireConfigGrenke()
    if (action === 'apercu') return apercuDemande(Number(c.demandeId), cfg.config?.modePaiement)
    if (!cfg.prete || !cfg.config) throw new ErreurMetier(cfg.manquantes.length ? `Configuration incomplète : variables manquantes ${cfg.manquantes.join(', ')}.` : `Configuration invalide : ${cfg.problemes.join(' ')}`, 400)
    switch (action) {
      case 'connexion': return essaiConnexion(cfg.config)
      case 'demandes': return essaiDemandes(cfg.config)
      case 'contrats': return essaiContrats(cfg.config)
      case 'types': return essaiTypes(cfg.config)
      case 'calculs': return essaiCalculs(cfg.config)
      default: throw new ErreurMetier('Action inconnue.')
    }
  })
}
