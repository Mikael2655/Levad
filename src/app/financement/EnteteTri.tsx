import Link from 'next/link'

// En-tête de colonne triable : un clic trie en croissant, un second en décroissant. La flèche indique le sens en cours.
// Les autres paramètres de l'adresse (filtres, choix du montant) sont conservés.
export default function EnteteTri(p: {
  cle: string
  libelle: React.ReactNode
  chemin: string
  params: Record<string, string | undefined>
  tri?: string
  ordre: 'asc' | 'desc'
  droite?: boolean
}) {
  const actif = p.tri === p.cle
  const suivant = actif && p.ordre === 'asc' ? 'desc' : 'asc'
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(p.params)) if (v && k !== 'tri' && k !== 'ordre') q.set(k, v)
  q.set('tri', p.cle)
  q.set('ordre', suivant)
  return (
    <th className="px-3 py-3 font-semibold" aria-sort={actif ? (p.ordre === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <Link
        href={`${p.chemin}?${q.toString()}`}
        data-garde-m
        title={actif ? (p.ordre === 'asc' ? 'Trié du plus petit au plus grand : cliquer pour inverser' : 'Trié du plus grand au plus petit : cliquer pour inverser') : 'Trier cette colonne'}
        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-accent-800 ${p.droite ? 'justify-end w-full' : ''} ${actif ? 'text-accent-800' : ''}`}
      >
        <span>{p.libelle}</span>
        <span aria-hidden className="inline-flex flex-col leading-[0.6] text-[9px]">
          <span className={actif && p.ordre === 'asc' ? 'text-accent-700' : 'text-gray-300'}>▲</span>
          <span className={actif && p.ordre === 'desc' ? 'text-accent-700' : 'text-gray-300'}>▼</span>
        </span>
      </Link>
    </th>
  )
}
