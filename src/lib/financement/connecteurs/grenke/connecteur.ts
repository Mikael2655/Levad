// Connecteur Grenke API. Lecture seule pour l'instant : l'envoi réel de demandes, de pièces et de signatures sera activé
// après les essais, quand Grenke aura été prévenu (il n'existe pas d'environnement de test : tout se passe en production).
import { ErreurMetier } from '../../erreurs'
import type { Connecteur, ContratFinanceur, EtatDemande } from '../connecteur'
import { demarrerSignature, envoyerDocument, listerContrats, listerContratsDistributeur, listerDemandes, lireDemande, partenairesDistributeur } from './api'
import type { ConfigGrenke } from './config'
import { versStatutCommun } from './statuts'

// L'écriture vers Grenke (demandes, pièces, signatures) reste fermée tant que la variable GRENKE_ECRITURE n'est pas « oui » :
// elle ne s'ouvre qu'après accord et quand Grenke a été prévenu (pas d'environnement de test chez Grenke).
// Modes : fermé (variable absente) ; « test » = seule la demande dont le client a le SIREN GRENKE_SIREN_TEST peut être créée chez Grenke
// (c'est le SIREN annoncé à Grenke pour les essais) ; « oui » = ouvert pour tous les clients.
export function modeEcriture(env: Record<string, string | undefined> = process.env): { mode: 'ferme' | 'test' | 'ouvert'; sirenTest: string | null } {
  const v = env.GRENKE_ECRITURE?.trim().toLowerCase()
  const sirenTest = (env.GRENKE_SIREN_TEST ?? '').replace(/\D/g, '').slice(0, 9)
  if (v === 'oui') return { mode: 'ouvert', sirenTest: null }
  if (v === 'test' && sirenTest.length === 9) return { mode: 'test', sirenTest }
  return { mode: 'ferme', sirenTest: null }
}

// Une demande (identifiée par le SIREN de son client) peut-elle être envoyée / recevoir des pièces chez Grenke dans le mode actuel ?
export function envoiAutorisePourSiret(siret: string, env: Record<string, string | undefined> = process.env): boolean {
  const { mode, sirenTest } = modeEcriture(env)
  if (mode === 'ouvert') return true
  return mode === 'test' && siret.replace(/\D/g, '').slice(0, 9) === sirenTest
}

export const ecritureAutorisee = (env: Record<string, string | undefined> = process.env) => env.GRENKE_ECRITURE?.trim().toLowerCase() === 'oui'

const pasEncore = (action: string) => new ErreurMetier(`${action} : l’envoi réel vers Grenke n’est pas encore activé.`, 501)

type PageContrats = { items: Record<string, any>[]; pageCount: number }
const versContrat = (c: Record<string, any>): ContratFinanceur => ({
  reference: String(c.ContractId ?? ''), etatBrut: String(c.State ?? ''), client: String(c.Lessee?.CompanyName ?? ''),
  loyerMensuelCentimes: typeof c.TotalInstalment === 'number' ? Math.round(c.TotalInstalment * 100) : null,
  dureeMois: Number(c.Period ?? 0), montantFinanceCentimes: typeof c.NetAcquisitionValue === 'number' ? Math.round(c.NetAcquisitionValue * 100) : null,
  dateDebut: c.StartDate ? new Date(c.StartDate) : null, dateFin: c.EndDate ? new Date(c.EndDate) : null,
})
async function toutesLesPages(lire: (p: { page: number; pageSize: number }) => Promise<PageContrats>): Promise<ContratFinanceur[]> {
  const sortie: ContratFinanceur[] = []
  for (let page = 1; page <= 100; page++) {
    const r = await lire({ page, pageSize: 100 })
    sortie.push(...r.items.map(versContrat))
    if (page >= r.pageCount) break
  }
  return sortie
}

// Par défaut la liste de Grenke ne montre que les contrats en cours : on demande aussi les contrats terminés, un état à la fois
// (un état refusé par Grenke est simplement ignoré, il ne doit jamais empêcher la synchronisation).
export const ETATS_CONTRATS_CLOS = ['Expired', 'Rescinded', 'Cancelled', 'Paid']
async function contratsClos(lire: (p: { page: number; pageSize: number; etats: string[] }) => Promise<PageContrats>): Promise<ContratFinanceur[]> {
  const sortie: ContratFinanceur[] = []
  for (const etat of ETATS_CONTRATS_CLOS) {
    try { sortie.push(...(await toutesLesPages(p => lire({ ...p, etats: [etat] })))) } catch (e) { console.error(`Contrats Grenke à l'état ${etat} non lus`, (e as Error).message) }
  }
  return sortie
}
const fusionner = (a: ContratFinanceur[], b: ContratFinanceur[]) => { const m = new Map(a.map(x => [x.reference, x])); for (const x of b) if (!m.has(x.reference)) m.set(x.reference, x); return Array.from(m.values()) }

export function creerConnecteurGrenke(config: ConfigGrenke): Connecteur {
  return {
    code: 'grenke_api',
    creerDemande: async () => { throw pasEncore('Création de la demande') },
    async envoyerPiece(referenceFinanceur, nomFichier, contenu) {
      if (modeEcriture().mode === 'ferme') throw pasEncore('Envoi de la pièce') // le contrôle par SIREN se fait avant, à l'appel (pieces.ts)
      await envoyerDocument(config, referenceFinanceur, { nom: nomFichier, contenu })
    },
    async lancerSignature(referenceFinanceur, signataires) {
      if (modeEcriture().mode === 'ferme') throw pasEncore('Lancement de la signature') // le contrôle par SIREN se fait avant, à l'appel (demandes.ts)
      await demarrerSignature(config, referenceFinanceur, signataires)
    },
    recupererContratSigne: async () => { throw pasEncore('Récupération du contrat signé') },

    async recupererStatut(referenceFinanceur): Promise<EtatDemande | null> {
      const d = await lireDemande(config, referenceFinanceur)
      const c = versStatutCommun(String(d.State ?? ''))
      return c ? { statut: c.statut, etapeSignature: c.etape, detail: c.detail, codeFinanceur: String(d.State), reference: typeof d.RequestId === 'string' ? d.RequestId : undefined } : null
    },

    async trouverDemande(reference) {
      const cle = reference.toUpperCase().replace(/[^A-Z0-9]/g, '')
      for (let page = 1; page <= 50; page++) {
        const r = await listerDemandes(config, { page, pageSize: 100 })
        const x = r.items.find(i => String(i.RequestId ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '') === cle)
        if (x) return { id: String(x.FinancingId), reference: String(x.RequestId), client: String(x.Lessee?.CompanyName ?? ''), montantCentimes: typeof x.FinancingAmount === 'number' ? Math.round(x.FinancingAmount * 100) : null, dureeMois: typeof x.Period === 'number' ? x.Period : null, etat: String(x.State ?? '') }
        if (page >= r.pageCount) break
      }
      return null
    },

    async listerContrats(): Promise<ContratFinanceur[]> {
      const en = await toutesLesPages(p => listerContrats(config, p))
      return fusionner(en, await contratsClos(p => listerContrats(config, p)))
    },
    // Contrats des partenaires rattachés à notre accès en mode « Distributeur » (ex. RS Systems 058).
    async listerContratsDistributeur(): Promise<ContratFinanceur[]> {
      const sortie = new Map<string, ContratFinanceur>()
      for (const partenaire of partenairesDistributeur()) {
        for (const x of await toutesLesPages(p => listerContratsDistributeur(config, partenaire, p))) if (!sortie.has(x.reference)) sortie.set(x.reference, x)
        for (const x of await contratsClos(p => listerContratsDistributeur(config, partenaire, p))) if (!sortie.has(x.reference)) sortie.set(x.reference, x)
      }
      return Array.from(sortie.values())
    },
  }
}
