import { diagnosticInstallation, etatInstallation } from '@/lib/financement/installation'
import FormulaireInstallation from './FormulaireInstallation'

export const dynamic = 'force-dynamic'

export default async function PageInstallation() {
  const etat = await etatInstallation()
  const diag = diagnosticInstallation()
  return (
    <main className="max-w-md mx-auto p-6">
      {etat === 'POSSIBLE' ? (
        <FormulaireInstallation />
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-gray-900/5 shadow-sm p-6 text-sm text-gray-600 space-y-2">
          {etat === 'DEJA_INSTALLEE' ? (
            <p>L’outil est déjà installé. Connectez-vous avec votre compte administrateur.</p>
          ) : etat === 'BASE_NON_PRETE' ? (
            <>
              <p className="font-semibold text-gray-900">La base de données n’est pas prête.</p>
              <p>Le code d’installation est bien reçu, mais les tables du financement n’existent pas encore (ou la base est inaccessible).</p>
              <p>Exécutez une fois le script <b>prisma/migrations/manual_financement.sql</b> dans la console SQL de Neon (Vercel → Storage → votre base → Open in Neon → SQL Editor), puis rechargez cette page.</p>
            </>
          ) : (
            <>
              <p>L’installation n’est pas activée.</p>
              <ul className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                <li>Environnement Vercel de ce déploiement : <b>{diag.environnement}</b></li>
                <li>Branche : <b>{diag.branche}</b> · version du déploiement : <b>{diag.version}</b></li>
                <li>Variables aux noms voisins reçues par ce déploiement : <b>{diag.nomsProches.length ? diag.nomsProches.map(n => `« ${n} »`).join(', ') : 'aucune'}</b></li>
                <li>Variable FIN_INSTALL_CODE : <b>{diag.variable === 'ABSENTE' ? 'absente de cet environnement' : 'présente mais trop courte (20 caractères minimum)'}</b></li>
              </ul>
              <p className="text-xs">Ajoutez la variable dans Vercel pour l’environnement indiqué ci-dessus, puis relancez le déploiement (Deployments → ⋯ → Redeploy).</p>
            </>
          )}
        </div>
      )}
    </main>
  )
}
