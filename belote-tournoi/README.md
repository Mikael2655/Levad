# ♠ Tournoi de belote

Application web pour organiser un **tournoi de belote** : poules, saisie des
scores par les chefs d'équipe (via QR code), classement automatique
(points + goal-average) et tableau final jusqu'à la finale.

Aucune installation serveur : c'est un site statique (déployable sur GitHub
Pages). La synchronisation temps réel entre les téléphones passe par
**Firebase** (offre gratuite).

## Comment ça marche

- **L'organisateur** ouvre **Administration**, crée le tournoi (nom, nombre de
  poules, code secret) et affiche le **QR code d'inscription**.
- **Chaque chef d'équipe** scanne ce QR : il se voit attribuer **au hasard**
  une poule (A, B, C, …) et une place (équipe 1 à 4). Il saisit son nom et
  celui de son partenaire. Les poules sont donc constituées aléatoirement.
- Dans sa mini-appli, chaque chef **saisit les scores** de ses matchs. Un score
  n'est validé que lorsque **les chefs des deux équipes** sont d'accord : l'un
  propose, l'autre valide.
- L'appli **Classement** (publique) et l'espace **Administration** affichent en
  direct le classement de chaque poule et le tableau final.

## Règles du tournoi

- **Poules de 4 équipes** (au moins 6 poules recommandées). Chaque équipe
  rencontre les 3 autres.
- Matchs de poule en **1500 points**. **Victoire = 1 pt**, **victoire au double**
  (vainqueur ≥ 2× le score adverse) **= 2 pts**, **défaite = 0**.
- Départage : **points**, puis **goal-average** (différence de points), puis
  **total de points marqués**.
- Les **2 premiers** de chaque poule + les **meilleurs 3es** (autant que
  nécessaire) sont qualifiés. Le tableau a une taille en puissance de 2 :
  **6 poules → 1/8 de finale à 16 équipes**.
- **1/8** et **1/4** en 1500 points : seule la victoire compte (pas de
  différence).
- **1/2** en **2000 points**. **Petite finale** (3e place) en 2000 points.
- **Finale** : match **aller / retour**, plus la **belle** si 1 partout. Il faut
  **2 victoires** pour être sacré.

## Configurer Firebase (multi-téléphone)

Tant que Firebase n'est pas configuré, l'appli tourne en **mode démo** (données
locales à un seul appareil, synchro entre onglets du même navigateur). Pour un
vrai tournoi :

1. Créez un projet sur <https://console.firebase.google.com> (gratuit).
2. Ajoutez une application **Web** et copiez l'objet `firebaseConfig`.
3. **Authentication → Sign-in method → Anonyme** : activez.
4. **Firestore Database** : créez la base (mode production).
5. Collez vos identifiants dans [`js/config.js`](js/config.js).
6. **Firestore → Règles** : collez le contenu de
   [`firestore.rules`](firestore.rules) et publiez.

Rechargez la page : le badge « DÉMO » disparaît, la synchro temps réel est
active.

## Déploiement

Le workflow GitHub Actions publie automatiquement l'appli sur GitHub Pages sous
`/belote-tournoi/` à chaque push sur `main`. Adresse type :
`https://<utilisateur>.github.io/Levad/belote-tournoi/`.

Le **QR code d'inscription** pointe vers cette adresse : imprimez-le ou
affichez-le le jour J.

## Gérer plusieurs tournois

Ajoutez `?t=<identifiant>` à l'URL (ex. `…/belote-tournoi/?t=2026`) pour gérer
un tournoi distinct. Le QR code reprend automatiquement cet identifiant.

## Détails techniques

| Fichier | Rôle |
|---|---|
| `js/logic.js` | Règles pures : points, classement, qualification, tableau (testable) |
| `js/db.js` | Couche données : Firestore temps réel **ou** mode démo local |
| `js/app.js` | Interface, navigation, écrans (accueil, chef, classement, admin) |
| `js/config.js` | Configuration Firebase et identifiant du tournoi |
| `js/qrcode.js` | Génération du QR code (hors-ligne, MIT — Kazuhiko Arase) |
| `firestore.rules` | Règles de sécurité Firestore |

Tout est en JavaScript sans dépendance de build. Aucune donnée n'est envoyée
ailleurs que dans votre propre projet Firebase.
