import { LIBELLES_STATUT } from '@/lib/financement/statuts'
import type { Statut } from '@/lib/financement/droits'

// Étiquette de statut. Code couleur :
//  gris   = en attente (brouillon, envoyée, annulée) ;
//  orange = pièces ou informations manquantes (redevient grise une fois les pièces envoyées) ;
//  rouge  = refusée ;
//  vert   = accord, de plus en plus soutenu à chaque étape jusqu'à la signature (accord → signature démarrée → client → LEVAD → contrat émis → signée).
// Les statuts et leurs libellés ne changent pas ; seule la présentation est colorée.
interface Style { badge: string; point: string }
const GRIS: Style = { badge: 'bg-gray-100 text-gray-700 ring-gray-500/20', point: 'bg-gray-400' }
const ORANGE: Style = { badge: 'bg-orange-50 text-orange-800 ring-orange-600/25', point: 'bg-orange-500' }
const ROUGE: Style = { badge: 'bg-red-50 text-red-700 ring-red-600/20', point: 'bg-red-500' }
const VERTS: Style[] = [
  { badge: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20', point: 'bg-emerald-400' }, // 0 accord
  { badge: 'bg-emerald-100 text-emerald-800 ring-emerald-600/25', point: 'bg-emerald-500' }, // 1 signature démarrée / attente client
  { badge: 'bg-emerald-200 text-emerald-900 ring-emerald-700/25', point: 'bg-emerald-600' }, // 2 attente LEVAD
  { badge: 'bg-emerald-300 text-emerald-950 ring-emerald-700/30', point: 'bg-emerald-700' }, // 3 contrat émis / livraison
  { badge: 'bg-emerald-600 text-white ring-emerald-800/30', point: 'bg-white' }, // 4 signée
]
const NIVEAU_ETAPE: Record<string, number> = { DEMARRAGE: 1, ATTENTE_CLIENT: 1, ATTENTE_LEVAD: 2, CONTRAT_EMIS: 3, ATTENTE_LIVRAISON: 3 }

export function styleStatut(statut: string, etape?: string | null): Style {
  switch (statut) {
    case 'INFOS_MANQUANTES': return ORANGE
    case 'REFUSEE': return ROUGE
    case 'PRETE_A_SIGNER': return VERTS[0]
    case 'EN_SIGNATURE': return VERTS[NIVEAU_ETAPE[etape ?? ''] ?? 1]
    case 'SIGNEE': return VERTS[4]
    default: return GRIS // brouillon, envoyée (en attente), annulée
  }
}

export default function BadgeStatut({ statut, etape }: { statut: string; etape?: string | null }) {
  const s = styleStatut(statut, etape)
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.badge} ${statut === 'ANNULEE' ? 'line-through' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.point}`} />
      {LIBELLES_STATUT[statut as Statut] ?? statut}
    </span>
  )
}
