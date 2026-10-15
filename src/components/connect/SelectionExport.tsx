'use client'

import { useState } from 'react'

type Cl = { id: number; nom: string; mois: number | null; machines: { id: number; libelle: string }[] }

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

// Choix des clients et des machines de l'export. Cocher un client coche toutes ses machines ; on peut en décocher.
export function SelectionExport({ clients, clientsCoches, machinesCochees }: { clients: Cl[]; clientsCoches: number[]; machinesCochees: number[] }) {
  const [cl, setCl] = useState<Set<number>>(new Set(clientsCoches))
  const [ma, setMa] = useState<Set<number>>(new Set(machinesCochees))
  const [mois, setMois] = useState(new Date().getMonth())

  function basculerClient(c: Cl, on: boolean) {
    setCl((x) => { const n = new Set(x); if (on) n.add(c.id); else n.delete(c.id); return n })
    setMa((x) => { const n = new Set(x); c.machines.forEach((m) => (on ? n.add(m.id) : n.delete(m.id))); return n })
  }
  function aFacturer() {
    const cycle = (mois % 3) + 1
    const cibles = clients.filter((c) => c.mois === cycle)
    setCl(new Set(cibles.map((c) => c.id)))
    setMa(new Set(cibles.flatMap((c) => c.machines.map((m) => m.id))))
  }
  function tout(on: boolean) {
    setCl(new Set(on ? clients.map((c) => c.id) : []))
    setMa(new Set(on ? clients.flatMap((c) => c.machines.map((m) => m.id)) : []))
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">Clients à facturer en</span>
        <select value={mois} onChange={(e) => setMois(Number(e.target.value))} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5">
          {MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <button type="button" onClick={aFacturer} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold">Sélectionner</button>
        <button type="button" onClick={() => tout(true)} className="rounded-lg px-3 py-1.5 text-gray-600 underline">Tout cocher</button>
        <button type="button" onClick={() => tout(false)} className="rounded-lg px-3 py-1.5 text-gray-600 underline">Tout décocher</button>
      </div>
      <div className="mt-3 max-h-96 divide-y overflow-y-auto rounded-lg border bg-white">
        {clients.map((c) => (
          <div key={c.id} className="p-3">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" name="c" value={c.id} checked={cl.has(c.id)} onChange={(e) => basculerClient(c, e.target.checked)} className="h-4 w-4" />
              {c.nom}
              <span className="text-xs font-normal text-gray-500">
                {c.machines.length} machine{c.machines.length > 1 ? 's' : ''}{c.mois ? ` · facturé ${MOIS[c.mois - 1]}, ${MOIS[c.mois + 2]}, ${MOIS[c.mois + 5]}, ${MOIS[c.mois + 8]}` : ' · mois de facturation non défini'}
              </span>
            </label>
            {cl.has(c.id) && c.machines.length > 1 && (
              <div className="mt-1 space-y-0.5 pl-6">
                {c.machines.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="m"
                      value={m.id}
                      checked={ma.has(m.id)}
                      onChange={(e) => setMa((x) => { const n = new Set(x); if (e.target.checked) n.add(m.id); else n.delete(m.id); return n })}
                      className="h-4 w-4"
                    />
                    {m.libelle}
                  </label>
                ))}
              </div>
            )}
            {cl.has(c.id) && c.machines.length === 1 && <input type="hidden" name="m" value={c.machines[0].id} />}
          </div>
        ))}
      </div>
    </div>
  )
}
