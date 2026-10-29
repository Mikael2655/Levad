// Choix du connecteur d'un financeur : « grenke_api » seulement si la configuration Grenke est complète et valide.
// Les autres financeurs (manuel, Solubail...) n'ont pas de connecteur automatique : null.
import type { Connecteur } from './connecteur'
import { lireConfigGrenke } from './grenke/config'
import { creerConnecteurGrenke } from './grenke/connecteur'

export function connecteurPour(code: string): Connecteur | null {
  if (code !== 'grenke_api') return null
  const r = lireConfigGrenke()
  return r.prete && r.config ? creerConnecteurGrenke(r.config) : null
}
