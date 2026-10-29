// Essais en LECTURE SEULE lancés par l'administrateur depuis l'écran « Connexion Grenke » : aucune demande n'est créée chez Grenke.
import { prisma } from '@/lib/db'
import { grilleReelle } from '../../admin'
import { loyerDepuisMontant } from '../../calcul'
import { ErreurMetier } from '../../erreurs'
import { calculer, echo, listerContrats, listerDemandes, typesObjets, version } from './api'
import type { ConfigGrenke } from './config'
import { construireDemandeGrenke, type OptionsGrenke } from './demande'
import { versStatutCommun } from './statuts'

export async function essaiConnexion(c: ConfigGrenke) {
  return { heureGrenke: await echo(c), versionApi: await version(c) }
}

export async function essaiDemandes(c: ConfigGrenke) {
  const r = await listerDemandes(c, { pageSize: 20 })
  return {
    total: r.total,
    demandes: r.items.map(d => ({ idFinancement: d.FinancingId, reference: d.RequestId, etatGrenke: d.State, statutOutil: versStatutCommun(String(d.State))?.detail ?? '(état ignoré)', client: d.Lessee?.CompanyName, montant: d.FinancingAmount, dureeMois: d.Period, modifieLe: d.LastEdited })),
  }
}

export async function essaiContrats(c: ConfigGrenke) {
  const r = await listerContrats(c, { pageSize: 20 })
  return { total: r.total, contrats: r.items.map(x => ({ reference: x.ContractId, etat: x.State, client: x.Lessee?.CompanyName, loyerMensuel: x.TotalInstalment, dureeMois: x.Period, montantFinance: x.NetAcquisitionValue, debut: x.StartDate, fin: x.EndDate })) }
}

export const essaiTypes = (c: ConfigGrenke) => typesObjets(c)

// Compare, pour quelques montants, les loyers de Grenke (calcul sans durée : toutes les durées de la liste de conditions) avec ceux de
// NOTRE barème réel. Montre aussi quelles durées Grenke propose (13 et 17 trimestres = 39 et 51 mois, par exemple).
export async function essaiCalculs(c: ConfigGrenke) {
  const financeur = await prisma.finFinanceur.findUnique({ where: { nom: 'Grenke' } })
  const reelle = financeur ? await grilleReelle(financeur.id) : null
  const lignes: { montantEuros: number; dureeMois: number; grenkeTrimestriel: number; notreTrimestriel: number | null; ecartCentimes: number | null }[] = []
  const dureesGrenke = new Set<number>()
  for (const montantCentimes of [500000, 1500000, 3000000]) {
    for (const r of await calculer(c, { montantCentimes, periodicite: 'TRIMESTRIELLE', commissionPourcent: financeur?.commissionBp != null ? financeur.commissionBp / 100 : null })) {
      dureesGrenke.add(r.dureeMois)
      const grenke = r.loyerMensuelCentimes * 3 // l'API donne le loyer MENSUEL ; paiement trimestriel = x 3
      const nous = reelle && financeur ? loyerDepuisMontant(reelle, r.dureeMois, 'TRIMESTRIELLE', financeur.majorationMensuelleBp, montantCentimes) : null
      lignes.push({ montantEuros: montantCentimes / 100, dureeMois: r.dureeMois, grenkeTrimestriel: grenke / 100, notreTrimestriel: nous ? nous.loyerCentimes / 100 : null, ecartCentimes: nous ? grenke - nous.loyerCentimes : null })
    }
  }
  const dureesNous = reelle ? Array.from(new Set(reelle.lignes.map(l => l.dureeMois))).sort((a, b) => a - b) : []
  const grenkeTri = Array.from(dureesGrenke).sort((a, b) => a - b)
  return { dureesGrenke: grenkeTri, dureesNotreBareme: dureesNous, dureesAbsentesChezNous: grenkeTri.filter(d => !dureesNous.includes(d)), dureesAbsentesChezGrenke: dureesNous.filter(d => !grenkeTri.includes(d)), lignes }
}

// Aperçu de ce qui PARTIRAIT chez Grenke pour une demande existante. Aucun envoi, aucun accès réseau.
export async function apercuDemande(demandeId: number, modePaiementConfigure?: 'Invoice' | 'Direct Debit') {
  const d = await prisma.finDemande.findUnique({ where: { id: demandeId }, include: { lignes: true, financeur: true } })
  if (!d) throw new ErreurMetier('Demande introuvable.', 404)
  if (d.montantReelCentimes == null) throw new ErreurMetier('Cette demande n’a pas de montant financé réel (financeur sans barème réel) : rien à envoyer à Grenke.')
  const options: OptionsGrenke = { modePaiement: modePaiementConfigure ?? 'Invoice', commissionPourcent: d.financeur.commissionBp != null ? d.financeur.commissionBp / 100 : null, typeObjetParDefaut: 7, formatIdentifiant: 'SIREN' }
  const r = construireDemandeGrenke(
    { raisonSociale: d.raisonSociale, siret: d.siret, adresse: d.adresse, codePostal: d.codePostal, ville: d.ville, pays: d.pays, contactEmail: d.contactEmail, contactTel: d.contactTel, dureeMois: d.dureeMois, periodicite: d.periodicite as 'MENSUELLE' | 'TRIMESTRIELLE', montantReelCentimes: d.montantReelCentimes, lignes: d.lignes.map(l => ({ designation: l.designation, quantite: l.quantite, constructeur: l.constructeur, typeBien: l.typeBien, montantHtCentimes: l.montantHtCentimes })) },
    options,
  )
  return { ...r, avertissements: [...(modePaiementConfigure ? [] : ['Mode de paiement non configuré (GRENKE_PAYMENT_METHOD) : « Invoice » est affiché à titre d’exemple.']), ...r.avertissements] }
}
