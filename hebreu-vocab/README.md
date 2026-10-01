# עברית — Mon vocabulaire hébreu

Petite application web pour mémoriser du vocabulaire hébreu :
flashcards, QCM, mode « écris la traduction », avec répétition espacée
(les mots ratés reviennent plus souvent).

Aucune installation, aucun framework : du HTML/CSS/JavaScript pur.

## 🚀 Lancer l'application

**Option 1 — la plus simple :** double-cliquez sur `index.html`.
L'app s'ouvre dans votre navigateur, c'est tout.

**Option 2 — avec un petit serveur local** (nécessaire seulement si un
jour vous transformez `vocab.js` en vrai fichier `.json`) :

```bash
cd hebreu-vocab
python3 -m http.server 8000
```

Puis ouvrez http://localhost:8000 dans votre navigateur.

**Sur mobile / en ligne :** un workflow GitHub Actions
(`.github/workflows/deploy-hebreu-vocab.yml`) publie automatiquement ce
dossier sur GitHub Pages à chaque modification. Activation (une fois) :
sur GitHub, *Settings → Pages → Source : GitHub Actions*. L'app est
alors accessible sur `https://<votre-compte>.github.io/<repo>/`.
Sur iPhone, ouvrez cette adresse dans Safari puis « Partager →
Sur l'écran d'accueil » : l'app s'installe comme une vraie application.

## 👤 Profils

Au premier lancement, l'app demande un prénom : chaque profil a sa
propre progression (répétition espacée, scores), enregistrée dans le
navigateur de l'appareil. Plusieurs personnes peuvent donc utiliser la
même app — même sur un appareil partagé — sans mélanger leurs
statistiques. Le badge 👤 en haut à droite permet de changer de profil.
Il n'y a pas de mot de passe : c'est un partage de confiance.

Note : la progression reste locale à chaque appareil (pas de
synchronisation entre votre téléphone et votre ordinateur).

## ✏️ Ajouter des mots

Ouvrez `js/vocab.js` avec n'importe quel éditeur de texte et ajoutez une
ligne sur ce modèle :

```js
{ he: "שלום", translit: "shalom", fr: "bonjour / paix", cat: "Salutations" },
```

- `he` : le mot en hébreu
- `translit` : la prononciation
- `fr` : la traduction française — plusieurs réponses acceptées si vous
  les séparez par ` / ` (ex. `"bonjour / paix"`) ; ce qui est entre
  parenthèses est ignoré dans le mode « écrire »
- `cat` : le thème (une nouvelle catégorie apparaît automatiquement dans
  le filtre)

⚠️ N'oubliez pas la **virgule** à la fin de chaque ligne, et enregistrez
le fichier en UTF-8 (c'est le réglage par défaut de presque tous les
éditeurs).

## 🔤 Ajouter des verbes (conjugaison)

Les verbes vivent dans `js/verbes.js`. Chaque verbe est un bloc avec
son infinitif, sa traduction, et un tableau par temps :

```js
{
  inf: "לכתוב", translit: "lichtov", fr: "écrire",
  temps: {
    "Présent": [
      { p: "masc. sing. (אני / אתה / הוא)", he: "כותב", t: "kotev" },
      // ... une ligne par personne
    ],
    "Passé": [ /* ... */ ],
    "Futur": [ /* ... */ ],
  },
},
```

- `p` : la personne (libellé libre, affiché tel quel)
- `he` : la forme conjuguée en hébreu
- `t` : sa prononciation

Vous pouvez ajouter **n'importe quel temps** (impératif, etc.) : il
apparaîtra automatiquement dans le filtre des exercices. Le plus simple
est de copier un bloc entier de verbe et de le modifier.

L'onglet Conjugaison propose trois modes :

- **📖 Tableaux** : consulter la conjugaison complète d'un verbe ;
- **✅ QCM** : on vous demande une forme (verbe + temps + personne),
  vous choisissez la bonne écriture parmi quatre ;
- **✍️ Écrire** : vous tapez la forme demandée, en translittération
  (ex. `katavti`, majuscules/accents/apostrophes ignorés, `kh` accepté
  pour `ch`) ou directement en hébreu si vous avez le clavier.

## 📈 Comment marche la progression ?

Chaque mot a un niveau de 0 à 4 (les pastilles vertes sur la page
Progrès) :

- bonne réponse → le mot monte d'un niveau et revient moins souvent ;
- mauvaise réponse → il retombe à 0 et ressort très souvent.

La progression est enregistrée dans votre navigateur (localStorage) :
elle est conservée d'une session à l'autre sur le même appareil, et le
bouton « Remettre ma progression à zéro » (page Progrès) l'efface sans
toucher au vocabulaire.
