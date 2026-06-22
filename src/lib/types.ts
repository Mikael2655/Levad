export type LeadStatus = 'nouveau' | 'qualifie' | 'proposition' | 'gagne' | 'perdu'
export type LeadProduct = 'impression' | 'telephonie' | 'informatique' | 'ged'
export type LeadSource = 'formulaire' | 'telephone' | 'salon' | 'recommandation'

export interface Lead {
  id: number
  createdAt: string
  updatedAt: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  company?: string | null
  jobTitle?: string | null
  product: LeadProduct
  message?: string | null
  status: LeadStatus
  source: LeadSource
  notes?: string | null
  assignedTo?: string | null
}

export const PRODUCT_LABELS: Record<LeadProduct, string> = {
  impression: 'Impression',
  telephonie: 'Téléphonie',
  informatique: 'Informatique & Réseau',
  ged: 'GED',
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  nouveau: 'Nouveau',
  qualifie: 'Qualifié',
  proposition: 'Proposition',
  gagne: 'Gagné',
  perdu: 'Perdu',
}

export const SOURCE_LABELS: Record<LeadSource, string> = {
  formulaire: 'Formulaire web',
  telephone: 'Téléphone',
  salon: 'Salon / Événement',
  recommandation: 'Recommandation',
}
