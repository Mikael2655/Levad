'use client'

import { useState, useTransition } from 'react'
import { definirStockMinimum } from '@/app/parc/(prive)/actions'

// Ligne « Stock minimum » d'un groupe de machines, alignée sous les quatre couleurs : on modifie les chiffres puis « Enregistrer ».
// Les cases n'ont pas de nom : elles ne partent pas avec le formulaire d'envoi qui les entoure.
const COULEURS = ['noir', 'cyan', 'magenta', 'jaune'] as const

export function MinimumEdition({ clientId, groupe, valeurs, couleurs }: { clientId: number; groupe: string; valeurs: Record<string, number>; couleurs: string[] }) {
  const [saisie, setSaisie] = useState<Record<string, string>>(() => Object.fromEntries(COULEURS.map((c) => [c, String(valeurs[c] ?? 0)])))
  const [base, setBase] = useState<Record<string, number>>(valeurs)
  const [retour, setRetour] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()
  const modifie = COULEURS.some((c) => couleurs.includes(c) && Number(saisie[c] || 0) !== (base[c] ?? 0))

  function enregistrer() {
    const fd = new FormData()
    fd.set('clientId', String(clientId))
    fd.set('groupe', groupe)
    for (const c of couleurs) fd.set(`min_${c}`, saisie[c] || '0')
    demarrer(async () => {
      try {
        const r = await definirStockMinimum(fd)
        if (typeof r === 'string' && r.startsWith('!')) {
          setRetour(r.slice(1))
          return
        }
        setBase(Object.fromEntries(COULEURS.map((c) => [c, couleurs.includes(c) ? Number(saisie[c] || 0) : base[c] ?? 0])))
        setRetour('✓ enregistré')
      } catch {
        setRetour('Échec, réessayez')
      }
    })
  }

  return (
    <>
      <div className="text-xs text-gray-600">
        <p className="font-semibold">Stock minimum</p>
        {modifie ? (
          <button type="button" onClick={enregistrer} disabled={enCours} className="mt-0.5 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-60">
            {enCours ? 'En cours…' : 'Enregistrer'}
          </button>
        ) : (
          retour && <p className={retour.startsWith('✓') ? 'text-green-700' : 'text-red-600'}>{retour}</p>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {COULEURS.map((c) =>
          couleurs.includes(c) ? (
            <input
              key={c}
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={saisie[c]}
              onChange={(e) => { setSaisie((s) => ({ ...s, [c]: e.target.value })); setRetour(null) }}
              aria-label={`Stock minimum ${c}`}
              className="w-full max-w-[5.5rem] rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          ) : (
            <div key={c} />
          ),
        )}
      </div>
    </>
  )
}
