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
   rattaché à son équipe).
2. **＋ Donne** : pour chaque donne, indiquez qui prend, le contrat, les
   points réalisés par le preneur (0–162), la belote éventuelle et si la
   donne est contrée/surcontrée. Le score de la donne s'affiche en direct.
3. Le **cumul** de chaque équipe est en haut, et le **graphe** montre
   l'évolution donne après donne. Le nom du **distributeur** apparaît sur
   chaque ligne.
4. **Terminer & archiver** enregistre la partie dans l'historique.

Touchez une donne existante pour la **modifier** ou la **supprimer**.

## Règles de calcul appliquées

Pour chaque donne, une équipe prend un contrat et l'on saisit ses points de
cartes (0 à 162) :

- **Contrat réussi** (points du preneur + belote ≥ contrat)
  - Preneur = arrondi(**contrat + points du preneur**)
  - Défense = arrondi(162 − points du preneur)
- **Contrat chuté**
  - Preneur = 0
  - Défense = arrondi(**160 + contrat**)
- **Belote** (Roi + Dame d'atout) : **+20** au porteur si le contrat est
  réussi ; **en cas de chute, la belote va à l'adversaire** (la défense).
- **Contré** : l'équipe qui **gagne la donne** marque **2 × contrat + 162**
  (le preneur s'il réussit, sinon l'adversaire qui l'a fait chuter).
  **Surcontré** : **4 × contrat + 162**. La belote est doublée / quadruplée
  et suit la même règle (au vainqueur / à l'adversaire en cas de chute).
- Tout est **arrondi à la dizaine** (la belote s'ajoute après l'arrondi).

La partie est signalée gagnée dès qu'une équipe atteint l'objectif tout en
menant au score.

## Manches, revanche et belle

Un **compteur de manches gagnées** est affiché en haut (ex. `Nous 2 — 1 Eux`)
et se met à jour à chaque partie remportée. Quand le score est de **1–1**, un
badge **« Belle ! »** apparaît. Le bouton **🔁 Revanche** relance une partie
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
