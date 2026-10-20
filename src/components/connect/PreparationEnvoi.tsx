'use client'

import { useEffect, useRef, useState } from 'react'

// Préparation d'un envoi à partir des alertes : renseigne une cartouche par couleur concernée, sans rien enregistrer.
// Rouge = couleur en alerte ; bleu = envoi par anticipation (« avec optimisation »).
// Les couleurs qui existent en plusieurs versions (normale, L, H…) ne sont pas remplies : elles sont listées pour être choisies à la main.
export type PlanEnvoi = { valeurs: Record<string, { q: number; type: 'alerte' | 'anticipation' }>; nb: number; aChoisir: string[] }

const STYLES = {
  alerte: { borderColor: '#dc2626', backgroundColor: '#fef2f2', color: '#991b1b' },
  anticipation: { borderColor: '#2563eb', backgroundColor: '#eff6ff', color: '#1e40af' },
} as const

export function PreparationEnvoi({ sans, avec }: { sans: PlanEnvoi; avec: PlanEnvoi }) {
  const ref = useRef<HTMLDivElement>(null)
  const [retour, setRetour] = useState<{ titre: string; plan: PlanEnvoi } | null>(null)

  function effacerCouleurs(form: HTMLFormElement) {
    form.querySelectorAll<HTMLInputElement>('input[name^="qte_"]').forEach((i) => {
      i.style.borderColor = ''
      i.style.backgroundColor = ''
      i.style.color = ''
    })
  }

  // après « Enregistrer l'envoi » le formulaire est remis à zéro : les couleurs et le message disparaissent aussi
  useEffect(() => {
    const form = ref.current?.closest('form')
    if (!form) return
    const surReset = () => {
      effacerCouleurs(form)
      setRetour(null)
    }
    form.addEventListener('reset', surReset)
    return () => form.removeEventListener('reset', surReset)
  }, [])

  function appliquer(titre: string, plan: PlanEnvoi) {
    const form = ref.current?.closest('form')
    if (!form) return
    effacerCouleurs(form)
    // on repart de zéro sur les quantités à l'unité (les « jeux complets » saisis à la main restent)
    form.querySelectorAll<HTMLInputElement>('input[name^="qte_"]').forEach((i) => { i.value = '0' })
    for (const [nom, { q, type }] of Object.entries(plan.valeurs)) {
      const champ = form.querySelector<HTMLInputElement>(`input[name="${nom}"]`)
      if (!champ) continue
      champ.value = String(q)
      Object.assign(champ.style, STYLES[type])
    }
    setRetour({ titre, plan })
  }

  const bouton = 'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50'
  return (
    <div ref={ref} className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => appliquer('Avec optimisation', avec)} className={bouton}>Envoi avec optimisation</button>
        <button type="button" onClick={() => appliquer('Sans optimisation', sans)} className={bouton}>Envoi sans optimisation</button>
        <span className="text-xs text-gray-500">
          Pré-remplit les cases, rien n&apos;est enregistré avant « Enregistrer l&apos;envoi ». <span className="font-semibold text-red-600">Rouge</span> : en alerte ·{' '}
          <span className="font-semibold text-blue-600">bleu</span> : par anticipation (moins de 10 points au-dessus du seuil).
        </span>
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
