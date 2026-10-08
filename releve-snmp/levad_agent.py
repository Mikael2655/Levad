# -*- coding: utf-8 -*-
"""
Levad Connect - programme résident (arrière-plan).

Une fois installé chez un client, ce programme :
  - envoie un signal de vie à LEVAD toutes les minutes (et reçoit les demandes de lecture immédiate) ;
  - relit les copieurs du réseau toutes les 30 minutes et envoie le résultat ;
  - démarre tout seul avec l'ordinateur ;
  - ne fait que LIRE : aucun réglage des copieurs n'est jamais modifié.

Le client est reconnu grâce au code de son lien personnel, contenu dans le nom du fichier téléchargé
(Levad-Connect-<code>.exe) : il n'a rien à saisir. Ce code est enregistré à l'installation.
"""

import datetime
import json
import os
import re
import shutil
import socket
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request

import releve_snmp as R

VERSION_AGENT = "1.0"
SERVEUR_PAR_DEFAUT = "https://connect.levad.fr"
MOTIF_CODE = re.compile(r"Levad-Connect-([a-hj-km-np-z2-9]{16})", re.IGNORECASE)
PORT_VERROU = 47653            # un seul programme résident à la fois (verrou local)
PAUSE_SECONDES = 60            # signal de vie toutes les minutes
DECOUVERTE_TOUS_LES_JOURS = 24 * 3600


# ----------------------------------------------------------------------------
# Dossier de données, configuration, journal
# ----------------------------------------------------------------------------
def dossier_donnees():
    """Où le programme range sa configuration et son journal (réglable par LEVAD_DONNEES pour les essais)."""
    if os.environ.get("LEVAD_DONNEES"):
        return os.environ["LEVAD_DONNEES"]
    if sys.platform == "win32":
        return os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "Levad Connect")
    return os.path.join(os.path.expanduser("~"), ".levad-connect")


def _chemin(nom):
    return os.path.join(dossier_donnees(), nom)


def lire_config():
    try:
        with open(_chemin("config.json"), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def ecrire_config(config):
    os.makedirs(dossier_donnees(), exist_ok=True)
    with open(_chemin("config.json"), "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def journal(message):
    """Une ligne datée dans agent.log (le fichier est raccourci quand il devient trop gros)."""
    try:
        os.makedirs(dossier_donnees(), exist_ok=True)
        chemin = _chemin("agent.log")
        if os.path.exists(chemin) and os.path.getsize(chemin) > 400_000:
            with open(chemin, encoding="utf-8", errors="replace") as f:
                fin = f.read()[-100_000:]
            with open(chemin, "w", encoding="utf-8") as f:
                f.write(fin)
        with open(chemin, "a", encoding="utf-8") as f:
            f.write("%s  %s\n" % (datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), message))
    except OSError:
        pass


def est_installe():
    return bool(lire_config().get("code"))


# ----------------------------------------------------------------------------
# Code du client (dans le nom du fichier téléchargé)
# ----------------------------------------------------------------------------
def code_depuis_nom_de_fichier():
    """Le code du lien personnel, lu dans le nom de ce programme ; None s'il n'y en a pas."""
    chemin = sys.executable if getattr(sys, "frozen", False) else sys.argv[0]
    m = MOTIF_CODE.search(os.path.basename(chemin or ""))
    return m.group(1).lower() if m else None


# ----------------------------------------------------------------------------
# Dialogue avec le serveur LEVAD (HTTPS)
# ----------------------------------------------------------------------------
class CodeInconnu(Exception):
    pass


def appel(config, chemin, donnees):
    """POST JSON vers le serveur ; retourne la réponse décodée. Lève CodeInconnu si le lien n'est plus valable."""
    try:
        import certifi
        contexte = ssl.create_default_context(cafile=certifi.where())
    except Exception:
        contexte = ssl.create_default_context()
    url = (config.get("serveur") or SERVEUR_PAR_DEFAUT).rstrip("/") + chemin
    requete = urllib.request.Request(
        url, data=json.dumps(donnees, ensure_ascii=False).encode("utf-8"), method="POST",
        headers={"Content-Type": "application/json; charset=utf-8", "Authorization": "Bearer " + config["code"]})
    try:
        with urllib.request.urlopen(requete, timeout=60, context=contexte) as reponse:
            return json.loads(reponse.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        if e.code == 401:
            raise CodeInconnu("le lien d'installation n'est plus valable")
        raise


def signal_de_vie(config):
    return appel(config, "/api/agent/ping", {
        "pc": socket.gethostname(), "systeme": R.platform.platform(), "version": VERSION_AGENT})


# ----------------------------------------------------------------------------
# Lecture des copieurs
# ----------------------------------------------------------------------------
def _est_imprimante(r):
    return R._est_une_imprimante(r)


def lire_les_copieurs(config):
    """
    Lit les copieurs du réseau. Les copieurs déjà connus sont relus directement (rapide) ; une recherche complète
    du réseau est refaite une fois par jour (ou s'il n'y en a aucun connu) pour repérer les nouvelles machines.
    Retourne la liste des machines lues (sans le détail brut, trop volumineux pour un envoi toutes les 30 minutes).
    """
    port = int(config.get("port", 161))
    versions = (1, 0)
    connus = config.get("copieurs", [])
    maintenant = time.time()
    if not connus or maintenant - config.get("derniere_decouverte", 0) > DECOUVERTE_TOUS_LES_JOURS:
        plage = config.get("plage") or R.plage_locale()
        if plage:
            try:
                trouvees = R.decouvrir(plage, "public", 1.0, port, versions)
                connus = [{"ip": t["ip"], "version": t["version"]} for t in trouvees]
                config["derniere_decouverte"] = maintenant
            except Exception as e:
                journal("recherche du réseau impossible : %s" % e)
    machines, imprimantes = [], []
    for c in connus:
        v = versions if c.get("version") is None else (c["version"],)
        try:
            r = R.lire_machine(c["ip"], "public", 2.0, port, v)
        except Exception as e:
            journal("lecture de %s impossible : %s" % (c["ip"], e))
            continue
        if _est_imprimante(r):
            r.pop("brut", None)           # le détail brut n'est pas envoyé en lecture automatique
            r["est_imprimante"] = True
            machines.append(r)
            imprimantes.append({"ip": c["ip"], "version": 1 if r.get("version_snmp") == "v2c" else 0})
    config["copieurs"] = imprimantes
    return machines


def lire_et_envoyer(config, commande_ids=()):
    machines = lire_les_copieurs(config)
    reponse = appel(config, "/api/agent/releve", {
        "pc": socket.gethostname(), "systeme": R.platform.platform(), "version_programme": VERSION_AGENT,
        "machines": machines, "commandeIds": list(commande_ids)})
    config["derniere_lecture"] = time.time()
    ecrire_config(config)
    journal("relevé envoyé : %d copieur(s)" % len(machines))
    return len(machines), reponse


# ----------------------------------------------------------------------------
# Boucle de fond
# ----------------------------------------------------------------------------
def _verrou():
    """Empêche de lancer deux programmes résidents en même temps. Retourne le verrou, ou None s'il est déjà pris."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", int(os.environ.get("LEVAD_PORT_VERROU", PORT_VERROU))))
        return s
    except OSError:
        s.close()
        return None


def boucle(max_tours=None):
    """Le programme résident. `max_tours` (essais uniquement) limite le nombre de passages."""
    verrou = _verrou()
    if verrou is None:
        return 0
    journal("démarrage du programme résident (version %s)" % VERSION_AGENT)
    config = lire_config()
    if not config.get("code"):
        journal("pas de code client : arrêt")
        return 1
    tours = 0
    while True:
        if os.path.exists(_chemin("arret")):
            journal("arrêt demandé (désinstallation)")
            _nettoyer_apres_arret()
            return 0
        try:
            reponse = signal_de_vie(config)
            echeance = time.time() - config.get("derniere_lecture", 0) >= reponse.get("intervalleMinutes", 30) * 60
            commandes = [c["id"] for c in reponse.get("commandes", [])]
            if echeance or commandes:
                lire_et_envoyer(config, commandes)
        except CodeInconnu as e:
            journal("arrêt : %s" % e)
            return 2
        except Exception as e:       # réseau coupé, serveur indisponible... on réessaie au prochain passage
            journal("erreur : %s" % e)
        tours += 1
        if max_tours is not None and tours >= max_tours:
            return 0
        time.sleep(float(os.environ.get("LEVAD_PAUSE", PAUSE_SECONDES)))


# ----------------------------------------------------------------------------
# Installation / désinstallation
# ----------------------------------------------------------------------------
CLE_DEMARRAGE = r"Software\Microsoft\Windows\CurrentVersion\Run"
NOM_DEMARRAGE = "LevadConnect"


def _commande_agent():
    """La commande qui lance le programme résident."""
    if getattr(sys, "frozen", False):
        return [os.path.join(dossier_donnees(), "Levad-Connect.exe"), "--agent"]
    return [sys.executable, os.path.abspath(sys.argv[0]), "--agent"]


def installer(code, serveur=None, avec_demarrage_auto=True):
    """Copie le programme, enregistre le code du client, le fait démarrer avec l'ordinateur et le lance."""
    os.makedirs(dossier_donnees(), exist_ok=True)
    config = lire_config()
    config.update({"code": code, "serveur": serveur or config.get("serveur") or SERVEUR_PAR_DEFAUT})
    ecrire_config(config)
    try:
        os.remove(_chemin("arret"))
    except OSError:
        pass
    if getattr(sys, "frozen", False):
        destination = _commande_agent()[0]
        if os.path.abspath(sys.executable) != os.path.abspath(destination):
            shutil.copy2(sys.executable, destination)
    commande = _commande_agent()
    if avec_demarrage_auto and sys.platform == "win32":
        import winreg
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, CLE_DEMARRAGE) as cle:
            winreg.SetValueEx(cle, NOM_DEMARRAGE, 0, winreg.REG_SZ, subprocess.list2cmdline(commande))
    journal("installé (code %s…)" % code[:4])
    lancer_en_fond(commande)


def lancer_en_fond(commande):
    """Lance le programme résident sans fenêtre et indépendamment de celle-ci."""
    options = {"stdin": subprocess.DEVNULL, "stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}
    if sys.platform == "win32":
        options["creationflags"] = 0x00000008 | 0x00000200 | 0x08000000   # DETACHED | NEW_GROUP | NO_WINDOW
    else:
        options["start_new_session"] = True
    subprocess.Popen(commande, **options)


def desinstaller(avec_demarrage_auto=True):
    """Retire le démarrage automatique et demande au programme résident de s'arrêter (il nettoie ses fichiers)."""
    if avec_demarrage_auto and sys.platform == "win32":
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, CLE_DEMARRAGE, 0, winreg.KEY_SET_VALUE) as cle:
                winreg.DeleteValue(cle, NOM_DEMARRAGE)
        except OSError:
            pass
    os.makedirs(dossier_donnees(), exist_ok=True)
    with open(_chemin("arret"), "w") as f:
        f.write("arrêt")
    journal("désinstallation demandée")


def _nettoyer_apres_arret():
    """Supprime le dossier du programme une fois celui-ci arrêté (Windows : après une courte attente)."""
    if sys.platform == "win32" and getattr(sys, "frozen", False):
        dossier = dossier_donnees()
        subprocess.Popen(
            'cmd /c ping -n 4 127.0.0.1 >nul & rmdir /s /q "%s"' % dossier,
            shell=True, creationflags=0x08000000, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        for nom in ("config.json", "arret"):
            try:
                os.remove(_chemin(nom))
            except OSError:
                pass
