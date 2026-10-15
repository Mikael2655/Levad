'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const VERT = '#8c9e8b'

type Entree = { href: string; titre: string; badge?: number; badgeVert?: boolean }

// Menu du tableau de bord : l'entrée active ressort en vert ; sur téléphone il défile sans se chevaucher.
export function Menu({ entrees }: { entrees: Entree[] }) {
  const chemin = usePathname() ?? ''
  const actif = (href: string) => (href === '/parc' ? chemin === '/parc' || /^\/parc\/(client|machine)\//.test(chemin) : chemin === href || chemin.startsWith(href + '/'))
  return (
    <nav className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 text-sm font-medium xl:mx-0 xl:px-0 xl:pb-0">
      {entrees.map((e) => {
        const on = actif(e.href)
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={on ? 'page' : undefined}
            className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 ${on ? 'font-semibold text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            style={on ? { backgroundColor: VERT } : undefined}
          >
            {e.titre}
            {!!e.badge && e.badge > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${e.badgeVert ? '' : 'bg-red-600'}`} style={e.badgeVert ? { backgroundColor: VERT } : undefined}>{e.badge}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
