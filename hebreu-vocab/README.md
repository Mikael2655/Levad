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

**Sur mobile :** le plus pratique est de mettre le dossier en ligne
(par exemple avec GitHub Pages) ou d'ouvrir l'app sur le même Wi-Fi via
l'option 2 (`http://IP-de-votre-ordinateur:8000`).

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

## 📈 Comment marche la progression ?

Chaque mot a un niveau de 0 à 4 (les pastilles vertes sur la page
Progrès) :

- bonne réponse → le mot monte d'un niveau et revient moins souvent ;
- mauvaise réponse → il retombe à 0 et ressort très souvent.

La progression est enregistrée dans votre navigateur (localStorage) :
elle est conservée d'une session à l'autre sur le même appareil, et le
bouton « Remettre ma progression à zéro » (page Progrès) l'efface sans
toucher au vocabulaire.
