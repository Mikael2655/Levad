// Appel d'une route de l'outil depuis un écran : renvoie les données, ou lève une erreur avec le message du serveur.
export async function appel<T = any>(url: string, methode: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', corps?: unknown): Promise<T> {
  const res = await fetch(url, { method: methode, headers: { 'Content-Type': 'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Erreur')
  return data as T
}

export const eurosVersCentimes = (s: string) => Math.round(Number(s.replace(/[\s €]/g, '').replace(',', '.')) * 100)
export const pourcentVersBp = (s: string) => Math.round(Number(s.replace(/[\s %]/g, '').replace(',', '.')) * 100)
export const bpVersPourcent = (bp: number | null | undefined) => (bp == null ? '' : String(bp / 100).replace('.', ','))
