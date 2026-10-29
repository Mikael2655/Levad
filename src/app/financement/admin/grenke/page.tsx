import { prisma } from '@/lib/db'
import { lireConfigGrenke, VARIABLES_GRENKE } from '@/lib/financement/connecteurs/grenke/config'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { dateFr } from '../../format'
import EssaisGrenke from './EssaisGrenke'

export const dynamic = 'force-dynamic'

export default async function PageGrenke() {
  await exigerUtilisateur({ roles: ['ADMIN'] })
  const cfg = lireConfigGrenke()
  const demandes = await prisma.finDemande.findMany({ orderBy: { id: 'desc' }, take: 30, select: { id: true, reference: true, raisonSociale: true } })
  const mode = process.env.GRENKE_PAYMENT_METHOD
  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Connexion à l’API Grenke</h1>
      <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-2 text-sm">
        <h2 className="font-semibold text-gray-900">Configuration (variables d’environnement Vercel)</h2>
        <ul className="space-y-1">
          {VARIABLES_GRENKE.map(v => <li key={v}>{cfg.manquantes.includes(v) ? '❌' : '✅'} <code>{v}</code>{cfg.manquantes.includes(v) ? ` : absente de cet environnement${v === 'GRENKE_API_URL' ? ' (valeur de production donnée par Grenke : https://api.grenkeonline.com)' : ''}` : ''}</li>)}
          <li>{process.env.GRENKE_CA_BASE64 ? '✅' : '⚪'} <code>GRENKE_CA_BASE64</code> : {process.env.GRENKE_CA_BASE64 ? 'définie' : 'non définie (probablement nécessaire : les deux certificats publics de Grenke, « Public Root CA » et « Public Leasing Api CA », à télécharger sur pki.grenkeonline.com)'}</li>
          <li>{mode ? '✅' : '⚪'} <code>GRENKE_PAYMENT_METHOD</code> : {mode ?? 'non définie (nécessaire pour envoyer de vraies demandes : « Invoice » ou « Direct Debit »)'}</li>
        </ul>
        {cfg.problemes.length > 0 && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{cfg.problemes.join(' ')}</p>}
        {cfg.certificat && (
          <p className="text-gray-700">
            Certificat : <b>{cfg.certificat.sujet}</b> · expire le <b>{dateFr(cfg.certificat.expireLe)}</b> ({cfg.certificat.joursRestants} jours){cfg.certificat.joursRestants < 60 && <span className="text-orange-700"> — à renouveler bientôt</span>}
          </p>
        )}
        {cfg.prete && <p className="text-green-700">Configuration complète : les essais ci-dessous sont possibles.</p>}
      </section>
      <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        Ces essais sont en <b>lecture seule</b> : aucune demande n’est créée chez Grenke. La simulation de loyer interroge leur calculateur (sans engagement). L’aperçu ne contacte pas Grenke du tout.
      </p>
      <EssaisGrenke prete={cfg.prete} demandes={demandes} />
    </main>
  )
}
