// Solde d'un contrat avant son terme (rachat) : simulation, enregistrement, envoi au financeur, signature.
// Le commercial peut simuler et enregistrer pour SES contrats ; seuls l'administrateur et l'assistante envoient la demande.
// Un commercial ne reçoit jamais la valeur résiduelle ni la pénalité détaillées (elles révèlent le montant financé réel).
import { prisma } from '@/lib/db'
import { peutModifierContrat, peutVoirBaremeReel, type Acteur } from './droits'
import { statutContrat } from './echeances'
import { ErreurMetier } from './erreurs'
import { envoyerEtJournaliser, gabarit, urlBase } from './notifications'
import { LIBELLES_TYPE_RACHAT, simulerRachat, TYPES_RACHAT, type ResultatRachat, type TypeRachat } from './rachat'

export const STATUTS_RACHAT = ['SIMULEE', 'ENVOYEE', 'SIGNEE', 'ANNULEE'] as const
export type StatutRachat = (typeof STATUTS_RACHAT)[number]
export const LIBELLES_STATUT_RACHAT: Record<StatutRachat, string> = { SIMULEE: 'Enregistrée', ENVOYEE: 'Envoyée au financeur', SIGNEE: 'Signée', ANNULEE: 'Annulée' }

async function contratAccessible(a: Acteur, id: number) {
  const c = await prisma.finContrat.findFirst({ where: { id, ...(a.role === 'COMMERCIAL' ? { commercialId: a.id } : {}) }, include: { financeur: true, commercial: true } })
  if (!c) throw new ErreurMetier('Contrat introuvable.', 404)
  return c
}

function calculer(c: Awaited<ReturnType<typeof contratAccessible>>, type: string, dateResiliation: Date): ResultatRachat {
  if (!(TYPES_RACHAT as readonly string[]).includes(type)) throw new ErreurMetier('Choisissez le type de solde.')
  if (Number.isNaN(dateResiliation.getTime())) throw new ErreurMetier('Indiquez la date de résiliation souhaitée.')
  if (statutContrat(c) !== 'EN_COURS') throw new ErreurMetier('Le solde anticipé ne concerne que les contrats en cours.')
  if (!c.dateDebut || !c.dateFin) throw new ErreurMetier('La date du 1er loyer est inconnue : renseignez-la dans la fiche du contrat.')
  if (c.montantReelCentimes == null) throw new ErreurMetier('Le montant financé réel du contrat est inconnu (nécessaire pour la valeur résiduelle de 1 %).')
  return simulerRachat({ loyerCentimes: c.loyerCentimes, periodicite: c.periodicite, dureeMois: c.dureeMois, dateDebut: c.dateDebut, montantReelCentimes: c.montantReelCentimes, type: type as TypeRachat, dateResiliation })
}

type LigneRachat = Awaited<ReturnType<typeof prisma.finRachat.findFirstOrThrow>>

// Ce que le navigateur reçoit : liste blanche selon le rôle.
export function vueRachat(a: Acteur, r: LigneRachat) {
  const commune = { demande: (r as LigneRachat & { demande?: { id: number; reference: string } | null }).demande ?? null, id: r.id, creeLe: r.creeLe, type: r.type, dateResiliation: r.dateResiliation, nbLoyersRestants: r.nbLoyersRestants, totalCentimes: r.totalCentimes, statut: r.statut, envoyeLe: r.envoyeLe, commentaire: r.commentaire }
  return peutVoirBaremeReel(a)
    ? { ...commune, loyersRestantsCentimes: r.loyersRestantsCentimes, penaliteCentimes: r.penaliteCentimes, valeurResiduelleCentimes: r.valeurResiduelleCentimes }
    : commune
}

export async function simulerSolde(a: Acteur, contratId: number, p: { type: string; dateResiliation: Date }) {
  const c = await contratAccessible(a, contratId)
  const r = calculer(c, p.type, p.dateResiliation)
  return peutVoirBaremeReel(a) ? r : { nbLoyersRestants: r.nbLoyersRestants, totalCentimes: r.totalCentimes }
}

export async function enregistrerRachat(a: Acteur, contratId: number, p: { type: string; dateResiliation: Date; commentaire?: string }) {
  const c = await contratAccessible(a, contratId)
  const r = calculer(c, p.type, p.dateResiliation)
  if (await prisma.finRachat.findFirst({ where: { contratId, statut: 'ENVOYEE' } })) throw new ErreurMetier('Une demande de solde est déjà envoyée au financeur pour ce contrat.')
  const lie = await prisma.finRachat.findFirst({ where: { contratId, statut: 'SIMULEE', demande: { isNot: null } }, include: { demande: { select: { reference: true } } } })
  if (lie) throw new ErreurMetier(`Le solde actuel est intégré à la demande de renouvellement ${lie.demande!.reference} : modifiez cette demande plutôt que de refaire une simulation.`)
  // une nouvelle simulation remplace les précédentes encore « enregistrées »
  const [, cree] = await prisma.$transaction([
    prisma.finRachat.updateMany({ where: { contratId, statut: 'SIMULEE' }, data: { statut: 'ANNULEE' } }),
    prisma.finRachat.create({ data: { contratId, creeParId: a.id, type: p.type, dateResiliation: p.dateResiliation, ...r, statut: 'SIMULEE', commentaire: p.commentaire?.trim() || null } }),
  ])
  return vueRachat(a, cree)
}

export async function listerRachats(a: Acteur, contratId: number) {
  await contratAccessible(a, contratId)
  const lignes = await prisma.finRachat.findMany({ where: { contratId }, orderBy: { creeLe: 'desc' }, include: { demande: { select: { id: true, reference: true } } } })
  return lignes.map(r => vueRachat(a, r))
}

const euros = (c: number) => (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
const dateFr = (d: Date) => d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })

// Envoi de la demande de rachat : l'API Grenke ne propose pas cette opération, la demande part donc par e-mail vers la personne
// choisie pour le financeur (administrateur ou assistante), qui la saisit sur le site du financeur (offre de rachat à signer ensuite).
export async function envoyerRachat(a: Acteur, rachatId: number) {
  if (!peutModifierContrat(a)) throw new ErreurMetier('Réservé à l’administrateur et à l’assistante.', 403)
  const r = await prisma.finRachat.findUnique({ where: { id: rachatId }, include: { contrat: { include: { financeur: true, commercial: true } } } })
  if (!r) throw new ErreurMetier('Demande de solde introuvable.', 404)
  if (r.statut !== 'SIMULEE') throw new ErreurMetier('Seule une demande enregistrée peut être envoyée.')
  if (await prisma.finDemande.findFirst({ where: { rachatId: r.id }, select: { id: true } })) throw new ErreurMetier('Ce solde est intégré à une demande de renouvellement : il part avec elle, il ne s’envoie pas séparément.')
  const { contrat: c } = r
  const dest = (c.financeur.destinataireMailId ? await prisma.finUtilisateur.findUnique({ where: { id: c.financeur.destinataireMailId } }) : null)
    ?? (await prisma.finUtilisateur.findFirst({ where: { role: 'ADMIN', actif: true }, orderBy: { id: 'asc' } }))
  if (!dest) throw new ErreurMetier('Aucun destinataire pour cet e-mail.')
  const page = gabarit({
    titre: `Demande de solde anticipé – ${c.financeur.nom}`,
    intro: `À saisir sur le site de ${c.financeur.nom} : une offre de rachat (à signer par le client) doit être générée.`,
    lignes: [
      ['Type', LIBELLES_TYPE_RACHAT[r.type as TypeRachat]],
      ['Client', c.raisonSociale],
      ['N° de contrat financeur', c.refFinanceur ?? '(inconnu)'],
      ['Date de résiliation souhaitée', dateFr(r.dateResiliation)],
      ['Loyers restants', `${r.nbLoyersRestants} × ${euros(c.loyerCentimes)} = ${euros(r.loyersRestantsCentimes)}`],
      ...(r.penaliteCentimes ? [['Pénalité (10 %)', euros(r.penaliteCentimes)] as [string, string]] : []),
      ['Valeur résiduelle (1 %)', euros(r.valeurResiduelleCentimes)],
      ['Total à régler', euros(r.totalCentimes)],
    ],
    lien: { url: `${urlBase()}/financement/contrats/${c.id}`, texte: 'Ouvrir le contrat (pour suivre la demande)' },
    pied: `Demande enregistrée par ${c.commercial.prenom} ${c.commercial.nom} (commercial du contrat).`,
  })
  const res = await envoyerEtJournaliser('RACHAT_FINANCEUR', null, { to: dest.email, sujet: `Solde anticipé ${c.financeur.nom} – ${c.raisonSociale}`, html: page.html, texte: page.texte })
  if (res === 'IGNORE') throw new ErreurMetier('Envoi d’e-mails non configuré sur ce serveur (RESEND_API_KEY absente).')
  if (res === 'ECHEC') throw new ErreurMetier('L’e-mail n’a pas pu être envoyé (voir Administration → Notifications).')
  await prisma.finRachat.update({ where: { id: rachatId }, data: { statut: 'ENVOYEE', envoyeLe: new Date(), envoyeParId: a.id } })
  return { ok: true }
}

// Suite de la demande : « Signée » (offre de rachat signée : le contrat est clôturé à la date de résiliation) ou « Annulée ».
export async function changerStatutRachat(a: Acteur, rachatId: number, statut: string) {
  const r = await prisma.finRachat.findUnique({ where: { id: rachatId }, include: { contrat: true } })
  if (!r) throw new ErreurMetier('Demande de solde introuvable.', 404)
  if (a.role === 'COMMERCIAL') {
    // un commercial ne peut qu'annuler sa propre simulation enregistrée
    if (r.contrat.commercialId !== a.id || r.creeParId !== a.id || statut !== 'ANNULEE' || r.statut !== 'SIMULEE') throw new ErreurMetier('Action non autorisée.', 403)
  }
  if (statut === 'ANNULEE') {
    if (r.statut === 'SIGNEE' || r.statut === 'ANNULEE') throw new ErreurMetier('Cette demande est déjà terminée.')
    const liee = await prisma.finDemande.findFirst({ where: { rachatId: r.id, statut: { notIn: ['ANNULEE'] } }, select: { reference: true } })
    if (liee) throw new ErreurMetier(`Ce solde est intégré à la demande ${liee.reference} : annulez d’abord cette demande, ou retirez le rachat en la modifiant.`)
    await prisma.finRachat.update({ where: { id: rachatId }, data: { statut: 'ANNULEE' } })
  } else if (statut === 'SIGNEE') {
    if (r.statut !== 'ENVOYEE') throw new ErreurMetier('La demande doit d’abord être envoyée au financeur.')
    await prisma.$transaction([
      prisma.finRachat.update({ where: { id: rachatId }, data: { statut: 'SIGNEE' } }),
      prisma.finContrat.update({ where: { id: r.contratId }, data: { clotureLe: r.dateResiliation, clotureMotif: LIBELLES_TYPE_RACHAT[r.type as TypeRachat] } }),
    ])
  } else throw new ErreurMetier('Statut inconnu.')
  return { ok: true }
}
