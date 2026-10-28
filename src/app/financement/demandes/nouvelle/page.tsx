import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { estInterne } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import FormulaireDemande, { LIGNE_VIDE, type ValeursFormulaire } from '../FormulaireDemande'

export const dynamic = 'force-dynamic'

export default async function NouvelleDemande() {
  const u = await exigerUtilisateur()
  const interne = estInterne(u)
  const financeurs = (await listerFinanceurs()).filter(f => f.actif)
  const commerciaux = interne ? (await listerUtilisateurs()).filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN')).map(x => ({ id: x.id, nom: `${x.prenom} ${x.nom}` })) : null
  const initial: ValeursFormulaire = {
    financeurId: financeurs.length === 1 ? String(financeurs[0].id) : '',
    commercialId: u.role === 'ADMIN' ? String(u.id) : '',
    raisonSociale: '', siret: '', formeJuridique: '', adresse: '', codePostal: '', ville: '', pays: 'France',
    contactPrenom: '', contactNom: '', contactEmail: '', contactTel: '',
    dureeMois: '', periodicite: 'TRIMESTRIELLE', saisie: 'loyer', valeur: '',
    lignes: [{ ...LIGNE_VIDE }],
  }
  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Nouvelle demande de financement</h1>
      <FormulaireDemande mode="creation" initial={initial} financeurs={financeurs.map(f => ({ id: f.id, nom: f.nom }))} commerciaux={commerciaux} interne={interne} />
    </main>
  )
}
