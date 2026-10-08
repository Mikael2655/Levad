'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { connecte } from '@/lib/connect/auth'
import { COULEURS, stockCourant } from '@/lib/connect/alertes'

const seuil = (v: FormDataEntryValue | null) => Math.min(100, Math.max(0, Number(v ?? 25) || 0))

// Actions du tableau de bord (réglages d'une machine, renommage d'un client). Toutes exigent d'être connecté.

export async function enregistrerReglages(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  const recette = String(formData.get('recette') ?? '')
  const categorie = String(formData.get('categorie') ?? 'mine') === 'autre' ? 'autre' : 'mine'
  const clientId = Number(formData.get('clientId'))
  const nomAffiche = String(formData.get('nomAffiche') ?? '').trim().slice(0, 120) || null

  await prisma.connectMachine.update({
    where: { id },
    data: {
      recette: ['A', 'B', 'C'].includes(recette) ? recette : null,
      categorie,
      nomAffiche,
      seuilNoir: seuil(formData.get('seuilNoir')),
      seuilCyan: seuil(formData.get('seuilCyan')),
      seuilMagenta: seuil(formData.get('seuilMagenta')),
      seuilJaune: seuil(formData.get('seuilJaune')),
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

// Seuils d'alerte appliqués d'un coup à toutes les machines d'un client.
export async function appliquerSeuilsClient(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const id = Number(formData.get('id'))
  await prisma.connectMachine.updateMany({
    where: { clientId: id },
    data: {
      seuilNoir: seuil(formData.get('seuilNoir')),
      seuilCyan: seuil(formData.get('seuilCyan')),
      seuilMagenta: seuil(formData.get('seuilMagenta')),
      seuilJaune: seuil(formData.get('seuilJaune')),
    },
  })
  revalidatePath('/parc', 'layout')
}

// Saisie d'un envoi de cartouches à un client (que le client soit en alerte ou non).
export async function ajouterEnvoi(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const clientId = Number(formData.get('clientId'))
  const couleur = String(formData.get('couleur') ?? '')
  const quantite = Math.floor(Number(formData.get('quantite')))
  const note = String(formData.get('note') ?? '').trim().slice(0, 200) || null
  const dateSaisie = String(formData.get('date') ?? '')
  if (!clientId || !(COULEURS as readonly string[]).includes(couleur) || !(quantite >= 1)) return
  const date = dateSaisie && !Number.isNaN(Date.parse(dateSaisie)) ? new Date(dateSaisie) : new Date()
  await prisma.connectStockMouvement.create({
    data: { clientId, couleur, delta: quantite, motif: 'envoi', note, date },
  })
  revalidatePath('/parc', 'layout')
}

// Correction manuelle du stock : on indique la quantité réelle, le programme enregistre la différence.
export async function corrigerStock(formData: FormData) {
  if (!connecte()) throw new Error('Non connecté')
  const clientId = Number(formData.get('clientId'))
  const couleur = String(formData.get('couleur') ?? '')
  const voulu = Math.max(0, Math.floor(Number(formData.get('quantite'))))
  if (!clientId || !(COULEURS as readonly string[]).includes(couleur) || Number.isNaN(voulu)) return
  const actuel = Math.max(0, await stockCourant(clientId, couleur))
  if (voulu === actuel) return
  await prisma.connectStockMouvement.create({
    data: { clientId, couleur, delta: voulu - actuel, motif: 'correction', note: `Corrigé de ${actuel} à ${voulu}` },
  })
  revalidatePath('/parc', 'layout')
}
