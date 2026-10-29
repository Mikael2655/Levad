// Recherche d'entreprise par nom, adresse ou numéro : API publique « Recherche d'entreprises » de l'État
// (données SIRENE/INSEE et registre national des entreprises), gratuite et sans clé.
// ATTENTION : le format de réponse ci-dessous est celui de la documentation publique ; il n'a pas pu être vérifié en direct
// depuis l'environnement de développement (accès réseau refusé). Tout champ absent est toléré (lecture défensive).
import { ErreurMetier } from './erreurs'

const URL_API = 'https://recherche-entreprises.api.gouv.fr/search'

export interface Entreprise {
  siren: string
  siret: string // celui du siège
  nom: string
  adresse: string // rue seulement
  codePostal: string
  ville: string
  formeJuridiqueCode: string
  formeJuridique: string
  actif: boolean
  nbEtablissements: number
}

// Libellés des formes les plus courantes (catégories juridiques INSEE). Les autres restent modifiables à la main.
const FORMES: Record<string, string> = {
  '1000': 'Entrepreneur individuel',
  '5498': 'EURL',
  '5499': 'SARL',
  '5510': 'SA',
  '5599': 'SA',
  '5710': 'SAS',
  '5720': 'SASU',
  '6540': 'SCI',
  '9220': 'Association',
}

export const libelleForme = (code: string) => FORMES[code] ?? ''

type Brut = Record<string, any>

function rue(siege: Brut): string {
  const cp = String(siege.code_postal ?? '')
  const ville = String(siege.libelle_commune ?? '')
  let adresse = String(siege.adresse ?? '').trim()
  if (!adresse) {
    adresse = [siege.numero_voie, siege.indice_repetition, siege.type_voie, siege.libelle_voie].filter(Boolean).join(' ')
    if (siege.complement_adresse) adresse = `${siege.complement_adresse} ${adresse}`
    return adresse.trim()
  }
  // « 6 RUE DU PORT 67300 SCHILTIGHEIM » -> on retire le code postal et la ville en fin de ligne
  const fin = `${cp} ${ville}`.trim()
  return fin && adresse.toUpperCase().endsWith(fin.toUpperCase()) ? adresse.slice(0, adresse.length - fin.length).trim() : adresse
}

export function lireResultats(donnees: Brut): Entreprise[] {
  const liste: Brut[] = Array.isArray(donnees?.results) ? donnees.results : []
  return liste
    .filter(r => r && typeof r.siren === 'string')
    .map(r => {
      const siege: Brut = r.siege ?? {}
      const code = String(r.nature_juridique ?? '')
      return {
        siren: r.siren,
        siret: String(siege.siret ?? ''),
        nom: String(r.nom_complet ?? r.nom_raison_sociale ?? ''),
        adresse: rue(siege),
        codePostal: String(siege.code_postal ?? ''),
        ville: String(siege.libelle_commune ?? ''),
        formeJuridiqueCode: code,
        formeJuridique: libelleForme(code),
        actif: r.etat_administratif ? r.etat_administratif === 'A' : true,
        nbEtablissements: Number(r.nombre_etablissements_ouverts ?? r.nombre_etablissements ?? 1),
      }
    })
    .filter(e => e.actif) // les sociétés cessées sont écartées
}

export async function rechercherEntreprises(q: string, appeler: typeof fetch = fetch): Promise<Entreprise[]> {
  const terme = q.trim()
  if (terme.length < 3) return []
  let res: Response
  try {
    res = await appeler(`${URL_API}?q=${encodeURIComponent(terme)}&per_page=10`, { signal: AbortSignal.timeout(6000), headers: { Accept: 'application/json' } })
  } catch {
    throw new ErreurMetier('La recherche d’entreprise ne répond pas. Saisissez les informations à la main.', 502)
  }
  if (res.status === 429) throw new ErreurMetier('Trop de recherches à la suite, réessayez dans un instant.', 429)
  if (!res.ok) throw new ErreurMetier('La recherche d’entreprise est momentanément indisponible. Saisissez les informations à la main.', 502)
  return lireResultats(await res.json().catch(() => ({})))
}

// Liens de vérification pour contrôler une société sur les sites payants / publics (ouverts dans un nouvel onglet).
export const liensVerification = (siren: string) => ({
  pappers: `https://www.pappers.fr/recherche?q=${siren}`,
  societe: `https://www.societe.com/cgi-bin/search?champs=${siren}`,
  infogreffe: `https://www.infogreffe.fr/recherche-entreprise-dirigeant/resultats-de-recherche?q=${siren}`,
})
