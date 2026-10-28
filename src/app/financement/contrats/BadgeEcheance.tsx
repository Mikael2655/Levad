import type { EtatEcheance } from '@/lib/financement/echeances'

export default function BadgeEcheance({ etat, mois }: { etat: EtatEcheance; mois: number | null }) {
  const [classe, texte] =
    etat === 'ECHU' ? ['bg-gray-200 text-gray-600', 'Échu']
    : etat === 'PROCHE' ? ['bg-orange-100 text-orange-800 font-semibold', `${mois} mois restant${(mois ?? 0) > 1 ? 's' : ''} · à renouveler`]
    : etat === 'EN_COURS' ? ['bg-green-50 text-green-800', `${mois} mois`]
    : ['bg-amber-50 text-amber-800', 'Date à renseigner']
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${classe}`}>{texte}</span>
}
