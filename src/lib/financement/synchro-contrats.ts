// Synchronisation des contrats d'un financeur avec son API (Grenke), en LECTURE SEULE côté financeur.
// Règles :
//  - un contrat est reconnu par son numéro (comparaison sans espaces, tirets ni majuscules) : jamais de doublon avec l'import ;
//  - JAMAIS modifiés : commercial, matériel, banque, montant commercial, dénonciation, clôture, demandes de solde, lien avec la demande ;
//  - lus chez le financeur : l'état (toujours mis à jour), et les dates, la durée, le loyer, le montant financé (remplis seulement s'ils sont vides chez nous) ;
//  - une valeur déjà présente et différente n'est PAS remplacée : elle est signalée dans « écarts à vérifier » ;
//  - rien n'est clôturé automatiquement : les contrats terminés chez le financeur sont seulement proposés ;
//  - réponse vide ou en erreur : on s'arrête sans rien modifier.
import { prisma } from '@/lib/db'
import { grilleCommercialePour } from './admin'
import { montantDepuisLoyer, type Periodicite } from './calcul'
import type { ContratFinanceur } from './connecteurs/connecteur'
import { comparer } from './synchro-comparaison'
import { estAdmin } from './droits'
import { dateFinDepuisDebut } from './echeances'
import { ErreurMetier } from './erreurs'

export interface ParametresSynchro { financeurId: number; commercialDefautId: number | null; periodicite: Periodicite; appliquer: boolean }
export type Recuperer = () => Promise<ContratFinanceur[]>

export async function synchroniserContrats(a: { id: number; role: 'ADMIN' | 'ASSISTANTE' | 'COMMERCIAL' }, p: ParametresSynchro, recuperer: Recuperer) {
  if (!estAdmin(a)) throw new ErreurMetier('Réservé à l’administrateur.', 403)
  const financeur = await prisma.finFinanceur.findUnique({ where: { id: p.financeurId } })
  if (!financeur) throw new ErreurMetier('Financeur introuvable.', 404)
  const existants = await prisma.finContrat.findMany({ where: { financeurId: financeur.id }, select: { id: true, refFinanceur: true, raisonSociale: true, loyerCentimes: true, dureeMois: true, dateDebut: true, dateFin: true, montantReelCentimes: true, statutFinanceur: true, clotureLe: true } })

  const distants = await recuperer() // une erreur ici arrête tout : rien n'est modifié
  if (distants.length === 0 && existants.length > 0) throw new ErreurMetier('Le financeur a renvoyé une liste vide : rien n’a été modifié (vérifiez la connexion).')

  const rapport = comparer(existants, distants)
  if (!p.appliquer) return { simule: true as const, rapport, crees: 0, mis_a_jour: 0 }

  let commercial: { id: number } | null = null
  if (rapport.nouveaux.length) {
    const u = p.commercialDefautId ? await prisma.finUtilisateur.findUnique({ where: { id: p.commercialDefautId } }) : null
    if (!u || !u.actif || (u.role !== 'COMMERCIAL' && u.role !== 'ADMIN')) throw new ErreurMetier('Choisissez le commercial qui recevra les nouveaux contrats.')
    commercial = u
  }
  const grille = commercial ? await grilleCommercialePour(financeur.id, commercial.id) : null

  const creations = rapport.nouveaux.map(g => {
    const loyer = g.loyerMensuelCentimes!
    const recalcule = grille ? montantDepuisLoyer(grille, g.dureeMois, p.periodicite, financeur.majorationMensuelleBp, loyer) : null
    return prisma.finContrat.create({
      data: {
        importe: true, refFinanceur: g.reference, statutFinanceur: g.etatBrut || null, financeurId: financeur.id, commercialId: commercial!.id,
        raisonSociale: g.client || 'Client à renseigner', materiel: 'Non précisé', periodicite: p.periodicite, dureeMois: g.dureeMois, loyerCentimes: loyer,
        dateDebut: g.dateDebut, dateFin: g.dateFin ?? (g.dateDebut ? dateFinDepuisDebut(g.dateDebut, g.dureeMois) : null),
        montantReelCentimes: g.montantFinanceCentimes, montantCommercialCentimes: recalcule?.montantCentimes ?? null,
      },
    })
  })
  // seuls l'état, et les valeurs VIDES chez nous, sont écrits : jamais commercial, matériel, banque, dénonciation, clôture...
  const miseAJour = rapport.aRemplir.map(x => prisma.finContrat.update({ where: { id: x.id }, data: x.donnees }))
  await prisma.$transaction([...creations, ...miseAJour])
  return { simule: false as const, rapport, crees: creations.length, mis_a_jour: miseAJour.length }
}
