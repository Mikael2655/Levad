import { etatInstallation } from '@/lib/financement/installation'
import FormulaireInstallation from './FormulaireInstallation'

export const dynamic = 'force-dynamic'

export default async function PageInstallation() {
  const etat = await etatInstallation()
  return (
    <main className="max-w-md mx-auto p-6">
      {etat === 'POSSIBLE' ? (
        <FormulaireInstallation />
      ) : (
        <p className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-600">
          {etat === 'DEJA_INSTALLEE' ? 'L’outil est déjà installé. Connectez-vous avec votre compte administrateur.' : 'L’installation n’est pas activée : la variable FIN_INSTALL_CODE est absente de cet environnement, ou trop courte (20 caractères minimum). Après l’avoir ajoutée dans Vercel, relancez le déploiement.'}
        </p>
      )}
    </main>
  )
}
