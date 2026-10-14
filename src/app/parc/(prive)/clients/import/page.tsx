import Link from 'next/link'
import { ImportClients } from '@/components/connect/ImportClients'
import { MAX_CLIENTS_PAR_IMPORT } from '@/lib/connect/import-clients'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // un envoi de mail toutes les ~0,6 s

export default function ImportClientsPage() {
  return (
    <>
      <Link href="/parc" className="text-sm text-gray-500 hover:text-gray-900">← Synthèse</Link>
      <h1 className="mt-3 text-2xl font-bold">Importer une liste de clients</h1>
      <p className="mt-1 text-gray-600">
        Collez votre liste (copiée depuis Excel, par exemple). Chaque nouveau client est créé avec son propre lien d&apos;installation, puis le lien peut lui être envoyé par
        mail aussitôt. Un client qui existe déjà est ignoré (rien n&apos;est modifié ni renvoyé). {MAX_CLIENTS_PAR_IMPORT} clients au maximum à la fois.
      </p>
      <ImportClients />
    </>
  )
}
