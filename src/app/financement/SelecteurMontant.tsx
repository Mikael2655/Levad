'use client'

import { useId } from 'react'

// Liste déroulante « Montant affiché » (admin et assistante seulement). Le changement est immédiat, sans recharger :
// la page contient les deux montants et un attribut data-m sur #zone-montant dit lequel est visible (voir globals.css).
// L'adresse de la page est mise à jour pour qu'un rechargement ou un clic sur un filtre garde le choix.
export default function SelecteurMontant({ initial }: { initial: 'commercial' | 'reel' }) {
  const id = useId()
  function changer(v: string) {
    const zone = document.getElementById('zone-montant')
    if (zone) zone.dataset.m = v
    const u = new URL(window.location.href)
    u.searchParams.set('m', v)
    window.history.replaceState(null, '', u.toString())
    document.querySelectorAll<HTMLAnchorElement>('#zone-montant a[data-garde-m]').forEach(a => {
      const l = new URL(a.href)
      l.searchParams.set('m', v)
      a.href = l.toString()
    })
  }
  return (
    <label htmlFor={id}>Montant affiché<br />
      <select id={id} name="m" defaultValue={initial} onChange={e => changer(e.target.value)} className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white">
        <option value="commercial">Montant financé pour les commerciaux</option>
        <option value="reel">Montant financé réel</option>
      </select>
    </label>
  )
}
