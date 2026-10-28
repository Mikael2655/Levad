// Construction de la demande de financement au format de l'API Grenke (POST /basic/v1/requests). Fonctions pures, sans réseau.
//
// Point clé : Grenke finance le MONTANT RÉEL (celui que le commercial ne voit jamais) et exige un prix par matériel dont la
// somme est exactement égale à ce montant. On répartit donc le montant réel sur les lignes de la demande.
import { ErreurMetier } from '../../erreurs'
import { numeroEntrepriseValide } from '../../siren'

export interface LigneDemande {
  designation: string
  quantite: number
  constructeur: string | null
  typeBien: string | null // identifiant de type de bien chez Grenke (ex. « 7 »), sinon type par défaut
  montantHtCentimes: number | null // montant de la ligne (sert de poids pour la répartition)
}

export interface DemandePourGrenke {
  raisonSociale: string
  siret: string
  adresse: string
  codePostal: string | null
  ville: string | null
  pays: string
  contactEmail: string
  contactTel: string | null
  dureeMois: number
  periodicite: 'MENSUELLE' | 'TRIMESTRIELLE'
  montantReelCentimes: number
  lignes: LigneDemande[]
}

export interface OptionsGrenke {
  modePaiement: 'Invoice' | 'Direct Debit'
  commissionPourcent: number | null // ex. 2 pour 2 % ; null = valeur par défaut du profil Grenke
  typeObjetParDefaut: number // 7 = Photocopier
  formatIdentifiant: 'SIREN' | 'SIRET'
}

export interface ObjetRepartition {
  designation: string
  constructeur: string | null
  typeBien: string | null
  quantite: number
  prixUnitaireCentimes: number
}

// Répartit un total (en centimes) sur les lignes, proportionnellement à leur montant (ou à leur quantité si les montants
// manquent), puis découpe chaque ligne pour que quantité x prix unitaire retombe EXACTEMENT sur sa part, au centime près.
export function repartirMontant(totalCentimes: number, lignes: LigneDemande[]): ObjetRepartition[] {
  const avecMontants = lignes.every(l => (l.montantHtCentimes ?? 0) > 0)
  const poids = lignes.map(l => BigInt(avecMontants ? l.montantHtCentimes! : l.quantite))
  const somme = poids.reduce((a, b) => a + b, BigInt(0))
  const total = BigInt(totalCentimes)
  // parts entières + plus forts restes
  const parts = poids.map(p => (total * p) / somme)
  const restes = poids.map((p, i) => ({ i, reste: (total * p) % somme }))
  let manque = Number(total - parts.reduce((a, b) => a + b, BigInt(0)))
  restes.sort((a, b) => (b.reste > a.reste ? 1 : b.reste < a.reste ? -1 : a.i - b.i))
  for (const { i } of restes) {
    if (manque <= 0) break
    parts[i] += BigInt(1)
    manque--
  }
  const objets: ObjetRepartition[] = []
  lignes.forEach((l, i) => {
    const part = Number(parts[i])
    const base = Math.floor(part / l.quantite)
    const reste = part - base * l.quantite // nombre d'unités qui portent 1 centime de plus
    const commun = { designation: l.designation, constructeur: l.constructeur, typeBien: l.typeBien }
    if (l.quantite - reste > 0) objets.push({ ...commun, quantite: l.quantite - reste, prixUnitaireCentimes: base })
    if (reste > 0) objets.push({ ...commun, quantite: reste, prixUnitaireCentimes: base + 1 })
  })
  return objets
}

const euros = (centimes: number) => Math.round(centimes) / 100

function codePays(pays: string): string {
  const p = pays.trim()
  if (/^[A-Za-z]{2}$/.test(p)) return p.toUpperCase()
  if (/^france$/i.test(p)) return 'FR'
  throw new ErreurMetier(`Pays non reconnu pour Grenke : « ${pays} » (code à 2 lettres attendu, ex. FR).`)
}

export function construireDemandeGrenke(d: DemandePourGrenke, o: OptionsGrenke): { requete: Record<string, unknown>; avertissements: string[] } {
  const problemes: string[] = []
  const avertissements: string[] = []
  if (!numeroEntrepriseValide(d.siret)) problemes.push('SIREN / SIRET valide obligatoire.')
  if (!d.adresse.trim()) problemes.push('adresse du client obligatoire.')
  if (!d.codePostal?.trim() || !d.ville?.trim()) problemes.push('code postal et ville du client obligatoires.')
  if (!(d.montantReelCentimes > 0)) problemes.push('montant financé invalide.')
  if (d.lignes.length === 0 || d.lignes.some(l => !l.designation.trim() || !Number.isInteger(l.quantite) || l.quantite < 1)) problemes.push('au moins une ligne de matériel valide.')
  if (problemes.length) throw new ErreurMetier(`Demande incomplète pour Grenke : ${problemes.join(' ')}`)

  const chiffres = d.siret.replace(/\D/g, '')
  const objets = repartirMontant(d.montantReelCentimes, d.lignes)
  const somme = objets.reduce((s, x) => s + x.quantite * x.prixUnitaireCentimes, 0)
  if (somme !== d.montantReelCentimes) throw new Error(`Répartition incohérente (${somme} ≠ ${d.montantReelCentimes})`) // ne doit jamais arriver

  const financingObjects = objets.map(x => {
    const id = x.typeBien && /^\d+$/.test(x.typeBien.trim()) ? Number(x.typeBien.trim()) : null
    if (id === null) avertissements.push(`Type de bien non précisé pour « ${x.designation} » : type n° ${o.typeObjetParDefaut} utilisé par défaut.`)
    return {
      Quantity: x.quantite,
      ObjectTypeId: id ?? o.typeObjetParDefaut,
      Manufacturer: x.constructeur?.trim() || 'Other',
      NetPricePerObject: euros(x.prixUnitaireCentimes),
      Details: x.designation,
    }
  })

  const lessee: Record<string, unknown> = {
    CompanyName: d.raisonSociale,
    ExternalId: o.formatIdentifiant === 'SIREN' ? chiffres.slice(0, 9) : chiffres,
    Addresses: [{ Line1: d.adresse, PostCode: d.codePostal, City: d.ville, Country: codePays(d.pays), Type: 'Main' }],
  }
  if (d.contactEmail) lessee.Email = d.contactEmail
  if (d.contactTel) lessee.Telephones = [{ Number: d.contactTel, Type: 'Phone' }]

  return {
    requete: {
      FinancingAmount: euros(d.montantReelCentimes),
      Period: d.dureeMois,
      PaymentFrequency: d.periodicite === 'MENSUELLE' ? 'Monthly' : 'Quarterly',
      PaymentMethod: o.modePaiement,
      Currency: 'EUR',
      RecurringService: 0,
      ...(o.commissionPourcent !== null ? { Commission: o.commissionPourcent } : {}),
      ProductType: 'ClassicLease',
      HasRepurchase: false,
      Lessee: lessee,
      FinancingObjects: financingObjects,
    },
    avertissements,
  }
}
