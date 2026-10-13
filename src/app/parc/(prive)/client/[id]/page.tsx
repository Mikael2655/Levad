import { libelleMachine } from '@/lib/connect/libelle'
import Link from 'next/link'
import { Bouton, Formulaire } from '@/components/connect/Formulaire'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { appliquerSeuilsClient, definirSitePoste, envoyerLien, marquerLienEnvoye, enregistrerIps, genererEspace, regenererEspace, genererLien, majClient, regenererLien, renommerClient, retirerPoste, supprimerClient, definirHorsContratClient } from '../../actions'
import { erreurEnCours, statutConnexion, urlEspace, urlLien, urlsTelechargement } from '@/lib/connect/agent'
import { Badge, formaterDate, depuis, jour } from '@/components/connect/affichage'
import { COULEURS, NOM_COULEUR } from '@/lib/connect/alertes'
import { VERT } from '@/components/connect/affichage'

export const dynamic = 'force-dynamic'

export default async function ClientPage({ params }: { params: { id: string } }) {
  const client = await prisma.connectClient.findUnique({
    where: { id: Number(params.id) },
    include: { machines: true, postes: { orderBy: { derniereConnexion: 'desc' } }, evenementsLien: true },
  })
  if (!client) notFound()
  const historique = [
    ...client.evenementsLien.map((e) => ({
      date: e.date,
      texte: e.type === 'envoye' ? `Lien envoyé à ${e.detail ?? 'le client'}` : e.type === 'note' ? 'Lien envoyé (noté à la main)' : e.type === 'installe' ? `Installé sur ${e.detail}` : e.type === 'desinstalle' ? `Programme désinstallé sur ${e.detail ?? 'un ordinateur'}` : `Nouveau lien créé (${e.detail ?? 'l’ancien ne fonctionne plus'})`,
    })),
    ...client.postes.map((p) => ({ date: p.premiereConnexion, texte: `Installé sur ${p.nom} (${p.site})` })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())
  return (
    <>
      <Link href="/parc" className="text-sm text-gray-500 hover:text-gray-900">← Retour à la synthèse</Link>
      <h1 className="mt-3 text-2xl font-bold">{client.nom}</h1>
      <Formulaire action={renommerClient} message="Nom enregistré" className="mt-6 max-w-md space-y-3 rounded-xl border bg-white p-6">
        <input type="hidden" name="id" value={client.id} />
        <label className="block text-sm font-medium text-gray-700">
          Nom affiché (raison sociale, nom commercial…)
          <input name="nom" defaultValue={client.nom} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <Bouton className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>
          Enregistrer
        </Bouton>
      </Formulaire>
      <section id="ips" className="mt-6 max-w-3xl rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Machines non trouvées par la recherche automatique</h2>
        <p className="mt-1 text-sm text-gray-600">
          Saisissez l&apos;adresse IP de chaque copieur à lire en plus (une par ligne). Le programme du client les lit à chaque relevé, même si elles sont hors de son réseau habituel.
          Le modèle et le numéro de série sont lus sur la machine. Il faut que le programme soit en version 1.11 ou plus.
        </p>
        <Formulaire action={enregistrerIps} message="Enregistré" className="mt-3 space-y-3">
          <input type="hidden" name="id" value={client.id} />
          <textarea name="ips" defaultValue={client.ipsManuelles ?? ''} rows={4} placeholder={'180.170.10.49\n180.170.10.211'} className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm" />
          <Bouton className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>Enregistrer</Bouton>
        </Formulaire>
      </section>
      <section id="espace" className="mt-6 max-w-3xl rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Espace client (consultation du parc)</h2>
        <p className="mt-1 text-sm text-gray-600">
          Page privée où le client voit ses compteurs, ses niveaux d&apos;encre (avec la date de fin estimée) et ses stocks. Il n&apos;a pas de mot de passe : le lien est secret.
        </p>
        {client.codeEspace ? (
          <>
            <p className="mt-3 break-all rounded-lg bg-gray-50 p-3 font-mono text-sm">{urlEspace(client.codeEspace)}</p>
            <p className="mt-2 text-sm">
              <a href={`/espace/${client.codeEspace}`} target="_blank" className="underline">Voir l&apos;espace tel que le client le voit</a>
            </p>
            <Formulaire action={regenererEspace} message="Nouveau lien créé" className="mt-3">
              <input type="hidden" name="id" value={client.id} />
              <Bouton className="text-sm text-red-600 underline">Régénérer le lien (l&apos;ancien cesse de fonctionner)</Bouton>
            </Formulaire>
          </>
        ) : (
          <Formulaire action={genererEspace} message="Lien créé" className="mt-3">
            <input type="hidden" name="id" value={client.id} />
            <Bouton className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>
              Créer le lien de l&apos;espace client
            </Bouton>
          </Formulaire>
        )}
      </section>
      <section id="lien" className="mt-6 max-w-3xl scroll-mt-4 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">Programme résident (relevé automatique)</h2>
        {client.codeLien ? (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Lien personnel d&apos;installation de ce client (permanent, valable pour tous ses ordinateurs) :
            </p>
            <p className="mt-1 break-all rounded-lg bg-gray-50 p-3 font-mono text-sm">{urlLien(client.codeLien)}</p>
            <p className="mt-3 text-sm text-gray-600">Liens de téléchargement direct (ceux du mail) :</p>
            <p className="mt-1 break-all rounded-lg bg-gray-50 p-3 font-mono text-xs">
              Windows : {urlsTelechargement(client.codeLien).windows}
              <br />
              Mac : {urlsTelechargement(client.codeLien).mac}
            </p>
            <Formulaire action={envoyerLien} message="Lien envoyé" className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={client.id} />
              <label className="grow text-sm font-medium text-gray-700">
                Envoyer ce lien par mail à
                <input type="email" name="email" defaultValue={client.email ?? ''} placeholder="adresse du client" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <Bouton className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>
                Envoyer le lien
              </Bouton>
            </Formulaire>
            <h3 className="mt-4 text-sm font-semibold">Historique du lien</h3>
            <ul className="mt-1 space-y-1 text-sm text-gray-700">
              {historique.length === 0 && <li className="text-gray-500">Lien créé, pas encore envoyé.</li>}
              {historique.map((e, i) => (
                <li key={i}>
                  <span className="text-gray-500">{formaterDate(e.date)}</span> — {e.texte}
                </li>
              ))}
            </ul>
            <Formulaire action={marquerLienEnvoye} message="Noté" className="mt-1">
              <input type="hidden" name="id" value={client.id} />
              <Bouton className="text-sm text-gray-600 underline">J&apos;ai transmis le lien autrement (mail, SMS…) : le noter comme envoyé</Bouton>
            </Formulaire>
            <Formulaire action={regenererLien} message="Nouveau lien créé" className="mt-3">
              <input type="hidden" name="id" value={client.id} />
              <Bouton className="text-sm text-red-600 underline">Régénérer le lien (l&apos;ancien cesse de fonctionner)</Bouton>
            </Formulaire>
          </>
        ) : (
          <Formulaire action={genererLien} message="Lien créé" className="mt-3">
            <input type="hidden" name="id" value={client.id} />
            <Bouton className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>
              Créer le lien d&apos;installation
            </Bouton>
          </Formulaire>
        )}

        <Formulaire action={majClient} message="Enregistré" className="mt-6 grid gap-4 border-t pt-4 md:grid-cols-3">
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="email" value={client.email ?? ''} />
          <label className="text-sm font-medium text-gray-700">
            Mode de relevé
            <select name="modeReleve" defaultValue={client.modeReleve} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="agent">Programme résident</option>
              <option value="manuel">Relevés manuels (reçus par mail)</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Alerte de déconnexion après (jours)
            <input type="number" name="seuilDeconnexionJours" min={1} max={90} defaultValue={client.seuilDeconnexionJours} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Mois de facturation (tous les 3 mois)
            <select name="moisFacturation" defaultValue={client.moisFacturation ?? ''} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Non défini</option>
              <option value="1">Janvier, avril, juillet, octobre</option>
              <option value="2">Février, mai, août, novembre</option>
              <option value="3">Mars, juin, septembre, décembre</option>
            </select>
          </label>
          <div className="flex items-end">
            <Bouton className="rounded-lg border border-gray-300 px-4 py-2 font-semibold">Enregistrer</Bouton>
          </div>
        </Formulaire>

        <h3 className="mt-6 font-semibold">Ordinateurs où le programme est installé (un par site)</h3>
        <p className="mt-1 text-sm text-gray-500">
          Indiquez le site de chaque ordinateur : ses machines (déjà lues et à venir) prennent ce site, et la connexion est surveillée
          ordinateur par ordinateur.
        </p>
        {client.postes.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">Aucun pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {client.postes.map((p) => (
              <li key={p.id} className="rounded-lg border p-3 text-sm">
                <p>
                  <strong>{p.nom}</strong> <span className="text-gray-500">({p.systeme ?? 'système inconnu'})</span> — installé le{' '}
                  {formaterDate(p.premiereConnexion)}, dernier signal {depuis(p.derniereConnexion)}{' '}
                  {statutConnexion(p.derniereConnexion, client.seuilDeconnexionJours) === 'connecte' && <Badge ton="vert">connecté</Badge>}
                  {statutConnexion(p.derniereConnexion, client.seuilDeconnexionJours) === 'deconnecte' && <Badge ton="rouge">déconnecté</Badge>}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Programme version {p.versionAgent ?? '?'}
                  {p.demarreLe && ` · démarré le ${formaterDate(p.demarreLe)}`}
                  {p.derniereLectureOk && ` · dernière lecture réussie ${depuis(p.derniereLectureOk)}`}
                </p>
                {p.derniereErreur && p.derniereErreurLe && (
                  <p className={`mt-1 text-xs ${erreurEnCours(p) ? 'text-red-600' : 'text-gray-400'}`}>
                    {erreurEnCours(p) ? 'Dernière erreur du programme' : 'Dernière erreur du programme (résolue depuis)'} ({formaterDate(p.derniereErreurLe)}, {p.nbErreurs} depuis son démarrage) : {p.derniereErreur}
                  </p>
                )}
                <Formulaire action={definirSitePoste} message="Site enregistré" className="mt-2 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={p.id} />
                  <label className="grow text-sm font-medium text-gray-700">
                    Site de cet ordinateur
                    <input name="site" defaultValue={p.site} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                  </label>
                  <Bouton className="rounded-lg border border-gray-300 px-4 py-2 font-semibold">Enregistrer</Bouton>
                </Formulaire>
                <Formulaire action={retirerPoste} message="Retiré" confirmation={`Retirer ${p.nom} de la liste ? (à faire seulement si le programme n'y est plus installé)`} className="mt-2">
                  <input type="hidden" name="id" value={p.id} />
                  <Bouton className="text-xs text-red-600 underline">Retirer cet ordinateur de la liste</Bouton>
                </Formulaire>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Formulaire action={appliquerSeuilsClient} message="Seuils appliqués à toutes les machines" className="mt-6 max-w-2xl space-y-3 rounded-xl border bg-white p-6">
        <input type="hidden" name="id" value={client.id} />
        <h2 className="font-bold">Seuils d&apos;alerte de toutes les machines de ce client (%)</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {COULEURS.map((c) => (
            <label key={c} className="text-sm text-gray-600">
              {NOM_COULEUR[c]}
              <input type="number" name={`seuil${NOM_COULEUR[c]}`} min={0} max={100} defaultValue={25} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
          ))}
        </div>
        <Bouton className="rounded-lg px-4 py-2 font-semibold text-white" style={{ backgroundColor: VERT }}>
          Appliquer à toutes ses machines
        </Bouton>
        <p className="text-xs text-gray-500">Pour régler une seule machine, ouvrez sa fiche.</p>
      </Formulaire>
      <p className="mt-6 text-sm text-gray-500">
        Les relevés futurs de ce client continueront d&apos;être reconnus même si vous changez le nom affiché. Pour
        regrouper deux noms qui désignent la même société, ouvrez une machine et changez son « Client ».
      </p>
      <h2 className="mt-8 text-lg font-bold">Machines</h2>
      <div className="mt-2 flex flex-wrap gap-3">
        <Formulaire action={definirHorsContratClient} message="Machines mises hors contrat" confirmation={`Mettre toutes les machines de ${client.nom} hors contrat (plus aucune alerte d'encre) ?`}>
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="valeur" value="oui" />
          <Bouton className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold">Tout mettre hors contrat</Bouton>
        </Formulaire>
        <Formulaire action={definirHorsContratClient} message="Machines remises sous contrat">
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="valeur" value="non" />
          <Bouton className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold">Tout remettre sous contrat</Bouton>
        </Formulaire>
      </div>
      <ul className="mt-2 list-disc pl-6 text-gray-700">
        {client.machines.map((m) => (
          <li key={m.id}>
            <Link href={`/parc/machine/${m.id}`} className="underline">
              {libelleMachine(m, 'Machine inconnue')}
            </Link>{' '}
            — n° {m.numeroSerie ?? '—'}
          </li>
        ))}
      </ul>
      <section className="mt-10 rounded-xl border border-red-200 bg-white p-6">
        <h2 className="text-lg font-bold text-red-700">Supprimer ce client</h2>
        <p className="mt-1 text-sm text-gray-600">
          Supprime définitivement le client avec ses {client.machines.length} machine{client.machines.length > 1 ? 's' : ''}, tous leurs relevés, son stock d&apos;encre et l&apos;historique de son lien. Son lien d&apos;installation cessera de fonctionner. Impossible à annuler.
        </p>
        <Formulaire
          action={supprimerClient}
          confirmation={`Supprimer définitivement « ${client.nom} » et toutes ses données (${client.machines.length} machine(s), relevés, stock) ? Cette action est irréversible.`}
          className="mt-3"
        >
          <input type="hidden" name="id" value={client.id} />
          <Bouton className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700">Supprimer le client</Bouton>
        </Formulaire>
      </section>
    </>
  )
}
