import { LIBELLES_STATUT } from '@/lib/financement/statuts'
import type { Statut } from '@/lib/financement/droits'

// Étiquette de statut : trois familles de couleur (en attente = ambre, accepté = vert, refusé = rouge), le reste en gris.
// Les statuts et leurs libellés ne changent pas ; seule la présentation est colorée.
type Famille = 'attente' | 'accepte' | 'refuse' | 'neutre'
const FAMILLES: Record<string, Famille> = {
  BROUILLON: 'neutre', ENVOYEE: 'attente', INFOS_MANQUANTES: 'attente', PRETE_A_SIGNER: 'accepte', EN_SIGNATURE: 'accepte', SIGNEE: 'accepte', REFUSEE: 'refuse', ANNULEE: 'neutre',
}
export const STYLE_FAMILLE: Record<Famille, string> = {
  attente: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  accepte: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  refuse: 'bg-red-50 text-red-700 ring-red-600/20',
  neutre: 'bg-gray-100 text-gray-700 ring-gray-500/20',
}
export const POINT_FAMILLE: Record<Famille, string> = { attente: 'bg-amber-500', accepte: 'bg-emerald-500', refuse: 'bg-red-500', neutre: 'bg-gray-400' }

export default function BadgeStatut({ statut }: { statut: string }) {
  const f = FAMILLES[statut] ?? 'neutre'
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STYLE_FAMILLE[f]} ${statut === 'ANNULEE' ? 'line-through' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${POINT_FAMILLE[f]}`} />
      {LIBELLES_STATUT[statut as Statut] ?? statut}
    </span>
  )
}
