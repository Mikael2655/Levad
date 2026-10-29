'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { lireTexteMatrice, validerMatrice, type Matrice } from '@/lib/financement/grilles'
import { appel } from '../../appel'

interface Cible { financeurId: number; type: 'REELLE' | 'COMMERCIALE'; utilisateurId: number | null }

const nombre = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(/[\s €%]/g, '').replace(',', '.')))
const texte = (n: number | null) => (n == null ? '' : String(n).replace('.', ','))
const champ = 'border border-gray-300 rounded-lg px-2 py-1 text-sm text-right w-20'

export default function EditeurGrille({ cible, baseInitiale, matriceInitiale }: { cible: Cible; baseInitiale: string; matriceInitiale: Matrice | null }) {
  const router = useRouter()
  const m0 = matriceInitiale ?? { minimumsEuros: [0], durees: [36], cellules: [[null]] }
  const [base, setBase] = useState(baseInitiale)
  const [minimums, setMinimums] = useState(m0.minimumsEuros.map(texte))
  const [durees, setDurees] = useState(m0.durees.map(texte))
  const [cellules, setCellules] = useState(m0.cellules.map(l => l.map(texte)))
  const [collage, setCollage] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const [ok, setOk] = useState(false)

  const matrice = (): Matrice => ({
    minimumsEuros: minimums.map(nombre),
    durees: durees.map(nombre),
    cellules: cellules.map(l => l.map(c => (Number.isNaN(nombre(c)) ? null : nombre(c)))),
  })

  const modif = (f: () => void) => { setOk(false); setMessages([]); f() }

  function appliquerCollage() {
    const r = lireTexteMatrice(collage)
    if (!r.matrice) return setMessages(r.erreurs)
    setMinimums(r.matrice.minimumsEuros.map(texte))
    setDurees(r.matrice.durees.map(texte))
    setCellules(r.matrice.cellules.map(l => l.map(texte)))
    setCollage('')
    setOk(false)
    setMessages(['Tableau collé : vérifiez-le, puis cliquez sur « Enregistrer le barème ».'])
  }

  async function enregistrer() {
    const m = matrice()
    const problemes = validerMatrice(m)
    if (problemes.length) return setMessages(problemes)
    try {
      await appel('/api/financement/admin/grilles', 'PUT', { ...cible, base, matrice: m })
      setMessages([])
      setOk(true)
      router.refresh()
    } catch (e) {
      setMessages([(e as Error).message])
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="text-gray-600">Les coefficients sont exprimés
            <select className="ml-2 border border-gray-300 rounded-lg px-2 py-1" value={base} onChange={e => modif(() => setBase(e.target.value))}>
              <option value="MENSUEL">par mois</option>
              <option value="TRIMESTRIEL">par trimestre</option>
            </select>
          </label>
          <span className="text-gray-400">Chaque colonne commence au minimum indiqué et s’arrête au minimum de la suivante.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="text-left pr-3 font-medium text-gray-500">Durée (mois) ↓ · Montant à partir de (€) →</th>
                {minimums.map((v, j) => (
                  <th key={j} className="px-1 pb-1">
                    <input className={champ} value={v} onChange={e => modif(() => setMinimums(minimums.map((x, k) => (k === j ? e.target.value : x))))} />
                    {minimums.length > 1 && <button title="Supprimer cette tranche" className="block mx-auto text-xs text-gray-400 hover:text-red-600" onClick={() => modif(() => { setMinimums(minimums.filter((_, k) => k !== j)); setCellules(cellules.map(l => l.filter((_, k) => k !== j))) })}>×</button>}
                  </th>
                ))}
                <th><button className="text-xs underline text-gray-600" onClick={() => modif(() => { setMinimums([...minimums, '']); setCellules(cellules.map(l => [...l, ''])) })}>+ tranche</button></th>
              </tr>
            </thead>
            <tbody>
              {durees.map((d, i) => (
                <tr key={i}>
                  <td className="pr-3 py-0.5">
                    <input className={champ} value={d} onChange={e => modif(() => setDurees(durees.map((x, k) => (k === i ? e.target.value : x))))} />
                    {durees.length > 1 && <button title="Supprimer cette durée" className="ml-1 text-xs text-gray-400 hover:text-red-600" onClick={() => modif(() => { setDurees(durees.filter((_, k) => k !== i)); setCellules(cellules.filter((_, k) => k !== i)) })}>×</button>}
                  </td>
                  {cellules[i].map((c, j) => (
                    <td key={j} className="px-1 py-0.5"><input className={champ} value={c} onChange={e => modif(() => setCellules(cellules.map((l, k) => (k === i ? l.map((x, n) => (n === j ? e.target.value : x)) : l))))} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="text-sm underline text-gray-600" onClick={() => modif(() => { setDurees([...durees, '']); setCellules([...cellules, minimums.map(() => '')]) })}>+ durée</button>
        <p className="text-xs text-gray-500">Coefficients en % (ex. 5,95). Le calcul par défaut est loyer = montant × coefficient.</p>
      </div>

      <details className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-4 text-sm">
        <summary className="cursor-pointer font-medium text-gray-900">Coller un tableau depuis Excel</summary>
        <p className="text-gray-500 mt-2">1re ligne : un titre puis le minimum de chaque tranche (€). Lignes suivantes : la durée (« 36 » mois ou « 12T » trimestres) puis un coefficient par tranche.</p>
        <textarea className="mt-2 w-full border border-gray-300 rounded-lg p-2 font-mono text-xs h-32" value={collage} onChange={e => setCollage(e.target.value)} placeholder={'Montant\t0\t10000\t25000\n12T\t9,85%\t9,70%\t9,65%'} />
        <button className="mt-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-white" onClick={appliquerCollage}>Remplacer le tableau ci-dessus</button>
      </details>

      {messages.length > 0 && <ul className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2 list-disc list-inside">{messages.map(x => <li key={x}>{x}</li>)}</ul>}
      {ok && <p className="text-sm text-green-700">Barème enregistré.</p>}
      <button className="bg-leasing-700 hover:bg-leasing-800 text-white transition rounded-xl px-5 py-2.5 text-sm font-semibold" onClick={enregistrer}>Enregistrer le barème</button>
    </div>
  )
}
