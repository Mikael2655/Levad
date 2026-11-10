// Envoi RÉEL d'une demande à Grenke (POST /basic/v1/requests). Réservé à l'administrateur, jamais automatique.
// Garde-fous : mode d'écriture (fermé / test sur un SIREN / ouvert), financeur Grenke, pas de double envoi, montant réel présent.
import { prisma } from '@/lib/db'
import { estAdmin } from '../../droits'
import { ErreurMetier } from '../../erreurs'
import { creerDemandeApi } from './api'
import { lireConfigGrenke } from './config'
import { modeEcriture } from './connecteur'
import { construireDemandeGrenke, type OptionsGrenke } from './demande'
import { TYPE_BIEN_PAR_DEFAUT } from './types-biens'

const EN_COURS = 'ENVOI-EN-COURS' // verrou : empêche un second envoi pendant l'appel à Grenke

export async function envoyerDemandeAGrenke(a: { id: number; role: 'ADMIN' | 'ASSISTANTE' | 'COMMERCIAL' }, demandeId: number) {
  if (!estAdmin(a)) throw new ErreurMetier('Réservé à l’administrateur.', 403)
  const { mode, sirenTest } = modeEcriture()
  if (mode === 'ferme') throw new ErreurMetier('L’envoi vers Grenke est fermé (variable GRENKE_ECRITURE absente).', 403)
  const cfg = lireConfigGrenke()
  if (!cfg.prete || !cfg.config) throw new ErreurMetier('Configuration Grenke incomplète : voir Administration → Connexion Grenke.')
  if (!cfg.config.modePaiement) throw new ErreurMetier('Variable GRENKE_PAYMENT_METHOD manquante.')

  const d = await prisma.finDemande.findUnique({ where: { id: demandeId }, include: { lignes: true, financeur: true } })
  if (!d) throw new ErreurMetier('Demande introuvable.', 404)
  if (d.financeur.connecteur !== 'grenke_api') throw new ErreurMetier('Cette demande n’est pas destinée à Grenke (API).')
  if (!['BROUILLON', 'INFOS_MANQUANTES'].includes(d.statut)) throw new ErreurMetier('Seule une demande en brouillon ou à compléter peut être envoyée.')
  if (d.refFinanceur) throw new ErreurMetier(d.refFinanceur === EN_COURS ? 'Un envoi est déjà en cours ou a été interrompu : vérifiez sur le portail Grenke avant toute nouvelle tentative.' : 'Cette demande a déjà un numéro de dossier Grenke : elle n’est pas renvoyée.', 409)
  if (d.rachatId) throw new ErreurMetier('Cette demande intègre un rachat : sa déclaration à Grenke n’est pas encore confirmée, envoi automatique refusé.')
  if (d.montantReelCentimes == null) throw new ErreurMetier('Pas de montant financé réel : rien à envoyer.')
  if (mode === 'test' && d.siret.replace(/\D/g, '').slice(0, 9) !== sirenTest) throw new ErreurMetier('Mode essai : seule une demande dont le client porte le SIREN de test annoncé à Grenke peut être envoyée.', 403)

  const options: OptionsGrenke = { modePaiement: cfg.config.modePaiement, commissionPourcent: d.financeur.commissionBp != null ? d.financeur.commissionBp / 100 : null, typeObjetParDefaut: TYPE_BIEN_PAR_DEFAUT, formatIdentifiant: 'SIREN' }
  const { requete, avertissements } = construireDemandeGrenke(
    { raisonSociale: d.raisonSociale, siret: d.siret, adresse: d.adresse, codePostal: d.codePostal, ville: d.ville, pays: d.pays, contactEmail: d.contactEmail, contactTel: d.contactTel, dureeMois: d.dureeMois, periodicite: d.periodicite as 'MENSUELLE' | 'TRIMESTRIELLE', montantReelCentimes: d.montantReelCentimes, lignes: d.lignes.map(l => ({ designation: l.designation, quantite: l.quantite, constructeur: l.constructeur, typeBien: l.typeBien, montantHtCentimes: l.montantHtCentimes })) },
    options,
  )

  const verrou = await prisma.finDemande.updateMany({ where: { id: demandeId, refFinanceur: null }, data: { refFinanceur: EN_COURS } })
  if (verrou.count !== 1) throw new ErreurMetier('Un envoi est déjà en cours pour cette demande.', 409)
  let financingId: string
  try {
    financingId = await creerDemandeApi(cfg.config, requete)
  } catch (e) {
    // Refus clair de Grenke (4xx) : rien n'a été créé, on libère. Sinon (délai, réponse illisible) on laisse le verrou : la demande a peut-être été créée.
    if (e instanceof ErreurMetier && /^(Grenke a refusé les données \(400\)|Accès refusé par Grenke \(403\)|Introuvable chez Grenke \(404\))/.test(e.message)) await prisma.finDemande.update({ where: { id: demandeId }, data: { refFinanceur: null } })
    throw e
  }
  await prisma.$transaction([
    prisma.finDemande.update({ where: { id: demandeId }, data: { refFinanceur: financingId, statut: 'ENVOYEE', infosManquantes: null, etapeSignature: null } }),
    prisma.finHistorique.create({ data: { demandeId, auteurId: a.id, ancienStatut: d.statut, nouveauStatut: 'ENVOYEE', commentaire: 'Envoyée à Grenke par l’API' } }),
  ])
  return { financingId, avertissements }
}
