// Contrats lus chez Grenke pour la synchronisation : compte LEVAD, mode Distributeur (partenaires rattachés, ex. RS Systems 058) ou les deux.
import { ErreurMetier } from '../../erreurs'
import type { Connecteur, ContratFinanceur } from '../connecteur'

export type SourceContrats = 'moi' | 'distributeur' | 'les-deux'

export async function recupererContratsGrenke(connecteur: Connecteur, source: SourceContrats): Promise<{ contrats: ContratFinanceur[]; avertissements: string[] }> {
  const avertissements: string[] = []
  const par = new Map<string, ContratFinanceur>()
  if (source !== 'distributeur') for (const x of await connecteur.listerContrats()) par.set(x.reference, x)
  if (source !== 'moi') {
    if (!connecteur.listerContratsDistributeur) throw new ErreurMetier('Le mode Distributeur n’est pas disponible pour ce financeur.')
    try {
      for (const x of await connecteur.listerContratsDistributeur()) if (!par.has(x.reference)) par.set(x.reference, x)
    } catch (e) {
      if (source === 'distributeur') throw e
      avertissements.push(`Contrats du mode Distributeur non lus (${(e as Error).message}) : seuls les contrats de votre compte sont comparés.`)
    }
  }
  return { contrats: Array.from(par.values()), avertissements }
}
