import { notFound } from 'next/navigation'
import { lireDemande } from '@/lib/financement/acces'
import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { estInterne, peutModifier } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import FormulaireDemande, { type ValeursFormulaire } from '../../FormulaireDemande'

export const dynamic = 'force-dynamic'

const eur = (c: number | null) => (c == null ? '' : String(c / 100).replace('.', ','))

export default async function ModifierDemande({ params }: { params: { id: string } }) {
  const u = await exigerUtilisateur()
  const d = await lireDemande(u, Number(params.id))
  if (!d || !peutModifier(u, d)) notFound()
  const interne = estInterne(u)
  const financeurs = (await listerFinanceurs()).filter(f => f.actif || f.id === d.financeurId)
  const commerciaux = interne ? (await listerUtilisateurs()).filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN')).map(x => ({ id: x.id, nom: `${x.prenom} ${x.nom}` })) : null
  const initial: ValeursFormulaire = {
    financeurId: String(d.financeurId), commercialId: String(d.commercialId),
    raisonSociale: d.raisonSociale, siret: d.siret, formeJuridique: d.formeJuridique ?? '', adresse: d.adresse, codePostal: d.codePostal ?? '', ville: d.ville ?? '', pays: d.pays,
    contactPrenom: d.contactPrenom, contactNom: d.contactNom, contactEmail: d.contactEmail, contactTel: d.contactTel ?? '',
    dureeMois: String(d.dureeMois), periodicite: d.periodicite as ValeursFormulaire['periodicite'], saisie: 'loyer', valeur: eur(d.loyerCentimes),
    lignes: d.lignes.map(l => ({ designation: l.designation, quantite: String(l.quantite), montantHt: eur(l.montantHtCentimes), typeBien: l.typeBien ?? '', constructeur: l.constructeur ?? '' })),
  }
  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Modifier {d.reference}</h1>
      <FormulaireDemande mode="modification" demandeId={d.id} initial={initial} financeurs={financeurs.map(f => ({ id: f.id, nom: f.nom }))} commerciaux={commerciaux} interne={interne} />
    </main>
  )
}
