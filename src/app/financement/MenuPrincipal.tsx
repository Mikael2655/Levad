'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Onglet { href: string; libelle: string; actif: (chemin: string) => boolean }

// Menu principal : l'onglet de la page en cours est mis en évidence.
export default function MenuPrincipal({ admin }: { admin: boolean }) {
  const chemin = usePathname()
  const onglets: Onglet[] = [
    { href: '/financement/demandes/nouvelle', libelle: 'Nouvelle demande', actif: c => c.startsWith('/financement/demandes/nouvelle') },
    { href: '/financement', libelle: 'Demandes en cours', actif: c => c === '/financement' || (c.startsWith('/financement/demandes') && !c.startsWith('/financement/demandes/nouvelle')) },
    { href: '/financement/contrats', libelle: 'Contrats', actif: c => c.startsWith('/financement/contrats') },
    ...(admin ? [{ href: '/financement/admin', libelle: 'Administration', actif: (c: string) => c.startsWith('/financement/admin') }] : []),
  ]
  return (
    <nav className="order-3 md:order-none w-full md:w-auto flex items-center gap-1 sm:gap-3 overflow-x-auto pb-1 md:pb-0 -mx-1 px-1">
      {onglets.map(o => {
        const actif = o.actif(chemin)
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={actif ? 'page' : undefined}
            className={`px-3 sm:px-4 py-2 rounded-full whitespace-nowrap transition ${actif ? 'bg-leasing-700 hover:bg-leasing-800 text-white transition font-semibold shadow-sm' : 'text-gray-600 hover:bg-leasing-100 hover:text-leasing-800'}`}
          >
            {o.libelle}
          </Link>
        )
      })}
    </nav>
  )
}
