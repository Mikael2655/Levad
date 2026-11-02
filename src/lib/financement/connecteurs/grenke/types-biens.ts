// Identifiants des types de biens chez Grenke (ObjectTypeId), communiqués par Grenke le 31/10/2026.
// Seul le copieur (7) est actif pour LEVAD aujourd'hui ; les autres seront activés par Grenke (décision commerciale) quand LEVAD démarrera ces activités.
export const TYPES_BIENS_GRENKE = [
  { id: 7, libelle: 'Copieur / imprimante (Photocopier)', actif: true },
  { id: 136, libelle: 'Téléphonie IP (Voice over IP)', actif: false },
  { id: 1, libelle: 'Matériel informatique (IT Equipment)', actif: false },
  { id: 134, libelle: 'Vidéosurveillance et contrôle d’accès (Video Security System)', actif: false },
] as const

export const TYPE_BIEN_PAR_DEFAUT = 7
export const libelleTypeBien = (id: number) => TYPES_BIENS_GRENKE.find(t => t.id === id)?.libelle ?? `Type n° ${id}`
