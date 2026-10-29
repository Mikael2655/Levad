// Connecteur « manuel » : l'outil n'appelle personne. La demande est enregistrée ; une personne la saisit sur le portail du financeur
// et met le statut à jour à la main depuis la fiche. Aucune action automatique n'est donc possible ici.
import { ErreurMetier } from '../erreurs'
import type { Connecteur } from './connecteur'

const manuel = (action: string) => new ErreurMetier(`${action} : à faire à la main sur le portail du financeur (connecteur manuel).`, 501)

export const connecteurManuel: Connecteur = {
  code: 'manuel',
  creerDemande: async () => { throw manuel('Envoi de la demande') },
  recupererStatut: async () => null,
  envoyerPiece: async () => { throw manuel('Envoi de la pièce') },
  lancerSignature: async () => { throw manuel('Lancement de la signature') },
  recupererContratSigne: async () => null,
  listerContrats: async () => [],
}
