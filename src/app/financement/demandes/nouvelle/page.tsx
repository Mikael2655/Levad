import { listerFinanceurs, listerUtilisateurs } from '@/lib/financement/admin'
import { estInterne } from '@/lib/financement/droits'
import { exigerUtilisateur } from '@/lib/financement/garde'
import FormulaireDemande, { type ValeursFormulaire } from '../FormulaireDemande'
import { nouvelleLigne } from '../lignes'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function NouvelleDemande({ searchParams }: { searchParams: { rachat?: string } }) {
  const u = await exigerUtilisateur()
  const interne = estInterne(u)
  const financeurs = (await listerFinanceurs()).filter(f => f.actif)
  const commerciaux = interne ? (await listerUtilisateurs()).filter(x => x.actif && (x.role === 'COMMERCIAL' || x.role === 'ADMIN')).map(x => ({ id: x.id, nom: `${x.prenom} ${x.nom}` })) : null
  // Renouvellement : on part du solde d'un contrat (le client, le commercial et le financeur sont repris du contrat)
  const rachatId = Number(searchParams.rachat) || null
  const rachat = rachatId
    ? await prisma.finRachat.findFirst({
        where: { id: rachatId, statut: { in: ['SIMULEE', 'ENVOYEE'] }, demande: null, contrat: interne ? {} : { commercialId: u.id } },
        include: { contrat: { include: { demande: true } } },
      })
    : null
  const origine = rachat?.contrat.demande ?? null
  const initial: ValeursFormulaire = {
    financeurId: rachat && rachat.type === 'RENOUVELANT' && financeurs.some(f => f.id === rachat.contrat.financeurId) ? String(rachat.contrat.financeurId) : financeurs.length === 1 ? String(financeurs[0].id) : '',
    commercialId: rachat && interne ? String(rachat.contrat.commercialId) : u.role === 'ADMIN' ? String(u.id) : '',
    raisonSociale: rachat?.contrat.raisonSociale ?? '', siret: rachat?.contrat.siret ?? '', formeJuridique: origine?.formeJuridique ?? '', adresse: origine?.adresse ?? '', codePostal: origine?.codePostal ?? '', ville: origine?.ville ?? '', pays: origine?.pays ?? 'France',
    contactPrenom: origine?.contactPrenom ?? '', contactNom: origine?.contactNom ?? '', contactEmail: origine?.contactEmail ?? '', contactTel: origine?.contactTel ?? '',
    rachatId: rachat ? String(rachat.id) : '',
    dureeMois: '', periodicite: 'TRIMESTRIELLE', saisie: 'loyer', valeur: '',
    lignes: [nouvelleLigne()],
  }
  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{rachat ? 'Demande de renouvellement' : 'Nouvelle demande de financement'}</h1>
      <FormulaireDemande mode="creation" rachat={rachat ? { id: rachat.id, totalCentimes: rachat.totalCentimes, type: rachat.type, contrat: rachat.contrat.raisonSociale } : null} initial={initial} financeurs={financeurs.map(f => ({ id: f.id, nom: f.nom }))} commerciaux={commerciaux} interne={interne} />
    </main>
  )
}
