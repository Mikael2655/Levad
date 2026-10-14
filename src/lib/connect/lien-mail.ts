import { prisma } from '@/lib/db'
import { assurerCode, urlsTelechargement } from '@/lib/connect/agent'
import { envoyerMail } from '@/lib/connect/mail'

/** Envoie au client le mail avec son lien d'installation (liens Windows et Mac directs), puis le note dans l'historique du lien. */
export async function envoyerLienClient(id: number, valides: string[]): Promise<void> {
  const email = valides.join('; ')
  const liens = urlsTelechargement(await assurerCode(id))
  const bouton = (href: string, texte: string) =>
    `<a href="${href}" style="display:inline-block;background:#8c9e8b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;margin:0 8px 8px 0">${texte}</a>`
  await envoyerMail({
    to: valides,
    sujet: 'Levad Connect : installer le relevé de vos copieurs',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.45">
  <p>Bonjour,</p>
  <p>Pour suivre automatiquement les compteurs et les niveaux de toner de vos copieurs, nous vous proposons d'installer
  <strong>Levad Connect</strong>, un petit programme à installer une seule fois. Il fonctionne ensuite tout seul, en arrière-plan.</p>

  <p style="margin:22px 0 4px"><strong>1. Téléchargez le programme (un clic) :</strong></p>
  <p style="margin:0 0 18px">${bouton(liens.windows, 'Télécharger pour Windows')}${bouton(liens.mac, 'Télécharger pour Mac')}</p>

  <p style="margin:0 0 4px"><strong>2. Ouvrez-le et cliquez sur « Installer » :</strong></p>
  <ul style="margin:0 0 18px;padding-left:20px">
    <li style="margin:0 0 6px"><strong>Windows</strong> : double-cliquez sur le fichier téléchargé (dossier Téléchargements).</li>
    <li style="margin:0 0 6px"><strong>Mac</strong> : ouvrez le dossier compressé téléchargé, puis double-cliquez sur l'application « Levad Connect » qu'il contient.</li>
  </ul>

  <p style="margin:0 0 4px"><strong>3. Un message d'avertissement s'affiche ? C'est normal.</strong> Le programme est signé par <strong>Levad</strong> : vérifiez que l'éditeur affiché est bien Levad, puis confirmez ainsi :</p>
  <ul style="margin:0 0 10px;padding-left:20px;font-size:14px">
    <li style="margin:0 0 6px"><strong>Au téléchargement, avec Microsoft Edge</strong> : « n'est pas fréquemment téléchargé » → cliquez sur les trois points « … » à droite du fichier → <strong>Conserver</strong> → puis sur la flèche à droite du bouton « Supprimer » → <strong>Conserver quand même</strong>.</li>
    <li style="margin:0 0 6px"><strong>Au téléchargement, avec Google Chrome</strong> : « Téléchargement suspect bloqué » → cliquez dessus, puis sur <strong>Télécharger le fichier suspect</strong> (et non « Supprimer de l'historique »).</li>
    <li style="margin:0 0 6px"><strong>À l'ouverture sous Windows</strong> : « Windows a protégé votre ordinateur » → cliquez sur <strong>Informations complémentaires</strong>, vérifiez « Éditeur : Levad », puis <strong>Exécuter quand même</strong>.</li>
    <li style="margin:0 0 6px"><strong>À l'ouverture sur Mac</strong> : « Apple n'a pas pu vérifier l'application » → <strong>Terminé</strong>, puis menu Pomme → Réglages Système → Confidentialité et sécurité → <strong>Ouvrir quand même</strong>. Acceptez aussi l'accès au « réseau local » si le Mac le demande.</li>
  </ul>
  <p style="margin:0 0 18px;font-size:14px">Besoin d'aide sur : <a href="${liens.aideWindows}" style="color:#4b6b4b">Windows</a> · <a href="${liens.aideMac}" style="color:#4b6b4b">Mac</a> (la marche à suivre, avec les messages en images).</p>

  <p>Le programme ne fait que lire vos copieurs, ne modifie aucun réglage, et peut être désinstallé à tout moment.
  Ces liens sont personnels : en cas de changement d'ordinateur, il suffit de les réutiliser.</p>
  <p style="margin-bottom:6px">Cordialement,</p>
  <img src="${process.env.PARC_URL || 'https://connect.levad.fr'}/signature-levad.png" width="260" alt="LEVAD - www.levad.fr - 01 70 72 19 40" style="display:block;border:0">
</body></html>`,
  })
  await prisma.connectClient.update({ where: { id }, data: { email, lienEnvoyeLe: new Date() } })
  await prisma.connectLienEvenement.create({ data: { clientId: id, type: 'envoye', detail: email } })
}
