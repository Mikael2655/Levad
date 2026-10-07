#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LEVAD - Outil de test SNMP pour copieurs (ÉTAPE 1)

Ce que fait ce programme :
  - il interroge un ou plusieurs copieurs (par leur adresse IP) en SNMP ;
  - il affiche marque, modèle, n° de série, niveaux d'encre, compteurs ;
  - pour les Canon, il lit TOUS les compteurs numérotés (branche privée 1602) ;
  - il enregistre tout le détail brut dans un fichier JSON daté.

Ce que le programme NE FAIT PAS :
  - aucune écriture sur les machines (uniquement des lectures : GET / GETNEXT / GETBULK) ;
  - en mode normal, aucun envoi hors du réseau local (les adresses publiques sont refusées) ;
  - en mode client uniquement, le résultat final est envoyé à LEVAD en HTTPS (voir config_envoi.py) ;
  - aucun serveur, aucune base de données, aucune fenêtre.

Aucune installation de bibliothèque n'est nécessaire : le dialogue SNMP (version 2c)
est écrit directement ici avec les outils fournis d'origine avec Python. Le même code
fonctionne donc à l'identique sous Windows et sous macOS.
"""

import argparse
import concurrent.futures
import datetime
import ipaddress
import json
import os
import random
import socket
import sys
import time
import io
import contextlib
import platform
import ssl
import urllib.request

VERSION_PROGRAMME = "0.3"

# Adresse de réception et jeton : ils sont dans le petit fichier config_envoi.py.
# Si l'adresse est vide, le mode client n'envoie rien et enregistre un fichier à la place.
try:
    from config_envoi import URL_RECEPTION, JETON
except ImportError:
    URL_RECEPTION, JETON = "", ""
URL_RECEPTION = os.environ.get("LEVAD_URL", URL_RECEPTION)
JETON = os.environ.get("LEVAD_JETON", JETON)

# ----------------------------------------------------------------------------
# 1. Les "adresses" (OID) que l'on sait lire
# ----------------------------------------------------------------------------
OID_SYS_DESCR = "1.3.6.1.2.1.1.1.0"       # description de la machine
OID_SYS_OBJECT_ID = "1.3.6.1.2.1.1.2.0"   # identifiant du constructeur
OID_SYS_NAME = "1.3.6.1.2.1.1.5.0"        # nom réseau

# Les branches que l'on parcourt entièrement et que l'on garde dans le JSON brut
BRANCHES = {
    "systeme": "1.3.6.1.2.1.1",
    "imprimante_standard": "1.3.6.1.2.1.43",     # MIB imprimante standard (RFC 3805)
    "peripheriques": "1.3.6.1.2.1.25.3.2",       # liste des périphériques (modèle)
    "canon_prive": "1.3.6.1.4.1.1602",           # branche privée Canon
}

OID_PRT_NOM = "1.3.6.1.2.1.43.5.1.1.16"          # nom de l'imprimante
OID_PRT_SERIE = "1.3.6.1.2.1.43.5.1.1.17"        # numéro de série
OID_PRT_COMPTEUR_TOTAL = "1.3.6.1.2.1.43.10.2.1.4"   # compteur total standard
OID_PRT_CONSOMMABLES = "1.3.6.1.2.1.43.11.1.1"   # table des consommables (encre, bacs...)
OID_PRT_COULEURS = "1.3.6.1.2.1.43.12.1.1"       # table des couleurs d'encre
OID_HR_DEVICE_DESCR = "1.3.6.1.2.1.25.3.2.1.3"

# Compteurs Canon (constaté sur une iR-ADV C3520) : deux tables ...<colonne>.<numéro de compteur>
#  - 1.11.1.4.1 : TOUS les compteurs de la machine (une quarantaine)
#  - 1.11.1.3.1 : seulement ceux choisis pour l'affichage sur l'écran du copieur
# La colonne 4 contient la valeur.
OID_CANON_COMPTEURS_TOUS = "1.3.6.1.4.1.1602.1.11.1.4.1"
OID_CANON_COMPTEURS_ECRAN = "1.3.6.1.4.1.1602.1.11.1.3.1"
OID_CANON_NOMS_ECRAN = "1.3.6.1.4.1.1602.1.11.2.2.1"    # colonne 2 = numéro, 3 = nom, 4 = valeur
OID_CANON_NOMS_TOUS = "1.3.6.1.4.1.1602.1.11.2.1.1"     # colonne 2 = nom, 3 = valeur (même ordre)
OID_CANON_BRANCHE_COMPTEURS = "1.3.6.1.4.1.1602.1.11"
CANON_COLONNE_VALEUR = "4"

# Compteurs Canon que l'on attend habituellement (pour afficher "non disponible")
COMPTEURS_CANON_ATTENDUS = [101, 102, 105, 106, 108, 109, 112, 113, 114,
                            122, 123, 124, 125, 501]

# Numéro d'entreprise -> marque (les numéros viennent de la liste officielle IANA)
MARQUES_PAR_NUMERO = {
    "1602": "Canon", "11": "HP", "367": "Ricoh", "253": "Xerox",
    "18334": "Konica Minolta", "1347": "Kyocera", "2435": "Brother",
    "641": "Lexmark", "2385": "Sharp", "1248": "Epson", "236": "Samsung",
    "2001": "OKI", "297": "Ricoh (Savin/Lanier)", "10642": "Toshiba TEC",
    "1129": "Toshiba TEC",
}
# Mots cherchés dans le texte de description si le numéro ne suffit pas
MARQUES_PAR_TEXTE = ["Canon", "HP", "Hewlett", "Ricoh", "Xerox", "Konica", "Minolta",
                     "Kyocera", "Brother", "Lexmark", "Sharp", "Epson", "Samsung",
                     "OKI", "Toshiba", "Develop", "Olivetti", "Gestetner", "Savin",
                     "Lanier", "Utax", "Triumph-Adler"]

# Marqueurs spéciaux pour les réponses SNMP "pas de valeur" / "fin de branche"
ABSENT = None          # noSuchObject / noSuchInstance
FIN_BRANCHE = "<FIN>"  # endOfMibView


# ----------------------------------------------------------------------------
# 2. Le "langage" SNMP (encodage BER) : on fabrique et on lit les paquets
# ----------------------------------------------------------------------------
def _longueur(n):
    """Encode la longueur d'un bloc."""
    if n < 128:
        return bytes([n])
    b = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return bytes([0x80 | len(b)]) + b


def _bloc(tag, contenu):
    """Un bloc = type + longueur + contenu."""
    return bytes([tag]) + _longueur(len(contenu)) + contenu


def _entier(v):
    return _bloc(0x02, v.to_bytes((v.bit_length() + 8) // 8, "big", signed=True))


def _oid(texte):
    parts = [int(x) for x in texte.strip(".").split(".")]
    corps = bytearray([40 * parts[0] + parts[1]])
    for n in parts[2:]:
        morceau = [n & 0x7F]
        n >>= 7
        while n:
            morceau.append(0x80 | (n & 0x7F))
            n >>= 7
        corps += bytes(reversed(morceau))
    return _bloc(0x06, bytes(corps))


def _lire_bloc(data, pos):
    """Lit un bloc à la position pos. Retourne (type, début contenu, fin contenu)."""
    tag = data[pos]
    longueur = data[pos + 1]
    pos += 2
    if longueur & 0x80:
        n = longueur & 0x7F
        longueur = int.from_bytes(data[pos:pos + n], "big")
        pos += n
    fin = pos + longueur
    if fin > len(data):
        raise ValueError("paquet tronqué")
    return tag, pos, fin


def _decoder_oid(octets):
    nombres, courant = [], 0
    for o in octets:
        courant = (courant << 7) | (o & 0x7F)
        if not o & 0x80:
            nombres.append(courant)
            courant = 0
    premier = nombres[0]
    if premier < 40:
        debut = [0, premier]
    elif premier < 80:
        debut = [1, premier - 40]
    else:
        debut = [2, premier - 80]
    return ".".join(str(x) for x in debut + nombres[1:])


def _texte(octets):
    """Transforme des octets en texte lisible ; sinon en hexadécimal (ex. adresse MAC)."""
    octets = octets.rstrip(b"\x00")
    try:
        t = octets.decode("utf-8")
        if all(c.isprintable() or c in "\r\n\t" for c in t):
            return t
    except UnicodeDecodeError:
        pass
    return "0x" + octets.hex()


def _decoder_valeur(tag, octets):
    if tag == 0x02:                                   # entier
        return int.from_bytes(octets, "big", signed=True)
    if tag in (0x41, 0x42, 0x43, 0x46):               # Counter32, Gauge32, TimeTicks, Counter64
        return int.from_bytes(octets, "big")
    if tag == 0x04:                                   # texte
        return _texte(octets)
    if tag == 0x06:                                   # OID
        return _decoder_oid(octets)
    if tag == 0x40 and len(octets) == 4:              # adresse IP
        return ".".join(str(o) for o in octets)
    if tag == 0x05:                                   # vide
        return None
    if tag in (0x80, 0x81):                           # noSuchObject / noSuchInstance
        return ABSENT
    if tag == 0x82:                                   # endOfMibView
        return FIN_BRANCHE
    return "0x" + octets.hex()                        # type inconnu : on garde en brut


def construire_requete(communaute, type_pdu, id_requete, a, b, oids, version=1):
    """
    Fabrique un paquet SNMP. version : 1 = SNMP v2c, 0 = SNMP v1 (plus ancien).
    type_pdu : 0xA0 = GET, 0xA1 = GETNEXT, 0xA5 = GETBULK (tous en lecture seule).
    Pour GET/GETNEXT : a = 0, b = 0. Pour GETBULK : a = 0, b = nombre de réponses voulues.
    """
    liaisons = b"".join(_bloc(0x30, _oid(o) + b"\x05\x00") for o in oids)
    pdu = _bloc(type_pdu, _entier(id_requete) + _entier(a) + _entier(b) + _bloc(0x30, liaisons))
    return _bloc(0x30, _entier(version) + _bloc(0x04, communaute.encode("utf-8")) + pdu)


def lire_reponse(data, id_attendu):
    """Décode une réponse. Retourne (code_erreur, [(oid, valeur), ...])."""
    _, p, fin = _lire_bloc(data, 0)
    t, d, f = _lire_bloc(data, p)          # version
    t, d, f = _lire_bloc(data, f)          # communauté
    tag, p, fin = _lire_bloc(data, f)      # PDU
    if tag != 0xA2:
        raise ValueError("ce n'est pas une réponse")
    t, d, f = _lire_bloc(data, p)          # identifiant de requête
    if int.from_bytes(data[d:f], "big", signed=True) != id_attendu:
        raise ValueError("réponse à une autre question")
    t, d, f = _lire_bloc(data, f)          # code d'erreur
    erreur = int.from_bytes(data[d:f], "big", signed=True)
    t, d, f = _lire_bloc(data, f)          # position de l'erreur
    _, p, fin_liste = _lire_bloc(data, f)  # liste des valeurs
    valeurs = []
    while p < fin_liste:
        _, d, f = _lire_bloc(data, p)                  # une paire (oid, valeur)
        _, d2, f2 = _lire_bloc(data, d)                # l'oid
        oid = _decoder_oid(data[d2:f2])
        tag_v, d3, f3 = _lire_bloc(data, f2)           # la valeur
        valeurs.append((oid, _decoder_valeur(tag_v, data[d3:f3])))
        p = f
    return erreur, valeurs


# ----------------------------------------------------------------------------
# 3. Le client SNMP (envoi / réception)
# ----------------------------------------------------------------------------
class ErreurSnmp(Exception):
    pass


class PasDeReponse(ErreurSnmp):
    pass


def _cle(oid):
    """Pour comparer deux OID numériquement."""
    return tuple(int(x) for x in oid.split("."))


def _dans_branche(oid, racine):
    return oid == racine or oid.startswith(racine + ".")


class ClientSnmp:
    def __init__(self, ip, communaute="public", delai=2.0, essais=1, port=161, version=1):
        self.ip, self.communaute, self.delai, self.essais, self.port = ip, communaute, delai, essais, port
        self.version = version      # 1 = SNMP v2c, 0 = SNMP v1

    def _echange(self, type_pdu, a, b, oids):
        id_req = random.randint(1, 0x7FFFFFF)
        paquet = construire_requete(self.communaute, type_pdu, id_req, a, b, oids, self.version)
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            for _ in range(self.essais + 1):
                sock.sendto(paquet, (self.ip, self.port))
                limite = time.time() + self.delai
                while True:
                    reste = limite - time.time()
                    if reste <= 0:
                        break
                    sock.settimeout(reste)
                    try:
                        data, _ = sock.recvfrom(65535)
                    except socket.timeout:
                        break
                    except OSError as e:     # ex. machine qui refuse (Windows : "connexion réinitialisée")
                        raise ErreurSnmp("connexion refusée ou réseau injoignable (%s)" % e)
                    try:
                        return lire_reponse(data, id_req)
                    except (ValueError, IndexError):
                        continue             # paquet qui n'est pas pour nous : on ignore
            raise PasDeReponse("aucune réponse dans le délai imparti")
        finally:
            sock.close()

    def lire(self, oids):
        """Lit des valeurs précises. Retourne {oid: valeur ou None}."""
        _, valeurs = self._echange(0xA0, 0, 0, oids)
        resultat = {o: None for o in oids}
        for oid, v in valeurs:
            if v != FIN_BRANCHE:
                resultat[oid] = v
        return resultat

    def parcourir(self, racine, maximum=20000):
        """
        Parcourt toute une branche. Retourne (liste de (oid, valeur), message d'erreur ou None).
        On essaie d'abord le mode rapide (GETBULK), puis le mode lent (GETNEXT) si la machine
        ne sait pas le faire.
        """
        resultats, courant, dernier = [], racine, None
        bulk, repetitions = self.version == 1, 20     # le mode rapide n'existe pas en SNMP v1
        while len(resultats) < maximum:
            try:
                if bulk:
                    erreur, valeurs = self._echange(0xA5, 0, repetitions, [courant])
                else:
                    erreur, valeurs = self._echange(0xA1, 0, 0, [courant])
            except PasDeReponse:
                if bulk and not resultats:
                    bulk = False          # on retente en mode lent
                    continue
                return resultats, "la machine a cessé de répondre pendant la lecture"
            except ErreurSnmp as e:
                return resultats, str(e)
            if erreur == 1 and bulk and repetitions > 1:   # réponse trop grosse : on en demande moins
                repetitions = max(1, repetitions // 2)
                continue
            if erreur != 0 or not valeurs:
                break
            for oid, v in valeurs:
                if v == FIN_BRANCHE or not _dans_branche(oid, racine):
                    return resultats, None
                if dernier is not None and _cle(oid) <= _cle(dernier):
                    return resultats, None           # la machine tourne en rond : on arrête
                resultats.append((oid, v))
                dernier = oid
            courant = dernier
        return resultats, None


# ----------------------------------------------------------------------------
# 4. Lecture et interprétation d'une machine
# ----------------------------------------------------------------------------
def deviner_marque(sys_object_id, descr, branche_canon_presente):
    if branche_canon_presente:
        return "Canon"
    if sys_object_id and sys_object_id.startswith("1.3.6.1.4.1."):
        numero = sys_object_id.split(".")[6] if len(sys_object_id.split(".")) > 6 else ""
        if numero in MARQUES_PAR_NUMERO:
            return MARQUES_PAR_NUMERO[numero]
    for mot in MARQUES_PAR_TEXTE:
        if descr and mot.lower() in descr.lower():
            return mot
    return None


def _premier(brut, prefixe):
    """Première valeur du brut dont l'OID commence par prefixe."""
    for oid in sorted(brut, key=_cle):
        if oid.startswith(prefixe + ".") and brut[oid] not in (None, ""):
            return brut[oid]
    return None


def _couleur_depuis_texte(texte):
    t = (texte or "").lower()
    # l'ordre compte : on teste les couleurs avant le noir ("black" peut apparaître dans "Black/cyan")
    for mots, nom in ((("cyan",), "cyan"), (("magenta",), "magenta"),
                      (("yellow", "jaune"), "jaune"),
                      (("black", "noir", "bk"), "noir")):
        if any(m in t for m in mots):
            return nom
    return None


def interpreter_consommables(brut):
    """
    Lit la table des consommables standard. Retourne (encres, bacs, autres).
    Chaque élément : {"description", "couleur", "niveau", "capacite", "pourcent", "note"}.
    """
    lignes = {}
    prefixe = OID_PRT_CONSOMMABLES + "."
    for oid, v in brut.items():
        if oid.startswith(prefixe):
            colonne, _, index = oid[len(prefixe):].partition(".")
            lignes.setdefault(index, {})[colonne] = v
    # Table des couleurs (secours quand la description ne dit pas la couleur)
    couleurs = {}
    prefixe_c = OID_PRT_COULEURS + "."
    for oid, v in brut.items():
        if oid.startswith(prefixe_c) and oid[len(prefixe_c):].startswith("4."):
            couleurs[oid[len(prefixe_c) + 2:]] = v
    encres, bacs, autres = [], [], []
    for index in sorted(lignes, key=_cle):
        c = lignes[index]
        description = c.get("6") if isinstance(c.get("6"), str) else ""
        niveau, capacite = c.get("9"), c.get("8")
        elem = {"index": index, "description": description, "couleur": None,
                "niveau": niveau, "capacite": capacite, "pourcent": None, "note": None}
        elem["couleur"] = _couleur_depuis_texte(description)
        if elem["couleur"] is None and c.get("3") is not None:
            colorant = couleurs.get(index.split(".")[0] + "." + str(c.get("3")))
            elem["couleur"] = _couleur_depuis_texte(colorant)
        if isinstance(niveau, int) and isinstance(capacite, int):
            if niveau >= 0 and capacite > 0:
                elem["pourcent"] = max(0, min(100, round(100.0 * niveau / capacite)))
            elif niveau == -3:
                elem["note"] = "présent, niveau non chiffré"
            elif niveau == -2:
                elem["note"] = "niveau inconnu"
            else:
                elem["note"] = "niveau non communiqué par la machine"
        else:
            elem["note"] = "niveau non communiqué par la machine"
        texte_min = description.lower()
        classe = c.get("4")      # 3 = se consomme (encre), 4 = se remplit (récupérateur)
        if c.get("5") == 9 or "drum" in texte_min or "tambour" in texte_min:
            autres.append(elem)      # tambour (type 9) : ce n'est pas de l'encre
        elif classe == 4 or any(m in texte_min for m in ("waste", "récupér", "recuper", "usag", "collecteur")):
            bacs.append(elem)
        elif elem["couleur"] and classe in (3, None):
            encres.append(elem)
        else:
            autres.append(elem)
    return encres, bacs, autres


def _table_canon(brut, racine):
    """Lit une table Canon : retourne {numéro de ligne: {colonne: valeur}}."""
    lignes = {}
    prefixe = racine + "."
    for oid, v in brut.items():
        if oid.startswith(prefixe):
            colonne, _, ligne = oid[len(prefixe):].partition(".")
            if ligne.isdigit():
                lignes.setdefault(int(ligne), {})[colonne] = v
    return lignes


def interpreter_compteurs_canon(brut):
    """
    Extrait les compteurs Canon numérotés.
    Retourne {numéro: {"valeur", "oid", "affiche_ecran", "nom"}}.
    """
    compteurs = {}
    tous = _table_canon(brut, OID_CANON_COMPTEURS_TOUS)
    ecran = _table_canon(brut, OID_CANON_COMPTEURS_ECRAN)
    for table in (tous, ecran):
        for n, col in table.items():
            if isinstance(col.get(CANON_COLONNE_VALEUR), int):
                fiche = compteurs.setdefault(n, {"valeur": col[CANON_COLONNE_VALEUR], "oid": None,
                                                 "affiche_ecran": False, "nom": None})
                fiche["oid"] = fiche["oid"] or "%s.%s.%d" % (
                    OID_CANON_COMPTEURS_TOUS if table is tous else OID_CANON_COMPTEURS_ECRAN,
                    CANON_COLONNE_VALEUR, n)
    for n in ecran:
        if n in compteurs:
            compteurs[n]["affiche_ecran"] = True

    # Noms des compteurs : la table de l'écran donne numéro + nom ; la table complète donne
    # les noms dans le même ordre que les numéros (on ne s'en sert que si les valeurs concordent).
    for col in _table_canon(brut, OID_CANON_NOMS_ECRAN).values():
        if col.get("2") in compteurs and isinstance(col.get("3"), str):
            compteurs[col["2"]]["nom"] = col["3"]
    noms = _table_canon(brut, OID_CANON_NOMS_TOUS)
    numeros = sorted(n for n in tous if n in compteurs)
    if noms and len(noms) == len(numeros) and all(
            noms[i + 1].get("3") == compteurs[n]["valeur"] for i, n in enumerate(numeros)):
        for i, n in enumerate(numeros):
            compteurs[n]["nom"] = compteurs[n]["nom"] or noms[i + 1].get("2")
    if compteurs:
        return compteurs

    # Plan B : tables inconnues -> on prend tout nombre entier de la branche ...1602.1.11
    # dont le dernier chiffre est un numéro de compteur plausible (100 à 999).
    for oid, v in brut.items():
        if oid.startswith(OID_CANON_BRANCHE_COMPTEURS + ".") and isinstance(v, int):
            dernier = oid.rsplit(".", 1)[1]
            if dernier.isdigit() and 100 <= int(dernier) <= 999:
                compteurs.setdefault(int(dernier), {"valeur": v, "oid": oid,
                                                    "affiche_ecran": False, "nom": None})
    return compteurs


def calculer_totaux(compteurs):
    """
    Les trois recettes d'après le cahier des charges (A3 compté double), à titre d'information.
    Retourne (liste de recettes applicables, recette retenue, avertissement ou None).
    """
    def val(n):
        return compteurs[n]["valeur"] if n in compteurs else None

    def somme(termes):
        """termes = [(coefficient, numéro), ...] ; None si un compteur manque."""
        if any(val(n) is None for _, n in termes):
            return None
        return sum(coef * val(n) for coef, n in termes)

    definitions = [
        ("A", "Directe : 109 / 106",
         [(1, 109)], [(1, 106)]),
        ("B", "Total + grands formats : 108 + 112 / 125 + 122",
         [(1, 108), (1, 112)], [(1, 125), (1, 122)]),
        ("C", "Détaillée : 112 x 2 + 113 / 122 x 2 + 123",
         [(2, 112), (1, 113)], [(2, 122), (1, 123)]),
    ]
    applicables = []
    for lettre, nom, nb, coul in definitions:
        total_nb, total_coul = somme(nb), somme(coul)
        if total_nb is not None and total_coul is not None:
            applicables.append({"recette": lettre, "formule": nom, "total_nb": total_nb,
                                "total_couleur": total_coul})
    retenue = applicables[0] if applicables else None
    avertissement = None
    if len(applicables) > 1:
        differents = {(r["total_nb"], r["total_couleur"]) for r in applicables}
        if len(differents) > 1:
            avertissement = ("ATTENTION : plusieurs recettes sont possibles et donnent des résultats "
                             "différents. Comparez avec l'écran du copieur pour savoir laquelle est juste.")
    return applicables, retenue, avertissement


NOMS_VERSION = {1: "v2c", 0: "v1"}


def ouvrir_client(ip, communaute, delai, port, versions):
    """
    Essaie les versions SNMP demandées l'une après l'autre (v2c d'abord, puis v1).
    Retourne (client, valeurs de base). Lève PasDeReponse si aucune ne répond.
    """
    derniere = None
    for version in versions:
        client = ClientSnmp(ip, communaute, delai, port=port, version=version)
        try:
            return client, client.lire([OID_SYS_DESCR, OID_SYS_OBJECT_ID, OID_SYS_NAME])
        except ErreurSnmp as e:
            derniere = e
    raise derniere


def racines_a_lire():
    """
    Les branches à lire, découpées en petits morceaux : on les lit plusieurs à la fois,
    ce qui est beaucoup plus rapide que de tout parcourir d'un seul trait.
    """
    racines = [BRANCHES["systeme"], BRANCHES["peripheriques"]]
    racines += ["%s.%d" % (BRANCHES["imprimante_standard"], n) for n in range(1, 32)]
    racines += ["%s.1.%d" % (BRANCHES["canon_prive"], n) for n in range(1, 21)]
    racines += ["%s.%d" % (BRANCHES["canon_prive"], n) for n in range(2, 6)]
    return racines


def lire_branches(client, racines, progres=None):
    """Lit les branches en parallèle. Retourne (valeurs brutes {oid: valeur}, nombre de branches incomplètes)."""
    brut, incompletes = {}, 0

    def une_branche(racine):
        return client.parcourir(racine)

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for valeurs, probleme in pool.map(une_branche, racines):
            brut.update(dict(valeurs))
            if probleme:
                incompletes += 1
            if progres:
                progres()
    return brut, incompletes


def lire_machine(ip, communaute, delai, port=161, versions=(1, 0), progres=None):
    """Interroge une machine et retourne un dictionnaire avec tout ce qui a été trouvé."""
    r = {"ip": ip, "repond": False, "erreur": None, "non_lu": [], "avertissements": []}

    # Étape 1 : la machine répond-elle ? (on essaie SNMP v2c, puis v1)
    try:
        client, base = ouvrir_client(ip, communaute, delai, port, versions)
    except ErreurSnmp as e:
        r["erreur"] = str(e)
        return r
    r["repond"] = True
    r["version_snmp"] = NOMS_VERSION[client.version]
    descr, objet, nom = base[OID_SYS_DESCR], base[OID_SYS_OBJECT_ID], base[OID_SYS_NAME]

    # Étape 2 : on parcourt les branches utiles et on garde tout en brut
    brut, incompletes = lire_branches(client, racines_a_lire(), progres)
    if incompletes:
        r["avertissements"].append("Lecture incomplète de %d branche(s) : la machine a parfois "
                                   "cessé de répondre." % incompletes)
    r["brut"] = brut

    # Étape 3 : interprétation
    canon_present = any(o.startswith(BRANCHES["canon_prive"] + ".") for o in brut)
    r["marque"] = deviner_marque(objet, descr, canon_present)
    r["est_canon"] = r["marque"] == "Canon"
    r["sys_descr"], r["sys_object_id"], r["nom_reseau"] = descr, objet, nom
    r["modele"] = (_premier(brut, OID_PRT_NOM) or _premier(brut, OID_HR_DEVICE_DESCR)
                   or descr)
    r["numero_serie"] = _premier(brut, OID_PRT_SERIE)
    total = _premier(brut, OID_PRT_COMPTEUR_TOTAL)
    r["compteur_total_standard"] = total if isinstance(total, int) else None

    encres, bacs, autres = interpreter_consommables(brut)
    r["encres"], r["bacs_recuperateurs"], r["autres_consommables"] = encres, bacs, autres

    if r["marque"] is None:
        r["non_lu"].append("Marque non reconnue (voir sys_descr dans le fichier JSON).")
    if not r["numero_serie"]:
        r["non_lu"].append("Numéro de série non communiqué par la machine.")
    if r["compteur_total_standard"] is None:
        r["non_lu"].append("Compteur total standard non disponible.")
    couleurs_trouvees = {e["couleur"] for e in encres if e["pourcent"] is not None}
    for c in ("noir", "cyan", "magenta", "jaune"):
        if c not in couleurs_trouvees:
            r["non_lu"].append("Niveau d'encre %s non disponible." % c)

    if r["est_canon"]:
        compteurs = interpreter_compteurs_canon(brut)
        r["compteurs_canon"] = {str(n): compteurs[n] for n in sorted(compteurs)}
        for n in COMPTEURS_CANON_ATTENDUS:
            if n not in compteurs:
                r["non_lu"].append("Compteur Canon %d non disponible." % n)
        if not compteurs:
            r["non_lu"].append("Aucun compteur Canon numéroté trouvé : la branche privée est vide "
                               "ou son organisation est différente (voir le JSON brut).")
        applicables, retenue, avert = calculer_totaux(compteurs)
        r["totaux_calcules"] = {"recettes_applicables": applicables, "recette_retenue": retenue,
                                "avertissement": avert}
    else:
        r["non_lu"].append("Machine non Canon : seuls les éléments standards (modèle, série, encre, "
                           "compteur total) sont lus. Les compteurs détaillés N&B / couleur / A3 "
                           "ne sont pas disponibles par cette méthode.")
    return r


# ----------------------------------------------------------------------------
# 5. Affichage lisible
# ----------------------------------------------------------------------------
def _ou_nd(v):
    return "non disponible" if v in (None, "") else str(v)


def _ligne_niveau(e):
    nom = e["description"] or "(sans nom)"
    if e["pourcent"] is not None:
        return "%s : %d %%" % (nom, e["pourcent"])
    return "%s : non disponible (%s)" % (nom, e["note"] or "?")


def afficher_resume(r):
    p = print
    p("")
    p("=" * 70)
    p("MACHINE %s" % r["ip"])
    p("=" * 70)
    if not r["repond"]:
        p("Pas de réponse : %s" % r["erreur"])
        p("-> Vérifiez que le SNMP est activé sur le copieur (réglages réseau / SNMP),")
        p("   que l'adresse IP est la bonne, que la communauté SNMP est correcte")
        p("   (option -c) et que le copieur est allumé et branché au même réseau.")
        return
    p("Version SNMP  : %s" % r.get("version_snmp", "?"))
    p("Marque        : %s" % _ou_nd(r["marque"]))
    p("Modèle        : %s" % _ou_nd(r["modele"]))
    p("N° de série   : %s" % _ou_nd(r["numero_serie"]))
    p("Nom réseau    : %s" % _ou_nd(r["nom_reseau"]))

    p("")
    p("Niveaux d'encre :")
    par_couleur = {}
    for e in r["encres"]:
        par_couleur.setdefault(e["couleur"], []).append(e)
    for c in ("noir", "cyan", "magenta", "jaune"):
        if c in par_couleur:
            for e in par_couleur[c]:
                if e["pourcent"] is not None:
                    p("  %-8s %d %%   (%s)" % (c.capitalize(), e["pourcent"], e["description"]))
                else:
                    p("  %-8s non disponible (%s) (%s)" % (c.capitalize(), e["note"], e["description"]))
        else:
            p("  %-8s non disponible" % c.capitalize())
    if r["bacs_recuperateurs"]:
        p("Bacs récupérateurs :")
        for e in r["bacs_recuperateurs"]:
            if e["pourcent"] is not None:
                p("  %s : %d %% plein" % (e["description"] or "(sans nom)", e["pourcent"]))
            else:
                p("  %s : non disponible (%s)" % (e["description"] or "(sans nom)", e["note"]))
    else:
        p("Bacs récupérateurs : non disponible (la machine n'en déclare pas)")
    if r["autres_consommables"]:
        p("Autres consommables déclarés :")
        for e in r["autres_consommables"]:
            p("  " + _ligne_niveau(e))

    p("")
    p("Compteur total standard (MIB imprimante) : %s" % _ou_nd(r["compteur_total_standard"]))

    if r["est_canon"]:
        compteurs = r["compteurs_canon"]
        p("")
        p("Compteurs Canon (%d lus) :" % len(compteurs))
        p("  (* = aussi affiché sur l'écran du copieur)")
        numeros = sorted({int(n) for n in compteurs} | set(COMPTEURS_CANON_ATTENDUS))
        for n in numeros:
            if str(n) in compteurs:
                c = compteurs[str(n)]
                p("  %4d%s : %-8s %s" % (n, "*" if c.get("affiche_ecran") else " ",
                                          c["valeur"], c.get("nom") or ""))
            else:
                p("  %4d  : non disponible" % n)
        tot = r["totaux_calcules"]
        p("")
        p("Totaux calculés (à titre d'information, A3 compté double) :")
        if tot["recette_retenue"]:
            ret = tot["recette_retenue"]
            p("  Recette appliquée : %s (%s)" % (ret["recette"], ret["formule"]))
            p("  Total N&B     : %s" % ret["total_nb"])
            p("  Total couleur : %s" % ret["total_couleur"])
            autres = [x for x in tot["recettes_applicables"] if x is not ret]
            for x in autres:
                p("  (recette %s, %s : N&B %s / couleur %s)"
                  % (x["recette"], x["formule"], x["total_nb"], x["total_couleur"]))
            if tot["avertissement"]:
                p("  " + tot["avertissement"])
        else:
            p("  Aucune recette applicable : compteurs nécessaires manquants.")

    for a in r["avertissements"]:
        p("")
        p("Attention : " + a)
    if r["non_lu"]:
        p("")
        p("Ce qui n'a pas pu être lu :")
        for x in r["non_lu"]:
            p("  - " + x)


# ----------------------------------------------------------------------------
# 6. Découverte du réseau et ligne de commande
# ----------------------------------------------------------------------------
def adresses_de_la_plage(plage):
    """Accepte '192.168.1.0/24' ou '192.168.1.10-192.168.1.50'."""
    if "-" in plage:
        debut, fin = (ipaddress.IPv4Address(x.strip()) for x in plage.split("-", 1))
        if int(fin) < int(debut):
            raise ValueError("la fin de la plage est avant le début")
        return [str(ipaddress.IPv4Address(i)) for i in range(int(debut), int(fin) + 1)]
    reseau = ipaddress.IPv4Network(plage, strict=False)
    return [str(h) for h in reseau.hosts()]


def verifier_local(ip):
    """Refuse toute adresse qui n'est pas du réseau local (rien ne sort d'ici)."""
    a = ipaddress.IPv4Address(ip)
    if not (a.is_private or a.is_loopback or a.is_link_local):
        raise ValueError("%s n'est pas une adresse de réseau local : refusé par sécurité." % ip)


def decouvrir(plage, communaute, delai, port=161, versions=(1, 0)):
    adresses = adresses_de_la_plage(plage)
    if len(adresses) > 4096:
        raise ValueError("plage trop grande (%d adresses, maximum 4096)." % len(adresses))
    for a in adresses[:1] + adresses[-1:]:
        verifier_local(a)
    print("Recherche en cours sur %d adresses (cela peut prendre quelques secondes)..." % len(adresses))

    def sonder(ip):
        try:
            c, v = ouvrir_client(ip, communaute, delai, port, versions)
            return ip, v[OID_SYS_DESCR] or "(répond, sans description)", c.version
        except ErreurSnmp:
            return None

    trouvees = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as pool:
        for res in pool.map(sonder, adresses):
            if res:
                trouvees.append({"ip": res[0], "description": res[1], "version": res[2]})
    trouvees.sort(key=lambda x: _cle(x["ip"]))
    return trouvees


# ----------------------------------------------------------------------------
# 7. Mode client : on double-clique, tout se fait tout seul
# ----------------------------------------------------------------------------
def adresse_locale():
    """Adresse de ce PC sur le réseau local. Aucun paquet n'est envoyé (simple lecture de la config)."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("10.255.255.255", 1))     # en UDP, "connect" n'émet rien
        return sock.getsockname()[0]
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return None
    finally:
        sock.close()


def plage_locale():
    """La plage 'a.b.c.0/24' du réseau où se trouve ce PC, ou None si ce n'est pas un réseau local."""
    ip = adresse_locale()
    if not ip:
        return None
    a = ipaddress.IPv4Address(ip)
    if not (a.is_private and not a.is_loopback):
        return None
    return str(ipaddress.IPv4Network(ip + "/24", strict=False))


def _question(texte):
    """Pose une question à l'écran ; réponse vide si personne ne peut répondre."""
    try:
        return input(texte).strip()
    except EOFError:
        return ""


def _est_une_imprimante(r):
    return r["repond"] and any(o.startswith("1.3.6.1.2.1.43.") for o in r.get("brut", {}))


def dossier_de_sortie():
    """Le Bureau de l'utilisateur s'il existe, sinon son dossier personnel."""
    bureau = os.path.join(os.path.expanduser("~"), "Desktop")
    return bureau if os.path.isdir(bureau) else os.path.expanduser("~")


def resume_texte(r):
    """Le résumé lisible d'une machine, sous forme de texte (joint au mail envoyé à LEVAD)."""
    tampon = io.StringIO()
    with contextlib.redirect_stdout(tampon):
        afficher_resume(r)
    return tampon.getvalue()


def envoyer_resultat(donnees, url, jeton):
    """Envoie le résultat à LEVAD (connexion chiffrée HTTPS). Lève une exception si l'envoi échoue."""
    try:
        import certifi
        contexte = ssl.create_default_context(cafile=certifi.where())
    except Exception:
        contexte = ssl.create_default_context()
    corps = json.dumps(donnees, ensure_ascii=False).encode("utf-8")
    requete = urllib.request.Request(url, data=corps, method="POST", headers={
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Bearer " + jeton})
    with urllib.request.urlopen(requete, timeout=60, context=contexte) as reponse:
        if not 200 <= reponse.status < 300:
            raise ErreurSnmp("réponse inattendue du serveur : %s" % reponse.status)


def _point():
    print(".", end="", flush=True)


def mode_client(communaute, delai, port, versions, dossier=None):
    """Cherche tous les copieurs du réseau, les lit et envoie le résultat à LEVAD."""
    print("=" * 70)
    print(" LEVAD - Relevé des copieurs")
    print("=" * 70)
    print("Ce programme lit (sans rien modifier) les copieurs de votre réseau,")
    print("puis transmet le résultat à LEVAD. Il ne change aucun réglage.")
    print("")
    societe = _question("Nom de votre société : ") or "(non indiqué)"
    plage = plage_locale()
    if plage is None:
        plage = _question("Réseau non détecté. Tapez la plage à analyser (ex. 192.168.1.0/24) : ")
        if not plage:
            print("Rien à faire. Contactez LEVAD.")
            return 1
    print("\nAnalyse du réseau %s ..." % plage)
    try:
        trouvees = decouvrir(plage, communaute, min(delai, 1.0), port, versions)
    except ValueError as e:
        print("Erreur : %s" % e)
        return 2
    print("%d équipement(s) répondent en SNMP." % len(trouvees))
    if not trouvees:
        saisie = _question("Aucun copieur trouvé. Si vous connaissez son adresse IP, tapez-la "
                           "(sinon Entrée) : ")
        if saisie:
            try:
                verifier_local(saisie)
            except ValueError as e:
                print("Erreur : %s" % e)
                return 2
            trouvees = [{"ip": saisie, "version": None}]
        else:
            print("Aucun copieur n'a répondu. Il faut peut-être activer le SNMP sur le copieur :")
            print("merci de prévenir LEVAD, qui vous guidera.")

    resultats = []
    for i, t in enumerate(trouvees, 1):
        print("\n[%d/%d] Lecture de %s " % (i, len(trouvees), t["ip"]), end="", flush=True)
        # on réutilise la version SNMP déjà trouvée à la découverte (plus rapide)
        v = versions if t.get("version") is None else (t["version"],)
        try:
            r = lire_machine(t["ip"], communaute, delai, port, v, progres=_point)
        except Exception as e:
            r = {"ip": t["ip"], "repond": False, "erreur": "erreur inattendue : %s" % e,
                 "non_lu": [], "avertissements": []}
        if _est_une_imprimante(r):
            print(" OK : %s %s" % (r.get("marque") or "", r.get("modele") or ""))
            r["resume_texte"] = resume_texte(r)
        else:
            print(" (pas une imprimante, ignoré)")
            r.pop("brut", None)
        resultats.append(r)

    horodatage = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    donnees = {"date": horodatage, "societe": societe, "pc": socket.gethostname(),
               "systeme": platform.platform(), "plage": plage,
               "version_programme": VERSION_PROGRAMME, "machines": resultats}
    nb = sum(1 for r in resultats if _est_une_imprimante(r))
    print("")
    print("=" * 70)
    if URL_RECEPTION:
        print("Envoi du résultat à LEVAD ...")
        try:
            envoyer_resultat(donnees, URL_RECEPTION, JETON)
            print("Terminé : %d copieur(s) lu(s), résultat transmis à LEVAD. Merci !" % nb)
            print("=" * 70)
            return 0
        except Exception as e:
            print("L'envoi n'a pas pu se faire (%s)." % e)
    chemin = os.path.join(dossier or dossier_de_sortie(), "LEVAD_releve_%s.json" % horodatage)
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump(donnees, f, ensure_ascii=False, indent=2)
    print("Le résultat est enregistré dans ce fichier :")
    print("  " + chemin)
    print("Merci de l'envoyer par mail à LEVAD (en pièce jointe).")
    print("=" * 70)
    return 0


def lancer_mode_client(communaute, delai, port, versions, dossier=None):
    """Enveloppe du mode client : n'arrête jamais brutalement la fenêtre, attend avant de la fermer."""
    try:
        code = mode_client(communaute, delai, port, versions, dossier)
    except KeyboardInterrupt:
        code = 1
    except Exception as e:
        print("\nUne erreur inattendue est survenue : %s" % e)
        print("Merci de prévenir LEVAD en indiquant ce message.")
        code = 3
    _question("\nAppuyez sur Entrée pour fermer cette fenêtre.")
    return code


def main():
    # Pour que les accents s'affichent aussi dans la console Windows
    for flux in (sys.stdout, sys.stderr):
        try:
            flux.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    parser = argparse.ArgumentParser(
        description="Lit des copieurs en SNMP (lecture seule) et affiche ce qu'ils répondent.")
    parser.add_argument("ips", nargs="*", help="adresse(s) IP des copieurs, ex. 192.168.1.50")
    parser.add_argument("-c", "--communaute", default="public",
                        help="communauté SNMP (défaut : public)")
    parser.add_argument("-f", "--fichier-ips", help="fichier texte avec une adresse IP par ligne")
    parser.add_argument("-d", "--decouvrir", metavar="PLAGE",
                        help="cherche les machines SNMP d'une plage : 192.168.1.0/24 "
                             "ou 192.168.1.10-192.168.1.50")
    parser.add_argument("--lire-trouvees", action="store_true",
                        help="avec --decouvrir : lit ensuite en détail toutes les machines trouvées")
    parser.add_argument("--delai", type=float, default=2.0,
                        help="secondes d'attente d'une réponse (défaut : 2)")
    parser.add_argument("--dossier", help="dossier des fichiers JSON (défaut : resultats/ à côté du programme)")
    parser.add_argument("--version", choices=["auto", "2c", "1"], default="auto",
                        help="version SNMP (défaut : auto = essaie 2c puis 1)")
    parser.add_argument("--client", action="store_true",
                        help="mode client : cherche et lit tous les copieurs du réseau "
                             "(aussi activé quand on lance le programme sans rien préciser)")
    parser.add_argument("--port", type=int, default=161, help=argparse.SUPPRESS)  # pour les essais
    args = parser.parse_args()

    versions = {"auto": (1, 0), "2c": (1,), "1": (0,)}[args.version]
    dossier = args.dossier or os.path.join(os.path.dirname(os.path.abspath(__file__)), "resultats")
    horodatage = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    ips = list(args.ips)
    if args.fichier_ips:
        with open(args.fichier_ips, encoding="utf-8") as f:
            ips += [l.strip() for l in f if l.strip() and not l.startswith("#")]

    if args.client or (not ips and not args.decouvrir):
        return lancer_mode_client(args.communaute, args.delai, args.port, versions, args.dossier)

    try:
        if args.decouvrir:
            trouvees = decouvrir(args.decouvrir, args.communaute, min(args.delai, 1.0), args.port, versions)
            print("")
            print("%d machine(s) répondent en SNMP :" % len(trouvees))
            for t in trouvees:
                print("  %-16s %s" % (t["ip"], t["description"].replace("\n", " ")[:80]))
            if not trouvees:
                print("  (aucune). Vérifiez la plage, la communauté (-c) et que le SNMP est activé.")
            os.makedirs(dossier, exist_ok=True)
            chemin = os.path.join(dossier, "decouverte_%s.json" % horodatage)
            with open(chemin, "w", encoding="utf-8") as f:
                json.dump({"date": horodatage, "plage": args.decouvrir, "machines": trouvees},
                          f, ensure_ascii=False, indent=2)
            print("Liste enregistrée dans : %s" % chemin)
            if args.lire_trouvees:
                ips += [t["ip"] for t in trouvees]
        for ip in ips:
            ipaddress.IPv4Address(ip)       # vérifie que l'adresse est bien écrite
            verifier_local(ip)
    except ValueError as e:
        print("Erreur : %s" % e)
        return 2

    if not ips:
        return 0

    resultats = []
    for ip in dict.fromkeys(ips):           # supprime les doublons en gardant l'ordre
        print("\nLecture de %s ..." % ip)
        try:
            r = lire_machine(ip, args.communaute, args.delai, args.port, versions)
        except Exception as e:              # filet de sécurité : une machine ne doit jamais tout arrêter
            r = {"ip": ip, "repond": False, "erreur": "erreur inattendue : %s" % e,
                 "non_lu": [], "avertissements": []}
        resultats.append(r)
        afficher_resume(r)

    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, "releve_%s.json" % horodatage)
    with open(chemin, "w", encoding="utf-8") as f:
        json.dump({"date": horodatage, "machines": resultats}, f, ensure_ascii=False, indent=2)
    print("")
    print("Résultat complet (brut) enregistré dans : %s" % chemin)
    return 0


if __name__ == "__main__":
    sys.exit(main())
