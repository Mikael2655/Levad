'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// Se souvenir de la liste (tri, filtres) pour y revenir depuis une fiche avec la flèche « ← ». Le menu, lui, ouvre toujours la liste par défaut.
// Mémoire propre à l'onglet du navigateur (sessionStorage) : rien n'est enregistré sur le serveur.
const clef = (nom: string) => `financement.liste.${nom}`

export function MemoireListe({ nom }: { nom: string }) {
  const chemin = usePathname()
  const params = useSearchParams()
  const qs = params.toString()
  useEffect(() => {
    try { sessionStorage.setItem(clef(nom), qs ? `${chemin}?${qs}` : chemin) } catch { /* mémoire indisponible : le lien retombe sur la liste par défaut */ }
  }, [nom, chemin, qs])
  return null
}

export function LienRetour({ nom, defaut, className, children }: { nom: string; defaut: string; className?: string; children: React.ReactNode }) {
  const [href, setHref] = useState(defaut)
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(clef(nom))
      // uniquement une adresse de la même liste (jamais une adresse extérieure)
      if (v && (v === defaut || v.startsWith(`${defaut}?`))) setHref(v)
    } catch { /* ignoré */ }
  }, [nom, defaut])
  return <Link href={href} className={className}>{children}</Link>
}
