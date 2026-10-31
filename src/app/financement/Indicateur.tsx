import Link from 'next/link'

// Carte chiffrée (accueil des listes) : icône simple dans une pastille douce, libellé, grand chiffre. Toute la carte est cliquable.
const CHEMINS = {
  contrat: 'M7 3h8l4 4v14H7V3ZM15 3v4h4M10 12h6M10 16h6',
  crayon: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  signature: 'M4 17c2-4 3-9 5-9s1 6 3 6 2-3 4-3 2 3 4 3M3 21h18',
  cloche: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0',
  cycle: 'M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 5v4h-4M4 19v-4h4',
  coche: 'm5 12.5 4.5 4.5L19 7.5',
}
const TONS = {
  vert: 'bg-accent-50 text-accent-700',
  ambre: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
  orange: 'bg-orange-50 text-orange-600',
  ciel: 'bg-sky-50 text-sky-700',
  gris: 'bg-gray-100 text-gray-600',
}

export default function Indicateur(p: { href: string; n: number; titre: string; icone: keyof typeof CHEMINS; ton: keyof typeof TONS }) {
  return (
    <Link href={p.href} data-garde-m className="carte group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONS[p.ton]}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden><path d={CHEMINS[p.icone]} /></svg>
      </span>
      <span className="min-w-0">
        <span className="block text-3xl font-semibold leading-none tracking-tight text-gray-900 tabular-nums">{p.n}</span>
        <span className="mt-1.5 block text-sm text-gray-500">{p.titre}</span>
      </span>
    </Link>
  )
}
