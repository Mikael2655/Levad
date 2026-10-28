import { NextResponse } from 'next/server'
import { traiterImport } from '@/lib/financement/contrats'
import { ErreurMetier } from '@/lib/financement/erreurs'
import { MAX_LIGNES } from '@/lib/financement/fichier-import'
import { acteurApi, corps, repondre } from '@/lib/financement/garde'
import { CHAMPS, type Mapping } from '@/lib/financement/import-contrats'

// Étape 2 / 3 de l'import : « simuler » vérifie et renvoie un rapport ; sinon les contrats sont créés.
export async function POST(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const c = await corps(req)
  return repondre(async () => {
    if (!Array.isArray(c.lignes) || c.lignes.length > MAX_LIGNES) throw new ErreurMetier('Lignes invalides.')
    const mapping: Mapping = {}
    for (const champ of CHAMPS) {
      const i = c.mapping?.[champ]
      if (Number.isInteger(i) && i >= 0) mapping[champ] = i
    }
    return traiterImport(u, {
      financeurId: Number(c.financeurId),
      lignes: c.lignes.map((l: unknown) => (Array.isArray(l) ? l.map(x => String(x ?? '')) : [])),
      mapping,
      uniteDuree: c.uniteDuree === 'TRIMESTRES' ? 'TRIMESTRES' : 'MOIS',
      periodiciteDefaut: c.periodiciteDefaut === 'MENSUELLE' ? 'MENSUELLE' : 'TRIMESTRIELLE',
      commercialDefautId: c.commercialDefautId ? Number(c.commercialDefautId) : null,
      simuler: c.simuler !== false,
    })
  })
}
