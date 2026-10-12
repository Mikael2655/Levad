'use client'

import { useState } from 'react'

// Champ de recherche de la synthèse : masque les clients et machines qui ne correspondent pas (nom du client, site, modèle,
// nom donné à la machine, marque, numéro de série, adresse IP). Plusieurs mots : tous doivent être trouvés.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function RechercheSynthese() {
  const [texte, setTexte] = useState('')
  const [resume, setResume] = useState('')

  function filtrer(valeur: string) {
    setTexte(valeur)
    const mots = norm(valeur).split(/\s+/).filter(Boolean)
    const clients = Array.from(document.querySelectorAll<HTMLElement>('[data-client]'))
    let vus = 0
    for (const c of clients) {
      const nom = norm(c.dataset.nom ?? '')
      let machinesVisibles = 0
      const machines = Array.from(c.querySelectorAll<HTMLElement>('[data-machine]'))
      for (const m of machines) {
        const base = nom + ' ' + norm(m.dataset.texte ?? '')
        const ok = mots.every((w) => base.includes(w))
        m.style.display = ok ? '' : 'none'
        if (ok) machinesVisibles++
      }
      for (const s of Array.from(c.querySelectorAll<HTMLElement>('[data-site]'))) {
        s.style.display = Array.from(s.querySelectorAll<HTMLElement>('[data-machine]')).some((m) => m.style.display !== 'none') ? '' : 'none'
      }
      const nomSeul = machines.length === 0 && mots.every((w) => nom.includes(w))
      const visible = mots.length === 0 || machinesVisibles > 0 || nomSeul
      c.style.display = visible ? '' : 'none'
      if (visible) vus++
    }
    setResume(mots.length === 0 ? '' : vus === 0 ? 'Aucun résultat' : `${vus} client${vus > 1 ? 's' : ''}`)
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={texte}
        onChange={(e) => filtrer(e.target.value)}
        placeholder="Rechercher un client, une machine, un n° de série, une adresse IP…"
        className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-4 py-2.5"
        aria-label="Rechercher dans la synthèse"
      />
      {resume && <span className="text-sm text-gray-500">{resume}</span>}
    </div>
  )
}
