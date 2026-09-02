# Levad — Proposition commerciale

Outil web (sans installation, **fonctionne hors-ligne**) pour préparer une
proposition commerciale d'impression : on saisit les données du client et de
chaque machine, l'outil calcule le comparatif **Situation Actuelle (SA)** vs
**Solution Proposée (SP)**, puis génère automatiquement :

- le **fichier Excel** « SA / SP type » (étude comparative de coûts) ;
- la **présentation PowerPoint** de l'offre, à partir de votre modèle complet
  (31 slides, charte Levad conservée à l'identique).

Aucune donnée n'est envoyée : tout reste dans le navigateur (localStorage).

## Nouveautés par rapport aux simulateurs Excel

- **Plusieurs machines** : chaque ligne représente un remplacement (une
  machine actuelle → une machine proposée) avec ses propres loyers,
  trimestres restants, volumes et coûts copie. Le tableau du PowerPoint et
  l'Excel se remplissent automatiquement, une ligne par machine, et le bloc
  « Solution proposée » du slide comparatif se décale selon le nombre de lignes.
- **Markup déverrouillable** : les coefficients de leasing (le markup
  commercial) ne sont modifiables qu'après saisie du mot de passe admin.

## Utilisation

1. Renseignez le **client**, le **commercial**, la **durée** (3/4/5 ans).
2. Ajoutez vos **machines** (bouton « ＋ Ajouter une machine ») et remplissez,
   pour chacune, la *Situation actuelle* et la *Solution proposée*. Les champs
   rarement utilisés (forfaits, TAS, scan to mail, recyclage…) sont sous
   « Options avancées ».
3. La **synthèse** (SA, SP, économie annuelle) se met à jour en direct.
4. Exportez : **⬇︎ Excel SA/SP** et **⬇︎ PowerPoint**.

## Logique de calcul (reprise des simulateurs)

Par machine, et par **trimestre** :

- **Rachat** du contrat actuel = `loyer actuel × trimestres restants`
  (0 pour un prospect).
- **Loyer proposé** = `(rachat + cadeaux + prix machine + livraison +
  installation + marge) × coefficient ÷ 100`.
- **Maintenance** N&B / couleur : `forfait × coût copie` si le forfait dépasse
  le volume réel, sinon `volume réel × coût copie`.
- **Total SA** = loyer actuel + maintenance + services (pass, e-maintenance…).
- **Total SP** = loyer proposé + coûts copie proposés + services proposés.
- **Économie annuelle** = `(Total SA − Total SP) × 4`.

### Coefficients de leasing (markup)

| Durée | Défaut commercial |
|------:|:-----------------:|
| 3 ans | 9,7 |
| 4 ans | 7,5 |
| 5 ans | 6,05 |

Déverrouillables via **🔒 Accès admin** (mot de passe par défaut : `levad`,
modifiable). C'est là qu'on passe, par exemple, au « vrai taux » (5 ans à 5,75).

## Accès admin

Le bouton **🔒 Accès admin** demande le mot de passe puis débloque l'édition
des coefficients. Le mot de passe peut être changé (stocké haché en local).
⚠️ Sécurité « de confort » : le gabarit et les calculs restent côté navigateur,
ce verrou empêche surtout une modification accidentelle des coefficients.

## Fonctionnement du PowerPoint

`assets/template.pptx` est votre présentation d'origine dans laquelle les
champs dynamiques ont été remplacés par des jetons `{{…}}`. À l'export, l'outil
ouvre ce gabarit (ZIP OOXML) dans le navigateur, injecte les valeurs et clone
la ligne de tableau pour chaque machine, sans rien modifier d'autre (catalogue
produits, sécurité, e-maintenance… restent intacts).

Champs injectés : date, contact/adresse client, nom & fonction du commercial,
machine(s) en titre de la lettre, tableaux comparatifs SA/SP (slide 26), et
synthèse « Bon pour accord » (slide 31).

Pour **mettre à jour le modèle** (nouveau design, nouvelles slides) tout en
gardant les jetons, régénérez `assets/template.pptx` avec le script
`tools/prepare_template.py`.

## Structure

```
proposition-commerciale/
  index.html
  css/style.css
  js/config.js        paramètres & valeurs par défaut
  js/utils.js         stockage local, téléchargement
  js/calc.js          moteur de calcul SA/SP + formatage
  js/export-excel.js  génération du .xlsx (SheetJS)
  js/export-pptx.js   injection dans le gabarit .pptx (JSZip)
  js/app.js           interface & événements
  vendor/             JSZip, SheetJS (locaux, hors-ligne)
  assets/template.pptx  votre modèle tokenisé
  tools/prepare_template.py  (re)génère le gabarit à partir du PPTX source
  sw.js, manifest.webmanifest, icon.png
```

Ouvrez `index.html` dans un navigateur, ou ajoutez la page à l'écran d'accueil
pour l'utiliser comme une application.
