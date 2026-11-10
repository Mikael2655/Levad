// Mise à jour des barèmes depuis Grenke : lecture du calculateur (sans engagement) puis, à la demande, écriture dans NOS barèmes.
// Rien n'est envoyé ni créé chez Grenke.
import { prisma } from '@/lib/db'
import { ErreurMetier } from '../../erreurs'
import { calculer } from './api'
import type { ConfigGrenke } from './config'
import { montantsAMesurer, planifier, problemesGrille, type Echantillon, type EntreeCommerciale, type GrilleEntree, type Plan } from './maj-bareme'

const versEntree = (g: { base: string; lignes: { dureeMois: number; montantMinCentimes: number; coefficientBp: number }[] }): GrilleEntree => ({
  base: g.base as GrilleEntree['base'],
  lignes: g.lignes.map(l => ({ dureeMois: l.dureeMois, montantMinCentimes: l.montantMinCentimes, coefficientBp: l.coefficientBp })),
})

async function preparer(c: ConfigGrenke) {
  const financeur = await prisma.finFinanceur.findUnique({ where: { nom: 'Grenke' } })
  if (!financeur) throw new ErreurMetier('Financeur « Grenke » introuvable.', 404)
  const reelleDb = await prisma.finGrille.findFirst({ where: { financeurId: financeur.id, type: 'REELLE', utilisateurId: null }, include: { lignes: true } })
  if (!reelleDb) throw new ErreurMetier('Aucun barème réel pour Grenke : créez-le d’abord (Administration → Barèmes).')
  const reelle = versEntree(reelleDb)
  const commercialesDb = await prisma.finGrille.findMany({ where: { financeurId: financeur.id, type: 'COMMERCIALE' }, include: { lignes: true, utilisateur: true } })
  const commerciales: (EntreeCommerciale & { id: number })[] = commercialesDb.map(g => ({ id: g.id, cle: String(g.id), libelle: g.utilisateur ? `${g.utilisateur.prenom} ${g.utilisateur.nom}` : 'Barème commun des commerciaux', grille: versEntree(g) }))
  const echantillons: Echantillon[] = []
  for (const montantCentimes of montantsAMesurer(reelle)) {
    const r = await calculer(c, { montantCentimes, periodicite: 'TRIMESTRIELLE', commissionPourcent: financeur.commissionBp != null ? financeur.commissionBp / 100 : null })
    const loyers: Record<number, number> = {}
    r.forEach(x => { loyers[x.dureeMois] = x.loyerMensuelCentimes })
    echantillons.push({ montantCentimes, loyerMensuelParDuree: loyers })
  }
  if (echantillons.every(e => Object.keys(e.loyerMensuelParDuree).length === 0)) throw new ErreurMetier('Grenke n’a renvoyé aucun calcul.')
  return { reelleDb, reelle, commerciales, plan: planifier(reelle, commerciales, echantillons) }
}

export async function simulerMajBareme(c: ConfigGrenke): Promise<Plan> {
  return (await preparer(c)).plan
}

export async function appliquerMajBareme(c: ConfigGrenke): Promise<Plan> {
  const { reelleDb, commerciales, plan } = await preparer(c) // on re-mesure : on n'applique jamais un plan envoyé par le navigateur
  const aEcrire = [
    { grilleId: reelleDb.id, lignes: plan.reelle.lignes, nom: 'barème réel' },
    ...plan.commerciales.map(p => ({ grilleId: commerciales.find(x => x.cle === p.cle)!.id, lignes: p.lignes, nom: p.libelle })),
  ]
  for (const g of aEcrire) {
    const p = problemesGrille(g.lignes)
    if (p.length) throw new ErreurMetier(`${g.nom} : mise à jour annulée, le résultat serait incohérent (${p.join(' ')}).`)
  }
  await prisma.$transaction(async tx => {
    for (const g of aEcrire) {
      await tx.finGrilleLigne.deleteMany({ where: { grilleId: g.grilleId } })
      await tx.finGrilleLigne.createMany({ data: g.lignes.map(l => ({ ...l, grilleId: g.grilleId })) })
    }
  })
  return plan
}
