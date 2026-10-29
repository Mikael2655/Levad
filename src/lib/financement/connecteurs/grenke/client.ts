// Client HTTP de l'API Grenke : authentification par certificat client (mTLS). Aucune donnée n'est journalisée.
import https from 'https'
import { rootCertificates } from 'tls'
import { ErreurMetier } from '../../erreurs'
import type { ConfigGrenke } from './config'

export interface ReponseGrenke {
  status: number
  json: unknown
  texte: string
}

export interface OptionsAppel {
  query?: Record<string, string | number | (string | number)[] | undefined>
  corps?: unknown
  delaiMs?: number
}

function messageReseau(e: NodeJS.ErrnoException): string {
  const code = e.code ?? ''
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(code)) return 'Adresse de l’API Grenke introuvable (vérifiez GRENKE_API_URL).'
  if (['ECONNREFUSED', 'ECONNRESET'].includes(code)) return 'Connexion à l’API Grenke refusée ou interrompue.'
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || e.message === 'timeout') return 'L’API Grenke ne répond pas (délai dépassé).'
  if (/certificate|ssl|tls|handshake|alert/i.test(`${code} ${e.message}`)) return `Échec de la connexion sécurisée (certificat refusé ou non reconnu) : ${e.message}`
  return `Erreur réseau vers l’API Grenke : ${e.message}`
}

export function appelGrenke(config: ConfigGrenke, methode: 'GET' | 'POST' | 'PUT' | 'PATCH', chemin: string, o: OptionsAppel = {}): Promise<ReponseGrenke> {
  const url = new URL(config.urlBase + chemin)
  for (const [k, v] of Object.entries(o.query ?? {})) {
    for (const x of Array.isArray(v) ? v : [v]) if (x !== undefined && x !== '') url.searchParams.append(k, String(x))
  }
  const charge = o.corps === undefined ? undefined : JSON.stringify(o.corps)
  // ca : on AJOUTE les autorités fournies (Grenke) aux autorités publiques habituelles, on ne les remplace pas
  const agent = new https.Agent({ cert: config.cert, key: config.key, passphrase: config.passphrase, ca: config.ca ? [...rootCertificates, config.ca] : undefined })
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: methode, agent, timeout: o.delaiMs ?? 20_000, headers: { Accept: 'application/json', ...(charge ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(charge) } : {}) } },
      res => {
        const morceaux: Buffer[] = []
        res.on('data', m => morceaux.push(m))
        res.on('end', () => {
          const texte = Buffer.concat(morceaux).toString('utf8')
          let json: unknown = null
          try { json = texte ? JSON.parse(texte) : null } catch { /* réponse non JSON : on garde le texte */ }
          agent.destroy()
          resolve({ status: res.statusCode ?? 0, json, texte })
        })
      },
    )
    req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })))
    req.on('error', e => { agent.destroy(); reject(new ErreurMetier(messageReseau(e), 502)) })
    if (charge) req.write(charge)
    req.end()
  })
}

// Appel dont on attend un succès : traduit les erreurs de l'API en message lisible.
export async function appelerOk(config: ConfigGrenke, methode: 'GET' | 'POST' | 'PUT' | 'PATCH', chemin: string, o: OptionsAppel = {}): Promise<unknown> {
  const r = await appelGrenke(config, methode, chemin, o)
  if (r.status >= 200 && r.status < 300) return r.json ?? r.texte
  const detail = typeof r.json === 'object' && r.json ? JSON.stringify(r.json).slice(0, 400) : r.texte.slice(0, 400)
  if (r.status === 403) throw new ErreurMetier(`Accès refusé par Grenke (403) : le certificat n’est pas reconnu ou n’a pas les droits. ${detail}`, 502)
  if (r.status === 404) throw new ErreurMetier(`Introuvable chez Grenke (404). ${detail}`, 502)
  if (r.status === 400) throw new ErreurMetier(`Grenke a refusé les données (400) : ${detail}`, 502)
  throw new ErreurMetier(`Erreur de Grenke (${r.status}) : ${detail}`, 502)
}
