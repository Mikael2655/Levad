// Solde d'un contrat avant son terme. Règle Grenke :
//  - « renouvelant » : loyers restants dus + valeur résiduelle (VR = 1 % du montant financé réel initial)
//  - « non renouvelant » (à l'initiative du client, ou changement de financeur au renouvellement) :
//    loyers restants dus + pénalité de 10 % de ces loyers restants + VR
// Un loyer est « restant » s'il tombe strictement après la date de résiliation.
import { ajouterMois } from './echeances'
import { ErreurMetier } from './erreurs'

export type TypeRachat = 'RENOUVELANT' | 'NON_RENOUVELANT'
export const TYPES_RACHAT: readonly TypeRachat[] = ['RENOUVELANT', 'NON_RENOUVELANT']
export const LIBELLES_TYPE_RACHAT: Record<TypeRachat, string> = { RENOUVELANT: 'Solde renouvelant', NON_RENOUVELANT: 'Solde non renouvelant' }

export const VR_BP = 100 // 1 %
export const PENALITE_BP = 1000 // 10 %

export interface EntreeRachat {
  loyerCentimes: number
  periodicite: string
  dureeMois: number
  dateDebut: Date // 1er loyer
  montantReelCentimes: number // montant financé réel initial
  type: TypeRachat
  dateResiliation: Date
}

export interface ResultatRachat {
  nbLoyersRestants: number
  loyersRestantsCentimes: number
  penaliteCentimes: number
  valeurResiduelleCentimes: number
  totalCentimes: number
}

export function simulerRachat(e: EntreeRachat): ResultatRachat {
  if (!(TYPES_RACHAT as readonly string[]).includes(e.type)) throw new ErreurMetier('Type de solde inconnu.')
  const pas = e.periodicite === 'MENSUELLE' ? 1 : 3
  const nbLoyers = Math.floor(e.dureeMois / pas)
  let restants = 0
  for (let k = 0; k < nbLoyers; k++) if (ajouterMois(e.dateDebut, k * pas).getTime() > e.dateResiliation.getTime()) restants++
  const loyersRestantsCentimes = restants * e.loyerCentimes
  const penaliteCentimes = e.type === 'NON_RENOUVELANT' ? Math.round((loyersRestantsCentimes * PENALITE_BP) / 10000) : 0
  const valeurResiduelleCentimes = Math.round((e.montantReelCentimes * VR_BP) / 10000)
  return { nbLoyersRestants: restants, loyersRestantsCentimes, penaliteCentimes, valeurResiduelleCentimes, totalCentimes: loyersRestantsCentimes + penaliteCentimes + valeurResiduelleCentimes }
}
