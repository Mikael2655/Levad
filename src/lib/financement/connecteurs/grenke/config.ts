// Configuration de l'API Grenke : lue dans les variables d'environnement de Vercel (jamais dans le code ni la base).
//   GRENKE_API_URL          adresse de l'API : https://api.grenkeonline.com pour la production (guide Postman de Grenke)
//   GRENKE_CERT_BASE64      le certificat téléchargé sur le portail, encodé en base64 (format PEM ou DER)
//   GRENKE_KEY_BASE64       la clé privée (fichier .key créé avec la demande de certificat), encodée en base64
//   GRENKE_KEY_PASSPHRASE   (facultatif) mot de passe de la clé, si elle en a un
//   GRENKE_CA_BASE64        (probablement nécessaire) les certificats publics de Grenke (« GRENKE Public Root CA » et « GRENKE Public Leasing Api CA »,
//                           à télécharger sur pki.grenkeonline.com), chacun encodé en base64, séparés par une virgule
//   GRENKE_PAYMENT_METHOD   (envoi réel de demandes) « Invoice » ou « Direct Debit »
import { X509Certificate, createPrivateKey } from 'crypto'

export interface ConfigGrenke {
  urlBase: string
  cert: string // PEM
  key: string // PEM
  passphrase?: string
  ca?: string // autorités de confiance supplémentaires (PEM) : celles de Grenke, ou le faux serveur des tests
  modePaiement?: 'Invoice' | 'Direct Debit'
}

export const VARIABLES_GRENKE = ['GRENKE_API_URL', 'GRENKE_CERT_BASE64', 'GRENKE_KEY_BASE64'] as const

// Le portail Grenke fournit un certificat au format DER (binaire) ; Node attend du PEM (texte). On convertit automatiquement.
export function certificatEnPem(contenu: Buffer): string {
  const texte = contenu.toString('utf8')
  if (texte.includes('-----BEGIN CERTIFICATE-----')) return texte.trim() + '\n'
  const base64 = contenu.toString('base64').match(/.{1,64}/g)!.join('\n')
  return `-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----\n`
}

export interface ResultatConfig {
  prete: boolean
  manquantes: string[]
  problemes: string[]
  config?: ConfigGrenke
  certificat?: { sujet: string; expireLe: Date; joursRestants: number }
}

export function lireConfigGrenke(env: Record<string, string | undefined> = process.env, maintenant = new Date()): ResultatConfig {
  const manquantes = VARIABLES_GRENKE.filter(v => !env[v]?.trim())
  if (manquantes.length) return { prete: false, manquantes: [...manquantes], problemes: [] }
  const problemes: string[] = []

  let urlBase = env.GRENKE_API_URL!.trim().replace(/\/+$/, '')
  try {
    if (new URL(urlBase).protocol !== 'https:') problemes.push('GRENKE_API_URL doit commencer par https://')
  } catch {
    problemes.push('GRENKE_API_URL n’est pas une adresse valide.')
    urlBase = ''
  }

  let cert = ''
  let key = ''
  let certificat: ResultatConfig['certificat']
  try {
    cert = certificatEnPem(Buffer.from(env.GRENKE_CERT_BASE64!.trim(), 'base64'))
    const x509 = new X509Certificate(cert)
    const expireLe = new Date(x509.validTo)
    certificat = { sujet: x509.subject.replace(/\n/g, ', '), expireLe, joursRestants: Math.floor((expireLe.getTime() - maintenant.getTime()) / 86_400_000) }
    if (certificat.joursRestants < 0) problemes.push('Le certificat est expiré.')
    key = Buffer.from(env.GRENKE_KEY_BASE64!.trim(), 'base64').toString('utf8')
    if (!key.includes('PRIVATE KEY')) problemes.push('GRENKE_KEY_BASE64 ne contient pas une clé privée au format PEM.')
    else if (!x509.checkPrivateKey(createPrivateKey({ key, passphrase: env.GRENKE_KEY_PASSPHRASE || undefined }))) problemes.push('La clé privée ne correspond pas au certificat (ce n’est pas la clé créée avec cette demande de certificat).')
  } catch (e) {
    problemes.push(`Certificat ou clé illisible (${(e as Error).message.split('\n')[0]}).`)
  }

  let ca: string | undefined
  const brutsCa = (env.GRENKE_CA_BASE64 ?? '').split(/[\s,;]+/).filter(Boolean)
  if (brutsCa.length) {
    try {
      ca = brutsCa.map(b => { const pem = certificatEnPem(Buffer.from(b, 'base64')); new X509Certificate(pem); return pem }).join('')
    } catch (e) {
      problemes.push(`GRENKE_CA_BASE64 illisible (${(e as Error).message.split('\n')[0]}) : un certificat public de Grenke est mal copié.`)
    }
  }

  const mode = env.GRENKE_PAYMENT_METHOD?.trim()
  if (mode && mode !== 'Invoice' && mode !== 'Direct Debit') problemes.push('GRENKE_PAYMENT_METHOD doit valoir « Invoice » ou « Direct Debit ».')
  if (problemes.length) return { prete: false, manquantes: [], problemes, certificat }
  return {
    prete: true, manquantes: [], problemes: [], certificat,
    config: { urlBase, cert, key, passphrase: env.GRENKE_KEY_PASSPHRASE || undefined, ca, modePaiement: mode as ConfigGrenke['modePaiement'] },
  }
}
