import { listerUtilisateurs } from '@/lib/financement/admin'
import { prisma } from '@/lib/db'
import { exigerUtilisateur } from '@/lib/financement/garde'
import { lireParametre, PARAM_DOSSIER_COMPLET, PARAM_SIGNATAIRE_LEVAD } from '@/lib/financement/notifications'
import { dateHeureFr } from '../../format'
import FormulaireNotifications from './FormulaireNotifications'
import RetourAdmin from '../RetourAdmin'

export const dynamic = 'force-dynamic'

export default async function PageNotifications() {
  await exigerUtilisateur({ roles: ['ADMIN'] })
  const [utilisateurs, signataire, complet, journal] = await Promise.all([
    listerUtilisateurs(),
    lireParametre(PARAM_SIGNATAIRE_LEVAD),
    lireParametre(PARAM_DOSSIER_COMPLET),
    prisma.finNotification.findMany({ orderBy: { creeLe: 'desc' }, take: 30 }),
  ])
  const choix = utilisateurs.filter(x => x.actif && (x.role === 'ADMIN' || x.role === 'ASSISTANTE')).map(x => ({ id: x.id, nom: `${x.prenom} ${x.nom}` }))
  const mailActif = !!process.env.RESEND_API_KEY
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <RetourAdmin />
      <h1 className="text-xl font-semibold text-gray-900">Notifications par e-mail</h1>
      {!mailActif && <p className="bg-amber-50 border border-amber-300 rounded-md px-4 py-3 text-sm text-amber-900">L’envoi d’e-mails n’est pas encore activé : ajoutez <code>RESEND_API_KEY</code> (et <code>FIN_MAIL_FROM</code>) dans Vercel, puis redéployez.</p>}
      <FormulaireNotifications choix={choix} signataireLevadId={signataire ?? ''} dossierCompletId={complet ?? ''} />
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <p className="p-3 font-semibold text-gray-900 text-sm">Derniers envois</p>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b border-gray-100"><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Destinataire</th><th className="p-3 font-medium">Objet</th><th className="p-3 font-medium">Résultat</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {journal.map(n => (
              <tr key={n.id}><td className="p-3 whitespace-nowrap text-gray-500">{dateHeureFr(n.creeLe)}</td><td className="p-3">{n.destinataireEmail}</td><td className="p-3">{n.sujet}</td><td className="p-3">{n.statut === 'ENVOYE' ? '✅ envoyé' : n.statut === 'IGNORE' ? 'non envoyé (mail non configuré)' : `❌ échec ${n.erreur ?? ''}`}</td></tr>
            ))}
            {journal.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-gray-400">Aucun envoi pour le moment.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  )
}
