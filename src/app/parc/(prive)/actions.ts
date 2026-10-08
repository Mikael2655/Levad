'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { connecte } from '@/lib/connect/auth'

// Actions du tableau de bord (réglages d'une machine, renommage d'un client). Toutes exigent d'être connecté.

export async function enregistrerReglages(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const recette = String(formData.get('recette') ?? '')
  const categorie = String(formData.get('categorie') ?? 'mine') === 'autre' ? 'autre' : 'mine'
  const clientId = Number(formData.get('clientId'))
  const seuil = Math.min(100, Math.max(0, Number(formData.get('seuilEncre')) || 25))
  const nomAffiche = String(formData.get('nomAffiche') ?? '').trim().slice(0, 120) || null

  await prisma.connectMachine.update({
    where: { id },
    data: {
      recette: ['A', 'B', 'C'].includes(recette) ? recette : null,
      categorie,
      nomAffiche,
      seuilEncre: seuil,
      aVerifier: false, // la machine a été relue et réglée à la main
      ...(clientId ? { clientId } : {}),
    },
  })
  revalidatePath('/parc')
  revalidatePath(`/parc/machine/${id}`)
}

export async function renommerClient(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const nom = String(formData.get('nom') ?? '').trim().slice(0, 120)
  if (!nom) return
  await prisma.connectClient.update({ where: { id }, data: { nom } })
  revalidatePath('/parc')
  revalidatePath(`/parc/client/${id}`)
}
