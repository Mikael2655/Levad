// Appels typés vers l'API Grenke. Pour l'instant : lecture et simulation seulement (aucune demande n'est créée).
import { ErreurMetier } from '../../erreurs'
import { appelerOk } from './client'
import type { ConfigGrenke } from './config'

type Json = Record<string, any>

const items = (r: unknown): Json[] => {
  const j = r as Json
  if (Array.isArray(j)) return j
  if (j && Array.isArray(j.Items)) return j.Items
  return j ? [j] : []
}

export const echo = (c: ConfigGrenke) => appelerOk(c, 'GET', '/echo')
export const version = (c: ConfigGrenke) => appelerOk(c, 'GET', '/version')

export interface ResultatCalcul {
  dureeMois: number
  loyerMensuelCentimes: number
  brut: Json
}

// Sans durée, Grenke renvoie les loyers pour TOUTES les durées de la liste de conditions (permet de voir lesquelles existent).
export async function calculer(c: ConfigGrenke, p: { montantCentimes: number; dureeMois?: number; periodicite: 'MENSUELLE' | 'TRIMESTRIELLE'; commissionPourcent?: number | null }): Promise<ResultatCalcul[]> {
  const reponse = await appelerOk(c, 'POST', '/basic/v1/calculate', {
    corps: {
      FinancingAmount: p.montantCentimes / 100,
      ...(p.dureeMois ? { Period: p.dureeMois } : {}),
      PaymentFrequency: p.periodicite === 'MENSUELLE' ? 'Monthly' : 'Quarterly',
      ...(c.modePaiement ? { PaymentMethod: c.modePaiement } : {}),
      Currency: 'EUR',
      ProductType: 'ClassicLease',
      ...(p.commissionPourcent != null ? { Commission: p.commissionPourcent } : {}),
    },
  })
  return items(reponse)
    .filter(x => typeof x.Period === 'number' && typeof x.MonthlyTotalInstalment === 'number')
    .map(x => ({ dureeMois: x.Period, loyerMensuelCentimes: Math.round(x.MonthlyTotalInstalment * 100), brut: x }))
}

export interface PageGrenke {
  items: Json[]
  page: number
  pageCount: number
  total: number
}

const page = (r: unknown): PageGrenke => {
  const j = (r ?? {}) as Json
  return { items: items(r), page: Number(j.Page ?? 1), pageCount: Number(j.PageCount ?? 1), total: Number(j.Total ?? items(r).length) }
}

export async function listerDemandes(c: ConfigGrenke, p: { page?: number; pageSize?: number; etats?: string[] } = {}) {
  return page(await appelerOk(c, 'GET', '/basic/v1/requests', { query: { 'requestListParameter.page': p.page ?? 1, 'requestListParameter.pageSize': p.pageSize ?? 50, 'requestListParameter.state': p.etats } }))
}

export async function listerContrats(c: ConfigGrenke, p: { page?: number; pageSize?: number; etats?: string[] } = {}) {
  return page(await appelerOk(c, 'GET', '/basic/v1/contracts', { query: { 'contractListParameter.page': p.page ?? 1, 'contractListParameter.pageSize': p.pageSize ?? 50, 'contractListParameter.state': p.etats } }))
}

export async function lireDemande(c: ConfigGrenke, financingId: string): Promise<Json> {
  if (!/^[0-9a-f-]{36}$/i.test(financingId)) throw new ErreurMetier('Identifiant de demande Grenke invalide.')
  return (await appelerOk(c, 'GET', `/basic/v1/requests/${financingId}`)) as Json
}

export const typesObjets = async (c: ConfigGrenke) => items(await appelerOk(c, 'GET', '/basic/v1/objecttypes')).map(x => ({ id: x.Id as number, nom: x.Name as string }))
export const formesJuridiques = async (c: ConfigGrenke) => items(await appelerOk(c, 'GET', '/basic/v1/legalforms')).map(x => ({ id: x.Id as number, nom: x.Name as string }))

// --- Écriture (désactivée tant que GRENKE_ECRITURE n'est pas « oui ») -------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Dépose un document (Kbis, bilan, RIB...) sur la demande de financement. Le swagger de Grenke ne prévoit qu'une catégorie : 300.
export async function envoyerDocument(c: ConfigGrenke, financingId: string, p: { nom: string; contenu: Buffer }) {
  if (!UUID.test(financingId)) throw new ErreurMetier('Identifiant de demande Grenke invalide.')
  await appelerOk(c, 'POST', `/basic/v1/calculationSets/${financingId}/documents/base64`, {
    corps: { DocumentName: p.nom, DocumentContent: p.contenu.toString('base64'), DocumentCategory: 300 },
    delaiMs: 90_000,
  })
}

// Crée la demande de financement chez Grenke (vraie demande : pas d'environnement de test). Renvoie l'identifiant Grenke (FinancingId).
export async function creerDemandeApi(c: ConfigGrenke, requete: Record<string, unknown>): Promise<string> {
  const r = (await appelerOk(c, 'POST', '/basic/v1/requests', { corps: requete, delaiMs: 90_000 })) as Json
  const id = r?.FinancingId ?? r?.Id ?? r?.financingId
  if (typeof id !== 'string' || !UUID.test(id)) throw new ErreurMetier(`Grenke a répondu sans identifiant de demande exploitable : ${JSON.stringify(r).slice(0, 300)}. Vérifiez sur le portail Grenke si la demande a été créée avant de réessayer.`, 502)
  return id
}

// --- Signature électronique (DocuSign) ------------------------------------------------------------------------------------------

export interface SignataireApi { prenom: string; nom: string; email: string; mobile?: string; civilite?: 'Mr' | 'Ms' }

const versSignataire = (s: SignataireApi, ordre: number) => ({
  Title: s.civilite ?? 'Mr', FirstName: s.prenom, LastName: s.nom, Email: s.email, Culture: 'fr-FR', ...(s.mobile ? { MobileNumber: s.mobile } : {}), SigningOrder: ordre,
})

// Nombre de signataires acceptés par Grenke pour cette demande (DocuSign).
export async function configurationSignature(c: ConfigGrenke, financingId: string) {
  if (!UUID.test(financingId)) throw new ErreurMetier('Identifiant de demande Grenke invalide.')
  const r = (await appelerOk(c, 'GET', `/basic/v1/requests/${financingId}/e-signature/configuration`)) as Json
  return r?.DocuSign as { MinNumberOfCustomerSignees?: number; MaxNumberOfCustomerSignees?: number; MinNumberOfPartnerSignees?: number; MaxNumberOfPartnerSignees?: number } | undefined
}

export async function creerDocumentContrat(c: ConfigGrenke, financingId: string) {
  if (!UUID.test(financingId)) throw new ErreurMetier('Identifiant de demande Grenke invalide.')
  await appelerOk(c, 'POST', `/basic/v1/requests/${financingId}/contractdocument`, { corps: {}, delaiMs: 60_000 })
}

// Lance la signature : le client signe en premier, puis LEVAD. Si Grenke répond qu'il manque le document du contrat, on le crée une fois puis on réessaie.
export async function demarrerSignature(c: ConfigGrenke, financingId: string, p: { client: SignataireApi[]; fournisseur: SignataireApi[] }) {
  if (!UUID.test(financingId)) throw new ErreurMetier('Identifiant de demande Grenke invalide.')
  try {
    const conf = await configurationSignature(c, financingId)
    if (conf) {
      if (conf.MaxNumberOfCustomerSignees != null && p.client.length > conf.MaxNumberOfCustomerSignees) throw new ErreurMetier(`Grenke accepte au plus ${conf.MaxNumberOfCustomerSignees} signataire(s) côté client.`)
      if (conf.MinNumberOfCustomerSignees != null && p.client.length < conf.MinNumberOfCustomerSignees) throw new ErreurMetier(`Grenke exige au moins ${conf.MinNumberOfCustomerSignees} signataire(s) côté client.`)
      if (conf.MaxNumberOfPartnerSignees != null && p.fournisseur.length > conf.MaxNumberOfPartnerSignees) throw new ErreurMetier(`Grenke accepte au plus ${conf.MaxNumberOfPartnerSignees} signataire(s) côté LEVAD.`)
      if (conf.MinNumberOfPartnerSignees != null && p.fournisseur.length < conf.MinNumberOfPartnerSignees) throw new ErreurMetier(`Grenke exige au moins ${conf.MinNumberOfPartnerSignees} signataire(s) côté LEVAD.`)
    }
  } catch (e) {
    if (e instanceof ErreurMetier && /^Grenke (accepte|exige)/.test(e.message)) throw e // contrainte réelle : on s'arrête
    /* configuration illisible : on tente quand même le lancement */
  }
  const corps = {
    CustomerContractSignees: p.client.map((s, i) => versSignataire(s, i + 1)),
    PartnerContractSignees: p.fournisseur.map((s, i) => versSignataire(s, i + 1)),
    ESignatureType: 'DocuSign',
    UseDeliveryConfirmation: false,
  }
  const lancer = () => appelerOk(c, 'POST', `/basic/v1/requests/${financingId}/e-signature`, { corps, delaiMs: 60_000 })
  try {
    await lancer()
  } catch (e) {
    if (!(e instanceof ErreurMetier) || !/(400|409)/.test(e.message) || !/document|contract|contrat/i.test(e.message)) throw e
    await creerDocumentContrat(c, financingId) // 409 « déjà créé » : l'erreur remonte, on laisse l'utilisateur me la transmettre
    await lancer()
  }
}
