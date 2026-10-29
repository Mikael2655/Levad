import type { EtatEcheance, StatutContrat } from '@/lib/financement/echeances'

export const LIBELLES_STATUT_CONTRAT: Record<StatutContrat, string> = { EN_COURS: 'En cours', TACITE: 'Tacite', CLOTURE: 'Clôturé' }

export default function BadgeStatutContrat({ statut, etat, mois }: { statut: StatutContrat; etat: EtatEcheance; mois: number | null }) {
  const proche = statut === 'EN_COURS' && etat === 'PROCHE'
  const classe = statut === 'CLOTURE' ? 'bg-gray-200 text-gray-600' : statut === 'TACITE' ? 'bg-violet-100 text-violet-800' : proche ? 'bg-orange-100 text-orange-800 font-semibold' : 'bg-green-50 text-green-800'
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${classe}`} title={proche && mois !== null ? `${mois} mois restant${mois > 1 ? 's' : ''} · à renouveler` : undefined}>
      {LIBELLES_STATUT_CONTRAT[statut]}{proche ? ' · à renouveler' : ''}
    </span>
  )
}
