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
