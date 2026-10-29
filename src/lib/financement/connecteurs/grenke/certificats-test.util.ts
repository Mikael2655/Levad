// Outil de TEST uniquement : fabrique une autorité, un serveur et un client avec OpenSSL, pour tester la connexion par certificat.
import { execFileSync } from 'child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export interface JeuCertificats {
  dossier: string
  ca: string
  serveur: { cert: string; key: string }
  client: { cert: string; key: string; certDer: Buffer }
  nettoyer: () => void
}

const openssl = (dossier: string, ...args: string[]) => execFileSync('openssl', args, { cwd: dossier, stdio: 'pipe' })

export function fabriquerCertificats(cnClient = '00000000-1111-2222-3333-444444444444', jours = 2): JeuCertificats {
  const d = mkdtempSync(join(tmpdir(), 'levad-certs-'))
  openssl(d, 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'ca.key', '-out', 'ca.pem', '-subj', '/CN=Test CA', '-days', String(jours))
  writeFileSync(join(d, 'serveur.ext'), 'subjectAltName=DNS:localhost,IP:127.0.0.1\n')
  writeFileSync(join(d, 'client.ext'), 'extendedKeyUsage=clientAuth\n')
  openssl(d, 'req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'serveur.key', '-out', 'serveur.csr', '-subj', '/CN=localhost')
  openssl(d, 'x509', '-req', '-in', 'serveur.csr', '-CA', 'ca.pem', '-CAkey', 'ca.key', '-CAcreateserial', '-out', 'serveur.pem', '-days', String(jours), '-extfile', 'serveur.ext')
  openssl(d, 'req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'client.key', '-out', 'client.csr', '-subj', `/CN=${cnClient}/OU=Production`)
  openssl(d, 'x509', '-req', '-in', 'client.csr', '-CA', 'ca.pem', '-CAkey', 'ca.key', '-CAcreateserial', '-out', 'client.pem', '-days', String(jours), '-extfile', 'client.ext')
  openssl(d, 'x509', '-in', 'client.pem', '-outform', 'der', '-out', 'client.der')
  const lire = (f: string) => readFileSync(join(d, f), 'utf8')
  return {
    dossier: d,
    ca: lire('ca.pem'),
    serveur: { cert: lire('serveur.pem'), key: lire('serveur.key') },
    client: { cert: lire('client.pem'), key: lire('client.key'), certDer: readFileSync(join(d, 'client.der')) },
    nettoyer: () => rmSync(d, { recursive: true, force: true }),
  }
}
