import { LIBELLES_STATUT } from '@/lib/financement/statuts'
import type { Statut } from '@/lib/financement/droits'

const COULEURS: Record<string, string> = {
  BROUILLON: 'bg-gray-100 text-gray-700',
  ENVOYEE: 'bg-blue-100 text-blue-800',
  INFOS_MANQUANTES: 'bg-amber-100 text-amber-800',
  PRETE_A_SIGNER: 'bg-emerald-100 text-emerald-800',
  REFUSEE: 'bg-red-100 text-red-800',
  EN_SIGNATURE: 'bg-violet-100 text-violet-800',
  SIGNEE: 'bg-green-200 text-green-900',
  ANNULEE: 'bg-gray-200 text-gray-500 line-through',
}

export default function BadgeStatut({ statut }: { statut: string }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${COULEURS[statut] ?? 'bg-gray-100'}`}>{LIBELLES_STATUT[statut as Statut] ?? statut}</span>
}
