# ♠ Tournoi de belote

Application web pour organiser un **tournoi de belote** géré par un seul
**administrateur** : saisie des équipes avec **tirage au sort** de la poule et
du numéro, saisie des scores, classement automatique (points + goal-average) et
tableau final jusqu'à la finale.

Aucune installation serveur : c'est un site statique (déployable sur GitHub
Pages) qui **fonctionne hors-ligne**. Les données sont enregistrées dans le
navigateur. Firebase est **optionnel** (sauvegarde en ligne + accès depuis
plusieurs appareils).

## Comment ça marche

- **Accueil : mes tournois** — la page d'accueil liste tous les tournois
  enregistrés. On en **crée** un nouveau, on **rouvre** un tournoi existant à
  tout moment, ou on le **supprime**.
- **Créer un tournoi** — nom, **format** et code administrateur :
  - **Poules + tableau** : poules puis phase finale (le format complet).
  - **Poules seulement** : classement des poules, sans tableau.
  - **Élimination directe** : tableau tiré au sort (4, 8, 16 ou 32 équipes),
    sans poules.
  Pour les formats à poules on choisit le **nombre de poules**, le **nombre
  d'équipes par poule** et le **nombre de qualifiés par poule** pour le
  tableau (petits tournois de 4 ou 8 équipes possibles : ex. 1 poule de 4,
  ou 8 équipes en élimination directe). Le **nombre de qualifiés par poule**
  pilote le 1er tour du tableau : ex. **4 poules × 2 qualifiés → 1/4 de
  finale** (8 équipes), **6 poules × 2 → 1/8** (16, complété par les
  meilleurs 3es). Quand (qualifiés × poules) n'est pas une puissance de 2,
  l'appli **repêche** les meilleurs suivants pour compléter le tableau.
  Seuls les réglages qui **« tombent juste »** (tableau rempli, **sans
  exempt**) sont acceptés : l'aperçu indique les nombres de qualifiés
  possibles (ex. 6 poules de 4 → 1 ou 2 ; 4 poules de 4 → 1, 2, 3 ou 4).
  Réglable aussi après coup dans l'onglet **Réglages**, tant qu'aucun score
  n'est saisi.
- **Administration** (protégée par un code) :
  1. **Saisir les équipes** : on prépare d'abord la **liste** de toutes les
     équipes (ajout, renommage, suppression). Puis, d'un seul bouton
     **« Tirer au sort les placements »**, l'appli place chaque équipe au
     hasard (poule + numéro, ou position dans le tableau). On peut
     **relancer** ou **effacer** le tirage tant que le tournoi n'a pas
     démarré (effacer garde la liste mais libère les places) ; une fois
     un score saisi, la liste et les placements sont figés. Chaque action
     affiche un indicateur **« en cours »** puis une confirmation.
  2. **Saisir les scores** des matchs (poules et/ou tableau).
  3. En format « poules + tableau », **clôturer les poules** génère le tableau
     final (têtes de série tirées du classement).
- **Classement** (vue publique, partageable) : classement des poules,
  meilleurs 3es, et tableau final en direct — selon le format choisi.

## Saisie par les équipes (QR par équipe)

Chaque équipe peut saisir ses propres scores depuis son téléphone, sans jamais
retaper de nom :

- Dans l'administration, l'onglet **Accès** affiche **un QR (et un lien) par
  équipe**. L'organisateur les fait scanner (ou les envoie). Un **moteur de
  recherche** (insensible aux accents et à la casse, multi-mots) retrouve
  instantanément une équipe par son nom, son étiquette (ex. `A1`) ou sa
  poule (ex. `poule B`).
- En scannant son QR, l'équipe arrive **directement sur ses matchs**, son nom
  et celui de l'adversaire déjà affichés. Son téléphone retient l'accès.
- Une équipe **propose** le score, l'équipe adverse **valide**. Tant que ce
  n'est pas validé, le score reste « à confirmer ». Tout remonte en direct
  chez l'organisateur, qui peut toujours corriger.

⚠️ Cette saisie multi-téléphone nécessite **Firebase** (voir ci-dessous). En
mode local (un seul appareil), seul l'organisateur peut saisir.

## Règles du tournoi

- **Poules de 4 équipes** (au moins 6 poules recommandées). Chaque équipe
  rencontre les 3 autres.
- Matchs de poule en **1500 points**. **Victoire = 1 pt**, **défaite = 0**.
  **Victoire par rubicon** (le gagnant atteint au moins le **double** des
  points de l'adversaire) = **2 pts**.
- Départage : **points**, puis **goal-average** (différence de points), puis
  **total de points marqués**.
- Les **N premiers** de chaque poule (N = qualifiés par poule, réglable) +
  éventuellement les **meilleurs repêchés** (les (N+1)èmes) sont qualifiés.
  Le tableau a une taille en puissance de 2 : **6 poules × 2 → 1/8 à 16**,
  **4 poules × 2 → 1/4 à 8**.
- **Tirage du 1er tour du tableau** (même règle quel que soit le format) :
  deux équipes d'une **même poule** ne se rencontrent jamais, et **deux 1ers
  de poule** ne se rencontrent jamais (quand c'est possible). Les **1ers**
  sont toujours **avantagés** : ils tombent sur une équipe moins bien classée
  — un **repêché** (3e…) en priorité, sinon un **2e**. Ex. à 6 poules × 2 :
  4 meilleurs 3es → 4 « 1er contre 3e », les 2 autres 1ers → « 1er contre
  2e », et les 2es restants s'affrontent entre eux.
- **Tous les matchs se jouent en 1500 points** (1/8, 1/4, 1/2), **sauf la
  finale et la petite finale** (3e place) en **2000 points**.
- Tous les matchs du tableau sont des **matchs secs** (pas d'aller-retour) :
  une seule rencontre, la victoire qualifie.

## Sauvegarde en ligne (optionnel : Firebase)

Par défaut, tout est stocké **localement dans le navigateur** de
l'administrateur (badge « LOCAL »). C'est suffisant pour un tournoi géré depuis
un seul appareil — pensez simplement à ne pas vider les données du navigateur.

Pour une **sauvegarde en ligne** et l'accès **depuis plusieurs appareils** (ex.
téléphone + ordinateur), branchez Firebase (gratuit) :

1. Créez un projet sur <https://console.firebase.google.com>.
2. Ajoutez une application **Web** et copiez l'objet `firebaseConfig`.
3. **Authentication → Sign-in method → Anonyme** : activez.
4. **Firestore Database** : créez la base (mode production).
5. Collez vos identifiants dans [`js/config.js`](js/config.js).
6. **Firestore → Règles** : collez le contenu de
   [`firestore.rules`](firestore.rules) et publiez.

Le badge « LOCAL » disparaît : les données sont désormais synchronisées en
ligne.

## Déploiement

Le workflow GitHub Actions publie l'appli sur GitHub Pages sous
`/belote-tournoi/` à chaque push sur `main`. Adresse type :
`https://<utilisateur>.github.io/Levad/belote-tournoi/`.

## Gérer plusieurs tournois

Ajoutez `?t=<identifiant>` à l'URL (ex. `…/belote-tournoi/?t=2026`) pour gérer
un tournoi distinct.

## Détails techniques

| Fichier | Rôle |
|---|---|
| `js/logic.js` | Règles pures : points, classement, qualification, tableau (testable) |
| `js/db.js` | Couche données : stockage local **ou** Firestore temps réel |
| `js/app.js` | Interface, navigation, écrans (accueil, classement, administration) |
| `js/config.js` | Configuration Firebase (optionnelle) et identifiant du tournoi |
| `firestore.rules` | Règles de sécurité Firestore (si Firebase activé) |

Tout est en JavaScript sans dépendance de build.
