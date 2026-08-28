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
  Pour les formats à poules on choisit le **nombre de poules** et le **nombre
  d'équipes par poule** (petits tournois de 4 ou 8 équipes possibles :
  ex. 1 poule de 4, ou 8 équipes en élimination directe).
- **Administration** (protégée par un code) :
  1. **Saisir les équipes** : on tape le nom d'une équipe ; l'appli **tire au
     sort** sa place (poule + numéro, ou position dans le tableau).
  2. **Saisir les scores** des matchs (poules et/ou tableau).
  3. En format « poules + tableau », **clôturer les poules** génère le tableau
     final (têtes de série tirées du classement).
- **Classement** (vue publique, partageable) : classement des poules,
  meilleurs 3es, et tableau final en direct — selon le format choisi.

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
- **1/8** et **1/4** en 1500 points : seule la victoire compte.
- **1/2** en **2000 points**. **Petite finale** (3e place) en 2000 points.
- **Finale** : match **aller / retour**, plus la **belle** si 1 partout. Il faut
  **2 victoires** pour être sacré.

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
