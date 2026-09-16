# Levad — Gestion (CRM / Contrats / Facturation)

Outil interne (web, hors-ligne par défaut, synchronisable en ligne) pour
remplacer le tableur + suivi éparpillé : CRM (clients/prospects), contrats
de maintenance multi-activités, suivi des machines et de leurs compteurs,
facturation périodique automatisée, résiliations, prélèvement SEPA et
exports comptables.

Aucune donnée n'est envoyée à un tiers : en mode local tout reste dans le
navigateur (localStorage) ; en mode synchronisé (Firebase configuré),
les données transitent uniquement par votre projet Firestore.

## Démarrage

Ouvrez `index.html` dans un navigateur. Premier accès : identifiant **admin**,
mot de passe **levad2026** (à changer immédiatement dans *Utilisateurs*).

Par défaut, l'outil réutilise le projet Firebase déjà configuré pour
`proposition-commerciale` (mode **synchronisé**, comptes/données partagés
entre postes), mais avec des collections dédiées (`gestion_*`). Publiez
`firestore.rules` (voir le fichier, à fusionner avec celui de
proposition-commerciale) pour autoriser les lectures/écritures.

## Rôles

- **Administrateur** : accès total, y compris la gestion des comptes utilisateurs.
- **Administratif / Comptable** : clients, prospects, contrats, machines,
  compteurs, facturation, résiliations, prélèvements SEPA, exports compta,
  paramètres société. Ne gère pas les comptes utilisateurs.
- **Commercial** : voit uniquement les clients/prospects dont il est
  l'attitré (fiche + historique de factures), peut créer des **prospects**
  uniquement. Seule la partie administrative crée un client ou convertit un
  prospect en client.

## Modèle de facturation

Chaque **contrat** porte une activité (photocopieur, téléphonie, GED,
sécurité, informatique), une fréquence (mensuelle/trimestrielle), une durée
d'engagement, et des **lignes** :

- lignes **fixes** (abonnement, engagement de volume, opérateur téléphonie,
  licence M365…) : facturées **à échoir** (à l'avance) à chaque échéance ;
- lignes **compteur** (N&B / couleur) : ne portent que la règle de
  dépassement (quantité incluse + prix unitaire hors forfait) et sont
  soldées **à échu**, une fois les relevés saisis, sur la même facture que
  la période suivante.

**Relevés de compteurs** : saisie manuelle ou import Excel (colonnes
numéro de série/référence, date, N&B, couleur — ordre libre). Un relevé ne
peut jamais être inférieur au relevé précédent de la machine (ni supérieur
à un relevé déjà saisi plus tard). Entre deux facturations, c'est la valeur
**la plus haute** (= la plus récente) qui sert de base, moins le dernier
compteur déjà facturé.

**Facturation** (écran *Facturation*) : à la date choisie, l'outil liste
tous les contrats dont l'échéance (`prochaine facturation`) est atteinte,
avec un aperçu du montant (forfait à venir + dépassement de la période
écoulée) et un repère si des relevés manquent. La génération crée les
factures, avance l'échéance du contrat et enregistre les compteurs
facturés.

**Machines** : référence + numéro de série, rattachées à un contrat actif ;
historique complet des clients successifs (installation, transfert,
retrait). Au rattachement à un nouveau contrat, le dernier relevé connu de
la machine sert de base de départ (pas de double facturation en cas de
revente d'une machine récupérée).

**Résiliation** : `somme des forfaits trimestriels × trimestres restants`
+ `moyenne trimestrielle des dépassements facturés sur 12 mois (ou 6 mois
si supérieure) × trimestres restants`. Le nombre de trimestres restants est
arrondi au trimestre supérieur. La machine n'est pas retirée automatiquement
du contrat résilié : gérez son devenir (laissée/détruite/revendue) depuis
la fiche contrat.

## Envoi des factures & SEPA

- **Email** : « Marquer envoyée par email » ouvre votre messagerie
  (`mailto:`) avec un message pré-rempli ; l'outil ne peut pas joindre de
  pièce jointe automatiquement (pas de serveur d'envoi configuré) —
  utilisez « Imprimer / PDF » puis joignez le PDF manuellement.
- **Chorus Pro** : le dépôt se fait sur le portail Chorus Pro ; le bouton
  « Marquer déposée » ne fait que tracer le suivi dans l'outil (pas
  d'intégration API Chorus Pro/PISTE dans cette version).
- **Prélèvement SEPA** : l'écran *Prélèvements SEPA* regroupe les factures
  éligibles (statut envoyée/impayée, IBAN + mandat renseignés sur la fiche
  client) en une **remise** numérotée et génère le fichier **XML ISO 20022
  pain.008.001.02** (SEPA Direct Debit Core, récurrent) à déposer sur
  l'espace banque en ligne. Renseignez l'ICS, l'IBAN et le BIC de la
  société dans *Paramètres*.

## Exports comptables

Écran *Exports compta* : liste des clients (CSV), factures avec filtre de
dates (CSV), remises SEPA avec leur numéro et le détail des factures
groupées (CSV).

## Sécurité — modèle « de confort »

Identique à `proposition-commerciale` : connexion identifiant/mot de passe
gérée par l'application, connexion Firebase anonyme pour l'écriture. Les
rôles filtrent l'interface et les requêtes côté client, mais Firestore
n'empêche pas, au niveau base, un compte anonyme de lire une autre
collection `gestion_*` que la sienne. Adapté à une petite équipe de
confiance ; pour un cloisonnement infaillible il faudrait de vrais comptes
Firebase Auth par utilisateur + rôles (custom claims) + règles
conditionnelles.

## Structure

```
gestion/
  index.html
  css/style.css
  js/config.js        rôles, activités, constantes, paramètres société par défaut
  js/utils.js          dates, formatage, stockage, téléchargement
  js/models.js         structures par défaut (client, contrat, machine, facture…)
  js/store.js           Firestore/localStorage, générique par collection
  js/auth.js            comptes, connexion, permissions par rôle
  js/calc.js             moteur de facturation (échéances, dépassements, résiliation, cycle de vie machine)
  js/meters-import.js    saisie manuelle + import Excel des relevés
  js/sepa.js              remises + XML pain.008.001.02
  js/csv-export.js        exports comptables CSV + relances
  js/app.js                interface & routage des écrans
  vendor/                 ExcelJS, JSZip (locaux, hors-ligne)
  firestore.rules
```

## Limites connues de cette première version

- Pas d'envoi d'email automatique (aucun serveur SMTP disponible) : export
  PDF + `mailto:` pré-rempli.
- Pas d'intégration API Chorus Pro (dépôt manuel sur le portail, suivi
  local uniquement).
- La date exacte d'échéance (« à échoir ») est pilotée par un champ
  `prochaine facturation` par contrat qui avance automatiquement après
  chaque facturation ; elle n'est pas recalculée à partir d'une règle de
  calendrier fixe (dernier jour ouvré du mois), pour rester robuste à des
  facturations manuelles ou décalées. Ajustez-la manuellement sur un
  contrat si besoin (modifier le contrat).
- Une seule TVA par ligne, pas de multi-devise, pas de facture
  électronique normée (Factur-X) — à prévoir quand l'obligation
  s'appliquera à votre structure.
