import type { EtatEcheance, StatutContrat } from '@/lib/financement/echeances'

export const LIBELLES_STATUT_CONTRAT: Record<StatutContrat, string> = { EN_COURS: 'En cours', TACITE: 'Tacite', CLOTURE: 'Clôturé' }

export default function BadgeStatutContrat({ statut, etat, mois }: { statut: StatutContrat; etat: EtatEcheance; mois: number | null }) {
  const proche = statut === 'EN_COURS' && etat === 'PROCHE'
  const [classe, point] =
    statut === 'CLOTURE' ? ['bg-gray-100 text-gray-700 ring-gray-500/20', 'bg-gray-400']
    : statut === 'TACITE' ? ['bg-sky-50 text-sky-800 ring-sky-600/20', 'bg-sky-500']
    : proche ? ['bg-amber-50 text-amber-800 ring-amber-600/20', 'bg-amber-500']
    : ['bg-emerald-50 text-emerald-800 ring-emerald-600/20', 'bg-emerald-500']
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classe}`} title={proche && mois !== null ? `${mois} mois restant${mois > 1 ? 's' : ''} · à renouveler` : undefined}>
      <span className={`w-1.5 h-1.5 rounded-full ${point}`} />
      {LIBELLES_STATUT_CONTRAT[statut]}{proche ? ' · à renouveler' : ''}
    </span>
  )
}
