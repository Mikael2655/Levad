import { NextResponse } from 'next/server'
import { rechercherEntreprises } from '@/lib/financement/entreprises'
import { acteurApi, repondre } from '@/lib/financement/garde'

// Recherche d'une entreprise par nom, adresse ou numéro (ouverte à tous les rôles connectés).
export async function GET(req: Request) {
  const u = await acteurApi()
  if (u instanceof NextResponse) return u
  const q = new URL(req.url).searchParams.get('q') ?? ''
  return repondre(() => rechercherEntreprises(q.slice(0, 120)))
}
