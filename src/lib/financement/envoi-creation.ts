// À la création d'une demande, il n'y a plus de « brouillon » : dès la saisie terminée, la demande part chez le financeur.
//  - Grenke (API) : envoi réel par l'API, si l'envoi est ouvert (essai sur le SIREN de test, ou ouvert à tous) ;
//  - financeur sans API (Solubail...) : la demande passe à « Envoyée » et le récapitulatif part par e-mail, comme avant à la main.
// Si l'envoi est impossible (fermé, SIREN manquant, refus du financeur...), la demande reste enregistrée en brouillon et on dit pourquoi :
// aucune saisie n'est perdue.
import { prisma } from '@/lib/db'
import { modeEcriture } from './connecteurs/grenke/connecteur'
import { envoyerDemandeAGrenke } from './connecteurs/grenke/envoi'
import { estInterne, type Acteur } from './droits'
import { changerStatut } from './demandes'

export async function envoyerALaCreation(a: Acteur, demandeId: number): Promise<{ envoi: 'ok' | 'non' | 'erreur'; message?: string; financeur?: string }> {
  const d = await prisma.finDemande.findUnique({ where: { id: demandeId }, select: { statut: true, commercialId: true, financeur: { select: { nom: true, connecteur: true } } } })
  if (!d || d.statut !== 'BROUILLON' || (!estInterne(a) && d.commercialId !== a.id)) return { envoi: 'non' }
  const financeur = d.financeur.nom
  try {
    if (d.financeur.connecteur === 'grenke_api') {
      if (modeEcriture().mode === 'ferme') return { envoi: 'non' }
      await envoyerDemandeAGrenke(a, demandeId, { automatique: true })
    } else {
      await changerStatut(a, demandeId, { statut: 'ENVOYEE' })
    }
    return { envoi: 'ok', financeur }
  } catch (e) {
    return { envoi: 'erreur', message: (e as Error).message, financeur }
  }
}
