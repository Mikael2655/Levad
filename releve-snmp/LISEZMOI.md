# LEVAD – Outil de test SNMP (étape 1)

Cet outil interroge vos copieurs sur le réseau et affiche ce qu'ils répondent
(marque, modèle, n° de série, encre, compteurs). Il **lit seulement** : il ne
modifie rien sur les machines et n'envoie rien hors de votre réseau local.

## 1. Installation (une seule fois)

Il faut uniquement **Python 3** (version 3.8 ou plus récente). Aucune autre
installation : l'outil est un seul fichier, `releve_snmp.py`.

### Sous Windows
1. Allez sur https://www.python.org/downloads/ et cliquez sur « Download Python ».
2. Lancez le fichier téléchargé. **Cochez la case « Add python.exe to PATH »**
   en bas de la première fenêtre, puis cliquez sur « Install Now ».
3. Ouvrez le menu Démarrer, tapez `cmd` et ouvrez « Invite de commandes ».
4. Vérifiez : tapez `python --version` puis Entrée. Un numéro de version doit s'afficher.

### Sous Mac
1. Ouvrez l'application « Terminal » (Cmd + Espace, tapez `Terminal`).
2. Tapez `python3 --version` puis Entrée.
   - Si un numéro de version s'affiche : c'est prêt.
   - Sinon, le Mac propose d'installer les « outils de développement » : acceptez.
     Ou bien téléchargez Python sur https://www.python.org/downloads/.

## 2. Lancer l'outil

Dans la fenêtre noire (Invite de commandes / Terminal), placez-vous dans le
dossier `releve-snmp` de ce projet. Exemple si le dossier est sur le Bureau :

- Windows : `cd %USERPROFILE%\Desktop\releve-snmp`
- Mac : `cd ~/Desktop/releve-snmp`

Puis (remplacez l'adresse par celle de votre copieur ; sous Mac tapez `python3`
à la place de `python`) :

```
python releve_snmp.py 192.168.1.50
```

Plusieurs machines d'un coup :

```
python releve_snmp.py 192.168.1.50 192.168.1.51 10.0.0.20
```

Autres possibilités :

| Ce que vous voulez | Commande |
|---|---|
| Autre communauté SNMP que « public » | `python releve_snmp.py 192.168.1.50 -c maCommunaute` |
| Machines listées dans un fichier texte (une IP par ligne) | `python releve_snmp.py -f mes_machines.txt` |
| Chercher les machines d'un réseau | `python releve_snmp.py -d 192.168.1.0/24` |
| Chercher puis tout lire | `python releve_snmp.py -d 192.168.1.0/24 --lire-trouvees` |
| Attendre plus longtemps les réponses (réseau lent) | `python releve_snmp.py 192.168.1.50 --delai 5` |

Pour trouver l'adresse IP d'un copieur : imprimez la page de configuration
réseau, ou regardez dans les réglages réseau de son écran.

Pour savoir quelle plage scanner : Windows, tapez `ipconfig` ; Mac, tapez
`ifconfig | grep "inet "`. Si votre adresse est 192.168.1.23, la plage est
généralement `192.168.1.0/24`.

## 3. Où sont les résultats ?

- À l'écran : un résumé lisible par machine.
- Dans le dossier `resultats` (créé à côté du programme) : un fichier
  `releve_AAAA-MM-JJ_HHMMSS.json` avec **tout** ce que la machine a répondu
  (brut). Gardez-le : envoyez-le-moi s'il y a quelque chose d'inattendu.

## 4. Que comparer avec l'écran du copieur ?

Sur le copieur, affichez l'écran des compteurs (sur les Canon, en général la
touche « Compteur / Check Counter » ou le menu « Vérifier compteur »), puis
comparez :

1. **Modèle et numéro de série** : même modèle, même n° de série (souvent
   visible dans les infos « Appareil » ou sur l'étiquette).
2. **Niveaux d'encre** : noir, cyan, magenta, jaune en pourcentage. Une petite
   différence (quelques %) est normale, car certaines machines arrondissent.
3. **Bac récupérateur** : présent ou non, rempli à combien.
4. **Compteur total standard** : à comparer avec le total général affiché.
5. **Les compteurs Canon numérotés** (101, 102, 106, 108, 109, 112, 113, 122,
   123, 125, 501…) : comparez chaque numéro avec le même numéro sur l'écran du
   copieur (il est affiché devant chaque compteur). Notez ceux qui diffèrent.
6. **Totaux N&B et couleur calculés** : l'outil donne un total par « recette »
   (A, B ou C). Regardez laquelle correspond à votre total N&B / couleur
   habituel (celui que donne Hyperprint ou votre facturation). Si l'outil
   affiche « ATTENTION », c'est que les recettes ne donnent pas le même
   résultat : dites-moi laquelle est la bonne pour cette machine.

## 5. Si ça ne marche pas

- **« Pas de réponse »** : sur le copieur, vérifiez que le SNMP est activé
  (réglages réseau / SNMP), que l'adresse IP est la bonne, que la communauté
  est la bonne (option `-c`) et que votre ordinateur est sur le même réseau.
- **Windows demande d'autoriser Python dans le pare-feu** : acceptez pour les
  réseaux privés.
- **Rien ne s'affiche pour un client à distance** : l'outil ne fonctionne que
  sur le réseau local (adresses privées) ; les adresses publiques sont refusées
  volontairement.
