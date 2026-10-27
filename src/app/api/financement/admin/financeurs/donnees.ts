import type { DonneesFinanceur } from '@/lib/financement/admin'

// Ne retient que les champs attendus, avec le bon type (le reste du corps de la requête est ignoré).
export function donneesFinanceur(c: Record<string, any>): DonneesFinanceur {
  return {
    ...(typeof c.nom === 'string' ? { nom: c.nom } : {}),
    ...(typeof c.connecteur === 'string' ? { connecteur: c.connecteur } : {}),
    ...(typeof c.actif === 'boolean' ? { actif: c.actif } : {}),
    ...(c.majorationMensuelleBp !== undefined ? { majorationMensuelleBp: Number(c.majorationMensuelleBp) } : {}),
    ...(c.commissionBp !== undefined ? { commissionBp: c.commissionBp === null || c.commissionBp === '' ? null : Number(c.commissionBp) } : {}),
    ...(c.fraisDossierCentimes !== undefined ? { fraisDossierCentimes: Number(c.fraisDossierCentimes) } : {}),
  }
}
