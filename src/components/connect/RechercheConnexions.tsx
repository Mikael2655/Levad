'use client'

import { useState } from 'react'

// Champ de recherche de la page Connexions : masque les lignes qui ne correspondent pas (client, site, ordinateur, état).
// Plusieurs mots : tous doivent être trouvés.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function RechercheConnexions() {
  const [texte, setTexte] = useState('')
  const [resume, setResume] = useState('')

  function filtrer(valeur: string) {
    setTexte(valeur)
    const mots = norm(valeur).split(/\s+/).filter(Boolean)
    let vus = 0
    for (const g of Array.from(document.querySelectorAll<HTMLElement>('[data-ligne-connexion]'))) {
      const base = norm(g.dataset.texte ?? '')
      const ok = mots.every((w) => base.includes(w))
      g.style.display = ok ? '' : 'none'
      if (ok) vus++
    }
    setResume(mots.length === 0 ? '' : vus === 0 ? 'Aucun résultat' : `${vus} ligne${vus > 1 ? 's' : ''}`)
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={texte}
        onChange={(e) => filtrer(e.target.value)}
        placeholder="Rechercher un client, un site, un ordinateur, un état (déconnecté…)"
        className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-4 py-2.5"
        aria-label="Rechercher dans les connexions"
      />
      {resume && <span className="text-sm text-gray-500">{resume}</span>}
    </div>
  )
}
