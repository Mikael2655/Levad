'use client'

import { useRef, useState } from 'react'

// Préparation d'un envoi à partir des alertes : coche (renseigne) une cartouche par couleur concernée, sans enregistrer.
// Les cases qui ne peuvent pas être choisies seules (plusieurs versions possibles : normale, L, H…) sont laissées à 0 et listées.
export type PlanEnvoi = { valeurs: Record<string, number>; nb: number; aChoisir: string[] }

export function PreparationEnvoi({ sans, avec }: { sans: PlanEnvoi; avec: PlanEnvoi }) {
  const ref = useRef<HTMLDivElement>(null)
  const [retour, setRetour] = useState<{ titre: string; plan: PlanEnvoi } | null>(null)

  function appliquer(titre: string, plan: PlanEnvoi) {
    const form = ref.current?.closest('form')
    if (!form) return
    // on repart de zéro sur les quantités à l'unité (les « jeux complets » saisis à la main restent)
    form.querySelectorAll<HTMLInputElement>('input[name^="qte_"]').forEach((i) => { i.value = '0' })
    for (const [nom, q] of Object.entries(plan.valeurs)) {
      const champ = form.querySelector<HTMLInputElement>(`input[name="${nom}"]`)
      if (champ) champ.value = String(q)
    }
    setRetour({ titre, plan })
  }

  const bouton = 'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50'
  return (
    <div ref={ref} className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
      <p className="text-sm font-semibold text-gray-700">Préparer l&apos;envoi d&apos;après les alertes</p>
      <p className="mt-0.5 text-xs text-gray-500">
        <strong>Sans optimisation</strong> : une cartouche pour chaque couleur en alerte. <strong>Avec optimisation</strong> : en plus, celles à moins de 10 points au-dessus du seuil.
        Les cases sont seulement pré-remplies : rien n&apos;est enregistré avant « Enregistrer l&apos;envoi ».
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => appliquer('Sans optimisation', sans)} className={bouton}>Envoi sans optimisation</button>
        <button type="button" onClick={() => appliquer('Avec optimisation', avec)} className={bouton}>Envoi avec optimisation</button>
      </div>
      {retour && (
        <div className="mt-2 text-sm" role="status">
          <p className={retour.plan.nb > 0 ? 'font-semibold text-green-700' : 'font-semibold text-gray-600'}>
            {retour.titre} : {retour.plan.nb > 0 ? `${retour.plan.nb} cartouche${retour.plan.nb > 1 ? 's' : ''} cochée${retour.plan.nb > 1 ? 's' : ''}` : 'aucune cartouche à envoyer'}.
          </p>
          {retour.plan.aChoisir.length > 0 && (
            <div className="mt-1 rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-900">
              <p className="font-semibold">À choisir vous-même (plusieurs versions possibles) :</p>
              <ul className="mt-0.5 list-disc pl-5">
                {retour.plan.aChoisir.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
