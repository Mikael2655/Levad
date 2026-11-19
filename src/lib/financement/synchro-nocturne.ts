// Synchronisation de nuit des contrats avec Grenke (compte LEVAD + mode Distributeur). Non destructive :
//  - complète les champs VIDES, met à jour l'état chez le financeur et relie les contrats issus d'une demande à leur vrai numéro ;
//  - ne crée AUCUN contrat inconnu (il faut choisir son commercial) : il est signalé ;
//  - ne clôture rien ; les écarts de valeurs sont signalés, jamais corrigés.
// Un e-mail part aux administrateurs seulement quand quelque chose de NOUVEAU mérite attention (même constat que la veille : pas de mail).
import { prisma } from '@/lib/db'
import { lireConfigGrenke } from './connecteurs/grenke/config'
import { creerConnecteurGrenke } from './connecteurs/grenke/connecteur'
import { recupererContratsGrenke } from './connecteurs/grenke/contrats-source'
import { envoyerEtJournaliser, ecrireParametre, gabarit, lireParametre, urlBase } from './notifications'
import { synchroniserContrats } from './synchro-contrats'

export const PARAM_SYNCHRO_DERNIERE = 'synchro.derniere'
const PARAM_SYNCHRO_SIGNATURE = 'synchro.signature'

export interface ResumeSynchro {
  date: string
  ok: boolean
  erreur?: string
  connus?: number
  completes?: number
  reliees?: number
  nouveaux?: string[]
  ecarts?: string[]
  aCloturer?: string[]
  absents?: number
  avertissements?: string[]
}

export async function synchroNocturne(maintenant: Date = new Date()): Promise<ResumeSynchro> {
  const resume: ResumeSynchro = { date: maintenant.toISOString(), ok: false }
  try {
    const cfg = lireConfigGrenke()
    if (!cfg.prete || !cfg.config) throw new Error('Configuration Grenke incomplète ou invalide.')
    const financeur = await prisma.finFinanceur.findUnique({ where: { nom: 'Grenke' } })
    const admin = await prisma.finUtilisateur.findFirst({ where: { role: 'ADMIN', actif: true }, orderBy: { id: 'asc' } })
    if (!financeur || !admin) throw new Error('Financeur Grenke ou administrateur introuvable.')
    const connecteur = creerConnecteurGrenke(cfg.config)
    const r = await synchroniserContrats({ id: admin.id, role: 'ADMIN' }, { financeurId: financeur.id, commercialDefautId: null, periodicite: 'MENSUELLE', appliquer: true, creerNouveaux: false }, () => recupererContratsGrenke(connecteur, 'les-deux'))
    if (r.simule) throw new Error('Synchronisation non appliquée.')
    Object.assign(resume, {
      ok: true, connus: r.rapport.connus, completes: r.mis_a_jour, reliees: r.reliees,
      nouveaux: r.rapport.nouveaux.map(n => `${n.reference} · ${n.client}`),
      ecarts: r.rapport.ecarts.map(e => `${e.ref} · ${e.client} : ${e.champ} (outil ${e.nous}, Grenke ${e.financeur})`),
      aCloturer: r.rapport.aCloturer.map(c => `${c.ref} · ${c.client} (${c.etat})`),
      absents: r.rapport.absents.length, avertissements: r.rapport.avertissements,
    })
  } catch (e) {
    resume.erreur = (e as Error).message
  }
  await ecrireParametre(PARAM_SYNCHRO_DERNIERE, JSON.stringify(resume))
  await prevenirSiNouveau(resume)
  return resume
}

async function prevenirSiNouveau(r: ResumeSynchro) {
  const notable = !r.ok ? [`ERREUR : ${r.erreur}`] : [...(r.nouveaux ?? []).map(x => `Nouveau : ${x}`), ...(r.ecarts ?? []).map(x => `Écart : ${x}`), ...(r.aCloturer ?? []).map(x => `Terminé chez Grenke : ${x}`), ...(r.avertissements ?? [])]
  const signature = notable.join('|')
  if ((await lireParametre(PARAM_SYNCHRO_SIGNATURE)) === signature) return // déjà signalé hier
  await ecrireParametre(PARAM_SYNCHRO_SIGNATURE, signature)
  if (notable.length === 0) return
  const admins = await prisma.finUtilisateur.findMany({ where: { role: 'ADMIN', actif: true }, select: { email: true } })
  const g = gabarit({
    titre: r.ok ? 'Synchronisation des contrats Grenke : à regarder' : 'Synchronisation des contrats Grenke : échec',
    intro: r.ok ? 'La synchronisation de nuit a relevé les points suivants (rien n’a été supprimé ni clôturé automatiquement) :' : 'La synchronisation de nuit n’a pas pu aboutir.',
    lignes: notable.slice(0, 40).map(x => ['•', x] as [string, string]),
    lien: { url: `${urlBase()}/financement/admin/grenke`, texte: 'Ouvrir la synchronisation' },
  })
  for (const a of admins) await envoyerEtJournaliser('SYNCHRO_CONTRATS', null, { to: a.email, sujet: r.ok ? 'Contrats Grenke : points à vérifier' : 'Contrats Grenke : synchronisation en échec', html: g.html, texte: g.texte })
}
