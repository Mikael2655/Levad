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
import threading
import time
import urllib.error
import urllib.request

import releve_snmp as R

VERSION_AGENT = "1.1"
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
    # config.json, sinon sa copie de secours (un fichier abîmé par une coupure de courant ne doit pas arrêter le programme)
    for nom in ("config.json", "config.bak"):
        try:
            with open(_chemin(nom), encoding="utf-8") as f:
                c = json.load(f)
            if isinstance(c, dict) and c.get("code"):
                return c
        except (OSError, ValueError):
            continue
    return {}


def ecrire_config(config):
    """Écriture sûre : fichier temporaire puis remplacement, et copie de secours."""
    os.makedirs(dossier_donnees(), exist_ok=True)
    for nom in ("config.bak", "config.json"):
        tmp = _chemin(nom + ".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        os.replace(tmp, _chemin(nom))


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


# Ce que le programme sait de sa propre santé : envoyé avec chaque signal de vie, pour que LEVAD voie
# ce qui s'est passé sans rien demander au client (dernière erreur, dernière lecture réussie...).
DIAG = {"demarreLe": datetime.datetime.now(datetime.timezone.utc).isoformat(), "derniereErreur": None,
        "derniereErreurLe": None, "derniereLectureOk": None, "nbErreurs": 0}


def noter_erreur(message):
    journal("erreur : %s" % message)
    DIAG["derniereErreur"] = str(message)[:300]
    DIAG["derniereErreurLe"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    DIAG["nbErreurs"] += 1


def signal_de_vie(config):
    return appel(config, "/api/agent/ping", {
        "pc": socket.gethostname(), "systeme": R.platform.platform(), "version": VERSION_AGENT, "diag": dict(DIAG)})


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
    DIAG["derniereLectureOk"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
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


TROIS_JOURS = 3 * 24 * 3600


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
    if max_tours is None:
        _assurer_surveillance()       # les installations de la version 1.0 reçoivent aussi la tâche de relance
    tours = 0
    lecteur = {"fil": None}           # la lecture des copieurs se fait à part : elle ne retarde jamais le signal de vie
    premier_refus = None

    def lancer_lecture(commandes):
        def travail():
            try:
                lire_et_envoyer(config, commandes)
            except CodeInconnu:
                pass                  # le prochain signal de vie le constatera
            except Exception as e:
                noter_erreur("lecture : %s" % e)
        fil = threading.Thread(target=travail, daemon=True)
        lecteur["fil"] = fil
        fil.start()

    while True:
        if os.path.exists(_chemin("arret")):
            journal("arrêt demandé (désinstallation)")
            _nettoyer_apres_arret()
            return 0
        pause = float(os.environ.get("LEVAD_PAUSE", PAUSE_SECONDES))
        try:
            reponse = signal_de_vie(config)
            premier_refus = None
            occupe = lecteur["fil"] is not None and lecteur["fil"].is_alive()
            echeance = time.time() - config.get("derniere_lecture", 0) >= reponse.get("intervalleMinutes", 30) * 60
            commandes = [c["id"] for c in reponse.get("commandes", [])]
            if (echeance or commandes) and not occupe:
                lancer_lecture(commandes)
        except CodeInconnu as e:
            # lien refusé : on réessaie pendant 3 jours avant d'abandonner (un refus passager ne doit pas arrêter le programme pour toujours)
            premier_refus = premier_refus or time.time()
            noter_erreur(str(e))
            if time.time() - premier_refus > TROIS_JOURS:
                journal("arrêt : %s depuis plus de 3 jours" % e)
                return 2
            pause = max(pause, 900.0) if max_tours is None else pause
        except Exception as e:       # réseau coupé, serveur indisponible... on réessaie au prochain passage
            noter_erreur(e)
        tours += 1
        if max_tours is not None and tours >= max_tours:
            if lecteur["fil"] is not None:
                lecteur["fil"].join(timeout=120)   # essais : on attend la fin de la lecture en cours
            return 0
        time.sleep(pause)


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
    if avec_demarrage_auto:
        _assurer_surveillance()
    lancer_en_fond(commande)


NOM_TACHE = "Levad Connect"


def _assurer_surveillance():
    """Windows : une tâche planifiée relance le programme toutes les 15 minutes s'il n'est plus en marche
    (arrêt imprévu, session rouverte...). Si le programme tourne déjà, la relance est ignorée aussitôt (verrou)."""
    if sys.platform != "win32" or not getattr(sys, "frozen", False) or os.environ.get("LEVAD_SANS_AUTODEMARRAGE"):
        return
    try:
        sortie = subprocess.run(["schtasks", "/Create", "/TN", NOM_TACHE, "/TR", subprocess.list2cmdline(_commande_agent()),
                                 "/SC", "MINUTE", "/MO", "15", "/F"], capture_output=True, timeout=30, creationflags=0x08000000)
        if sortie.returncode != 0:
            journal("surveillance non installée (code %s)" % sortie.returncode)
    except Exception as e:
        journal("surveillance non installée : %s" % e)


def _retirer_surveillance():
    if sys.platform != "win32":
        return
    try:
        subprocess.run(["schtasks", "/Delete", "/TN", NOM_TACHE, "/F"], capture_output=True, timeout=30, creationflags=0x08000000)
    except Exception:
        pass


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
    if avec_demarrage_auto:
        _retirer_surveillance()
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
