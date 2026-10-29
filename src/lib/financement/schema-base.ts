// Contrôle que la base de données contient bien toutes les tables et colonnes « fin_* » attendues par cette version de l'application.
// Utile après une mise à jour : si un script SQL de mise à jour n'a pas été exécuté, on le voit tout de suite au lieu d'une erreur obscure.
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export interface EtatSchema {
  ok: boolean
  manquantes: string[] // « table.colonne » ou « table » absentes de la base
  scripts: string[] // scripts SQL à exécuter pour corriger
}

// Colonne -> script qui l'a ajoutée (pour dire quoi exécuter). Les colonnes absentes de cette liste relèvent du script complet.
const V2 = 'prisma/migrations/manual_financement_2.sql'
const V3 = 'prisma/migrations/manual_financement_3.sql'
const COLONNES_AJOUTEES: Record<string, string> = {
  'fin_demande.etapeSignature': V2,
  'fin_financeur.signatureElectronique': V3,
  'fin_financeur.envoiParMail': V3,
  'fin_financeur.destinataireMailId': V3,
  'fin_contrat.banque': V3,
  fin_parametre: V3,
  fin_notification: V3,
}

export async function verifierSchemaBase(): Promise<EtatSchema> {
  const attendues: { table: string; colonnes: string[] }[] = Prisma.dmmf.datamodel.models
    .filter(m => (m.dbName ?? m.name).startsWith('fin_'))
    .map(m => ({ table: m.dbName ?? m.name, colonnes: m.fields.filter(f => f.kind === 'scalar' || f.kind === 'enum').map(f => f.dbName ?? f.name) }))
  const lignes = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name LIKE 'fin\_%'`
  const presentes = new Map<string, Set<string>>()
  for (const l of lignes) presentes.set(l.table_name, (presentes.get(l.table_name) ?? new Set()).add(l.column_name))

  const manquantes: string[] = []
  for (const t of attendues) {
    const colonnes = presentes.get(t.table)
    if (!colonnes) manquantes.push(t.table)
    else for (const c of t.colonnes) if (!colonnes.has(c)) manquantes.push(`${t.table}.${c}`)
  }
  // colonnes devenues facultatives avec la mise à jour n° 3
  const nullables = await prisma.$queryRaw<{ table_name: string; column_name: string; is_nullable: string }[]>`
    SELECT table_name, column_name, is_nullable FROM information_schema.columns WHERE table_schema = current_schema()
    AND ((table_name = 'fin_demande' AND column_name IN ('montantReelCentimes', 'coefficientReelPpm')) OR (table_name = 'fin_contrat' AND column_name = 'montantReelCentimes'))`
  for (const n of nullables) if (n.is_nullable === 'NO') manquantes.push(`${n.table_name}.${n.column_name} (doit être facultative)`)
  const scripts = Array.from(new Set(manquantes.map(m => COLONNES_AJOUTEES[m] ?? (m.includes('(doit être facultative)') ? V3 : 'prisma/migrations/manual_financement.sql'))))
  return { ok: manquantes.length === 0, manquantes, scripts }
}
