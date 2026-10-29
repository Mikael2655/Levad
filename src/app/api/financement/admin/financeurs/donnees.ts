import type { DonneesFinanceur } from '@/lib/financement/admin'

// Ne retient que les champs attendus, avec le bon type (le reste du corps de la requête est ignoré).
export function donneesFinanceur(c: Record<string, any>): DonneesFinanceur {
  return {
    ...(typeof c.nom === 'string' ? { nom: c.nom } : {}),
    ...(typeof c.connecteur === 'string' ? { connecteur: c.connecteur } : {}),
    ...(typeof c.actif === 'boolean' ? { actif: c.actif } : {}),
    ...(c.majorationMensuelleBp !== undefined ? { majorationMensuelleBp: Number(c.majorationMensuelleBp) } : {}),
    ...(c.commissionBp !== undefined ? { commissionBp: c.commissionBp === null || c.commissionBp === '' ? null : Number(c.commissionBp) } : {}),
    ...(typeof c.signatureElectronique === 'boolean' ? { signatureElectronique: c.signatureElectronique } : {}),
    ...(typeof c.envoiParMail === 'boolean' ? { envoiParMail: c.envoiParMail } : {}),
    ...(c.destinataireMailId !== undefined ? { destinataireMailId: c.destinataireMailId === null || c.destinataireMailId === '' ? null : Number(c.destinataireMailId) } : {}),
    ...(c.fraisDossierCentimes !== undefined ? { fraisDossierCentimes: Number(c.fraisDossierCentimes) } : {}),
  }
}
