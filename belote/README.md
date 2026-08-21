# ♠ Belote — Compteur de points

Petite application web (sans installation, **fonctionne hors-ligne**) pour
compter les points d'une partie de belote à **1500** ou **2000** points.

Aucun serveur, aucune donnée envoyée : tout est enregistré dans votre
navigateur. La partie en cours reprend automatiquement à la réouverture, et
les parties terminées sont archivées.

## Utilisation

Ouvrez simplement `index.html` dans un navigateur (ou ajoutez la page à
l'écran d'accueil de votre téléphone pour l'utiliser comme une appli).

1. **Nouvelle partie** : choisissez l'objectif (1500 ou 2000), nommez les
   deux équipes et les joueurs **dans l'ordre de distribution** (chacun
   rattaché à son équipe). Les flèches **↑ ↓** permettent de réordonner les
   joueurs (donc de changer qui distribue en premier) ; on peut aussi
   changer les équipes. Ces réglages sont modifiables à tout moment via le
   menu **⋯ → Équipes, joueurs & ordre** (utile entre deux manches).
2. **＋ Donne** : ajoute une ligne de saisie directement dans la liste, en
   deux temps :
   1. **Le contrat** — quatre menus déroulants compacts : **Contrat**
      (80…160, Passe, Capot ou Saisie libre), **Couleur** (atout),
      **Qui prend** et **Enchère** (normale / contré / surcontré). On
      **valide** : le contrat se fige.
   2. **Les points** — on saisit les **points d'une équipe** (au choix, le
      preneur ou la défense) **+ la belote**. Le **nouveau total** de chaque
      équipe s'affiche en direct, puis on **ajoute la donne**.

   Le bouton **✎ modifier** revient au contrat. Toucher une **donne déjà
   enregistrée** ouvre sa fiche pour la corriger ou la supprimer.
3. Le **cumul** de chaque équipe est en haut, et le **graphe** montre
   l'évolution donne après donne. Le nom du **distributeur** apparaît sur
   chaque ligne.
4. **Terminer & archiver** enregistre la partie dans l'historique.

Touchez une donne existante pour la **modifier** ou la **supprimer**.

## Règles de calcul appliquées

Pour chaque donne, une équipe prend un contrat et l'on saisit les points de
cartes d'un camp (au choix : le preneur **ou** la défense). Le total des
cartes est **160** (arrondi à la dizaine), donc l'autre camp = 160 − saisi :

- **Contrat réussi** (points du preneur + belote ≥ contrat)
  - Preneur = arrondi(**contrat + points du preneur**)
  - Défense = arrondi(**160 − points du preneur**)
- **Contrat chuté**
  - Preneur = 0
  - Défense = arrondi(**160 + contrat**)
- **Belote** (Roi + Dame d'atout) : **+20** au porteur si le contrat est
  réussi ; **en cas de chute, la belote va à l'adversaire** (la défense).
- **Contré / surcontré** : l'équipe qui **gagne la donne** (le preneur s'il
  réussit, sinon l'adversaire qui l'a fait chuter) marque, selon l'objectif :

  | Enchère    | Partie en 1500        | Partie en 2000              |
  | ---------- | --------------------- | --------------------------- |
  | Contré     | contrat × 2 + 160     | contrat × 2 + 160 × 2       |
  | Surcontré  | contrat × 4 + 160     | contrat × 4 + 160 × 4       |

  Seul le **contrat** est multiplié par le facteur ; le forfait de 160 ne
  l'est **qu'en partie à 2000**. La **belote** n'est **jamais multipliée** :
  elle reste à **+20** (au vainqueur, ou à l'adversaire en cas de chute).
- **Capot** (un camp remporte tous les plis = **162 points**), **quel que
  soit l'objectif de la partie** :
  - **Annoncé** aux enchères : choisir **« Capot »** dans la liste des
    contrats. Vaut **500** (contré → 1000, surcontré → 2000). Annoncé mais
    **chuté**, la valeur va à l'adversaire.
  - **Non annoncé** : il suffit de saisir **162** au camp qui a tout ramassé
    (ou **0** à l'autre camp, c'est équivalent) — l'appli compte
    automatiquement **contrat + 250**. Le champ **laissé vide** reste neutre
    (aucun capot déduit tant qu'on n'a rien saisi).
- Tout est **arrondi à la dizaine** (la belote s'ajoute après l'arrondi).

La **couleur** (♠ ♥ ♦ ♣) est purement indicative : elle n'a **aucun effet
sur les points**, c'est juste pour suivre les donnes.

Si **personne ne prend**, choisissez **« Passe »** en haut de la liste des
contrats : la donne vaut **0 – 0** et la distribution passe au joueur suivant.

Pour une **saisie libre**, choisissez **« ✎ Saisie libre »** dans la liste des
contrats : vous entrez directement les points à ajouter à chaque équipe
(valeurs libres, **négatives possibles**). Pratique pour **corriger une
erreur** ou **reporter un score** noté sur une feuille avant de reprendre.

Pour gagner la partie, il faut **dépasser** l'objectif (donc **≥ 1510** ou
**≥ 2010**) tout en menant au score : à 1500 ou 2000 pile, ce n'est pas
encore gagné. Dès qu'une équipe l'emporte, une **fenêtre de victoire**
s'affiche (avec les points de la manche) et propose **Revanche** ou
**Terminer & archiver**.

## Manches, revanche et belle

Chaque manche remportée rapporte des **points** :

- **2 points** si le vainqueur a **au moins le double** des points du perdant,
- **1 point** sinon.

Le **compteur de points** est affiché en haut (ex. `Nous 3 — 1 Eux`) et se met
à jour à chaque partie remportée. Le bouton **🔁 Revanche** relance une partie
avec les mêmes équipes et joueurs (le compteur continue), et le bouton **↺**
(ou le menu) permet de **remettre les compteurs à zéro**.

## Fichiers

| Fichier                 | Rôle                                        |
| ----------------------- | ------------------------------------------- |
| `index.html`            | Structure de la page                        |
| `css/style.css`         | Styles (clair / sombre, mobile d'abord)     |
| `js/app.js`             | Logique : calcul, écrans, graphe, stockage  |
| `sw.js`                 | Cache hors-ligne (service worker)           |
| `manifest.webmanifest`  | Métadonnées PWA (installation sur mobile)   |
| `icon.png`              | Icône de l'application                       |
