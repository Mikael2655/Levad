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
  Pour les formats à poules on choisit seulement le **nombre de poules** : les
  équipes inscrites sont **réparties au hasard** en poules de tailles
  **équilibrées** (elles peuvent donc être inégales — ex. **22 équipes en
  4 poules → 6, 6, 5, 5**). Le nombre d'équipes par poule n'est pas fixé à
  l'avance : on inscrit autant d'équipes qu'on veut.
- **Administration** (protégée par un code) :
  1. **Saisir les équipes** : on prépare d'abord la **liste** de toutes les
     équipes (ajout, renommage, suppression). Puis, d'un seul bouton
     **« Tirer au sort la répartition »**, l'appli répartit les équipes au
     hasard dans les poules. On peut **relancer** ou **effacer** le tirage
     tant que le tournoi n'a pas démarré ; une fois un score saisi, la liste
     et les placements sont figés. Chaque action affiche un indicateur
     **« en cours »** puis une confirmation.
  2. **Saisir les scores** des matchs (poules et/ou tableau).
  3. En format « poules + tableau », on **choisit le tour de départ** du
     tableau (1/16, 1/8, 1/4, 1/2 ou finale) — dans les **Réglages** (à côté
     du nombre de poules) ou au moment de la clôture, avec une option
     **« Auto »** (le plus grand tableau possible). À la **clôture des
     poules**, l'appli qualifie en conséquence les meilleures équipes (les
     1ers, puis les 2es, puis les meilleurs 3es…) pour remplir exactement ce
     tableau, têtes de série tirées du classement.
- **Classement** (vue publique, partageable) : classement des poules et
  tableau final en direct — selon le format choisi.

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

- **Poules de taille libre** (4, 5, 6… équipes), réparties au hasard et
  équilibrées. Chaque équipe rencontre toutes les autres de sa poule.
- Matchs de poule en **1500 points**. **Victoire = 1 pt**, **défaite = 0**.
  **Victoire par rubicon** (le gagnant atteint au moins le **double** des
  points de l'adversaire) = **2 pts**.
- Départage : **points**, puis **goal-average** (différence de points), puis
  **total de points marqués**.
- **Qualification** : on **choisit le tour de départ** du tableau (taille en
  puissance de 2 ≤ nombre d'équipes). L'appli qualifie alors les meilleures
  équipes par priorité : **tous les 1ers de poule**, puis **tous les 2es**,
  puis **les meilleurs 3es**… jusqu'à remplir le tableau. Ex. 4 poules →
  tableau de 8 : les 4 1ers + les 4 2es ; tableau de 16 : 1ers + 2es + 3es +
  meilleurs 4es.
- **Tirage du tableau** (même règle quel que soit le format) : les **1ers**
  sont **avantagés** (ils tombent au 1er tour sur une équipe moins bien
  classée — un 3e en priorité, sinon un 2e), et **jamais deux 1ers** au 1er
  tour. Surtout, deux équipes d'une **même poule** sont **séparées le plus
  longtemps possible** : elles ne peuvent se recroiser qu'**au plus tard**
  dans le tableau. Ex. **4 poules, 2 qualifiés → 1/4** : le 1er et le 2e
  d'une même poule sont placés dans des **moitiés opposées** et ne peuvent se
  rejouer qu'**en finale** (jamais en 1/4 ni en 1/2).
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
