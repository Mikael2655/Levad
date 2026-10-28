import https from 'https'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { calculer, echo, listerContrats, listerDemandes } from './api'
import { appelerOk, appelGrenke } from './client'
import type { ConfigGrenke } from './config'
import { fabriquerCertificats, type JeuCertificats } from './certificats-test.util'
import { creerConnecteurGrenke } from './connecteur'

// Faux serveur Grenke : exige un certificat client signé par l'autorité de test, comme le vrai.
let c: JeuCertificats
let intrus: JeuCertificats
let serveur: https.Server
let base: string
const vues: { methode?: string; url?: string; cn?: string; corps?: string }[] = []

beforeAll(async () => {
  c = fabriquerCertificats('cccccccc-0000-0000-0000-00000000000c')
  intrus = fabriquerCertificats('dddddddd-0000-0000-0000-00000000000d') // autre autorité : ne doit pas passer
  serveur = https.createServer({ key: c.serveur.key, cert: c.serveur.cert, ca: c.ca, requestCert: true, rejectUnauthorized: true }, (req, res) => {
    const morceaux: Buffer[] = []
    req.on('data', m => morceaux.push(m))
    req.on('end', () => {
      const cn = (req.socket as any).getPeerCertificate()?.subject?.CN
      vues.push({ methode: req.method, url: req.url, cn, corps: Buffer.concat(morceaux).toString() })
      const reponse = (code: number, json: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)) }
      if (req.url === '/echo') return reponse(200, '2026-10-29T10:00:00Z')
      if (req.url === '/basic/v1/calculate') return reponse(200, { Items: [{ Period: 36, MonthlyTotalInstalment: 316.02 }, { Period: 63, MonthlyTotalInstalment: 192 }] })
      if (req.url?.startsWith('/basic/v1/requests/11111111-1111-1111-1111-111111111111')) return reponse(200, { FinancingId: '11111111-1111-1111-1111-111111111111', State: 'AwaitingCustomerSignature' })
      if (req.url?.startsWith('/basic/v1/requests/22222222-2222-2222-2222-222222222222')) return reponse(404, { Message: 'Not found' })
      if (req.url?.startsWith('/basic/v1/requests')) return reponse(200, { Items: [{ State: 'ReadyToSign' }], Page: 1, PageSize: 50, PageCount: 1, Total: 1 })
      if (req.url?.startsWith('/basic/v1/contracts')) {
        const page = Number(new URL(req.url, 'https://x').searchParams.get('contractListParameter.page'))
        return reponse(200, { Items: [{ ContractId: `100-0000${page}`, State: 'RunningContract', Lessee: { CompanyName: `CLIENT ${page}` }, TotalInstalment: 526, Period: 63, NetAcquisitionValue: 27253.89, StartDate: '2026-07-01T00:00:00Z', EndDate: '2031-10-01T00:00:00Z' }], Page: page, PageSize: 1, PageCount: 2, Total: 2 })
      }
      return reponse(403, { Message: 'Forbidden' })
    })
  })
  await new Promise<void>(ok => serveur.listen(0, '127.0.0.1', ok))
  base = `https://localhost:${(serveur.address() as AddressInfo).port}`
})
afterAll(() => { serveur.close(); c.nettoyer(); intrus.nettoyer() })

const config = (): ConfigGrenke => ({ urlBase: base, cert: c.client.cert, key: c.client.key, ca: c.ca })

describe('connexion à l’API par certificat (serveur local)', () => {
  it('le serveur reçoit bien le certificat du client (identifiant API dans le CN)', async () => {
    expect(await echo(config())).toBe('2026-10-29T10:00:00Z')
    expect(vues.at(-1)).toMatchObject({ methode: 'GET', url: '/echo', cn: 'cccccccc-0000-0000-0000-00000000000c' })
  })
  it('un certificat d’une autre autorité est refusé, avec un message clair', async () => {
    await expect(appelGrenke({ ...config(), cert: intrus.client.cert, key: intrus.client.key }, 'GET', '/echo')).rejects.toThrow(/connexion sécurisée|certificat|interrompue/i)
  })
  it('serveur injoignable : message clair', async () => {
    await expect(appelGrenke({ ...config(), urlBase: 'https://localhost:1' }, 'GET', '/echo', { delaiMs: 2000 })).rejects.toThrow(/refusée|interrompue|injoignable/i)
  })
  it('simulation de loyer sans durée : toutes les durées renvoyées, loyers en centimes', async () => {
    const r = await calculer(config(), { montantCentimes: 1000000, periodicite: 'TRIMESTRIELLE' })
    expect(r.map(x => [x.dureeMois, x.loyerMensuelCentimes])).toEqual([[36, 31602], [63, 19200]])
    const envoye = JSON.parse(vues.at(-1)!.corps!)
    expect(envoye).toEqual({ FinancingAmount: 10000, PaymentFrequency: 'Quarterly', Currency: 'EUR', ProductType: 'ClassicLease' }) // pas de Period : toutes les durées
  })
  it('listes : noms de paramètres exacts du Swagger, pagination suivie', async () => {
    await listerDemandes(config(), { etats: ['ReadyToSign', 'MissingInfo'] })
    expect(vues.at(-1)!.url).toContain('requestListParameter.state=ReadyToSign&requestListParameter.state=MissingInfo')
    const contrats = await creerConnecteurGrenke(config()).listerContrats()
    expect(contrats.map(x => x.reference)).toEqual(['100-00001', '100-00002'])
    expect(contrats[0]).toMatchObject({ etatBrut: 'RunningContract', loyerMensuelCentimes: 52600, montantFinanceCentimes: 2725389, dureeMois: 63 })
    expect(contrats[0].dateFin?.toISOString().slice(0, 10)).toBe('2031-10-01')
    await listerContrats(config(), { page: 1, pageSize: 1 })
  })
  it('statut d’une demande lu chez Grenke et traduit ; 404 et 403 expliqués ; écriture pas encore activée', async () => {
    const connecteur = creerConnecteurGrenke(config())
    expect(await connecteur.recupererStatut('11111111-1111-1111-1111-111111111111')).toMatchObject({ statut: 'EN_SIGNATURE', etapeSignature: 'ATTENTE_CLIENT', codeFinanceur: 'AwaitingCustomerSignature' })
    await expect(connecteur.recupererStatut('22222222-2222-2222-2222-222222222222')).rejects.toThrow('404')
    await expect(connecteur.recupererStatut('pas-un-uuid')).rejects.toThrow('invalide')
    await expect(appelerOk(config(), 'GET', '/interdit')).rejects.toThrow(/403/)
    await expect(connecteur.creerDemande(1)).rejects.toThrow('pas encore activé')
  })
})
