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
import hashlib
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

VERSION_AGENT = "1.11"
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
def _chemin_reel_mac(chemin):
    """Mac : macOS lance parfois une application téléchargée depuis un chemin aléatoire (« AppTranslocation »), qui ne
    contient plus le nom du dossier d'origine. La liste des volumes (commande mount) indique le vrai emplacement."""
    if not chemin or "AppTranslocation" not in chemin:
        return chemin
    try:
        sortie = subprocess.run(["mount"], capture_output=True, text=True, timeout=15).stdout
    except Exception:
        return chemin
    for ligne in sortie.splitlines():
        m = re.match(r"^(?P<origine>.+) on (?P<point>/\S*AppTranslocation\S*) \(", ligne)
        if m and chemin.startswith(m.group("point")):
            return m.group("origine") + chemin[len(m.group("point")):]
    return chemin


def code_depuis_nom_de_fichier():
    """Le code du lien personnel, lu dans le nom de ce programme ; None s'il n'y en a pas."""
    chemin = sys.executable if getattr(sys, "frozen", False) else sys.argv[0]
    if sys.platform == "darwin":
        chemin = _chemin_reel_mac(chemin)
    m = MOTIF_CODE.search(os.path.basename(chemin or ""))
    if m is None and sys.platform == "darwin":
        # Mac : le fichier téléchargé est un zip « Levad-Connect-<code>.zip » ; en l'ouvrant, macOS crée un dossier du même nom
        # qui contient l'application : on cherche donc le code dans les dossiers parents.
        for dossier in os.path.abspath(chemin or "").split(os.sep):
            m = MOTIF_CODE.search(dossier)
            if m:
                break
    if m is None and sys.platform == "darwin":
        # dernier recours : le zip ou le dossier « Levad-Connect-<code> » le plus récent du dossier Téléchargements
        dl = os.path.join(os.path.expanduser("~"), "Downloads")
        try:
            candidats = sorted(os.listdir(dl), key=lambda n: os.path.getmtime(os.path.join(dl, n)), reverse=True)
        except OSError:
            candidats = []
        for nom in candidats:
            m = MOTIF_CODE.search(nom)
            if m:
                break
    return m.group(1).lower() if m else None


# ----------------------------------------------------------------------------
# Dialogue avec le serveur LEVAD (HTTPS)
# ----------------------------------------------------------------------------
class CodeInconnu(Exception):
    pass


def appel(config, chemin, donnees, delai=60):
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
        with urllib.request.urlopen(requete, timeout=delai, context=contexte) as reponse:
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


_NOM_POSTE = []


def nom_du_poste():
    """Le nom de cet ordinateur, stable d'un redémarrage à l'autre. Sur Mac, le nom réseau change selon le réseau et la box
    (« mini-de-mikael.home », « mac-mini-de-mikael.home »...) : on prend le nom donné à l'ordinateur dans les Réglages Système."""
    if not _NOM_POSTE:
        nom = None
        if sys.platform == "darwin":
            try:
                nom = subprocess.run(["scutil", "--get", "ComputerName"], capture_output=True, text=True, timeout=5).stdout.strip() or None
            except Exception:
                nom = None
        _NOM_POSTE.append(nom or socket.gethostname())
    return _NOM_POSTE[0]


def signal_de_vie(config):
    return appel(config, "/api/agent/ping", {
        "pc": nom_du_poste(), "systeme": R.platform.platform(), "version": VERSION_AGENT, "diag": dict(DIAG)})


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
    communaute = config.get("communaute", "public")
    if not connus or maintenant - config.get("derniere_decouverte", 0) > DECOUVERTE_TOUS_LES_JOURS:
        plage = config.get("plage") or R.plage_locale()
        if plage:
            try:
                trouvees = []
                # « public » est le mot de passe SNMP habituel ; à défaut, on essaie « private » avant d'abandonner
                for essai in ("public", "private"):
                    trouvees = R.decouvrir(plage, essai, 1.0, port, versions)
                    if trouvees:
                        communaute = essai
                        config["communaute"] = essai
                        break
                connus = [{"ip": t["ip"], "version": t["version"]} for t in trouvees]
                config["derniere_decouverte"] = maintenant
                journal("recherche du réseau %s : %d équipement(s) répondent (%s)"
                        % (plage, len(trouvees), ", ".join(t["ip"] for t in trouvees[:8]) or "aucun"))
                if not trouvees:
                    DIAG["constat"] = "aucun équipement ne répond en SNMP sur %s (ce PC : %s)" % (plage, R.adresse_locale())
            except Exception as e:
                journal("recherche du réseau impossible : %s" % e)
                DIAG["constat"] = "recherche du réseau impossible : %s" % e
        else:
            journal("recherche du réseau impossible : adresse de l'ordinateur sur le réseau local introuvable")
            DIAG["constat"] = "adresse de l'ordinateur sur le réseau local introuvable"
    # adresses ajoutées à la main par LEVAD (copieurs hors de la plage de la recherche automatique)
    manuelles = [ip for ip in config.get("ips_manuelles", []) if ip not in [c["ip"] for c in connus]]
    connus = connus + [{"ip": ip, "version": None} for ip in manuelles]
    machines, imprimantes, sans_reponse = [], [], []
    for c in connus:
        v = versions if c.get("version") is None else (c["version"],)
        try:
            r = R.lire_machine(c["ip"], communaute, 2.0, port, v)
        except Exception as e:
            journal("lecture de %s impossible : %s" % (c["ip"], e))
            continue
        if c["ip"] in config.get("ips_manuelles", []) and not r.get("repond"):
            sans_reponse.append(c["ip"])
        if _est_imprimante(r):
            r.pop("brut", None)           # le détail brut n'est pas envoyé en lecture automatique
            r["est_imprimante"] = True
            machines.append(r)
            imprimantes.append({"ip": c["ip"], "version": 1 if r.get("version_snmp") == "v2c" else 0})
    if sans_reponse:
        DIAG["constat"] = "adresse(s) ajoutée(s) à la main sans réponse : %s" % ", ".join(sans_reponse[:6])
    elif connus and not machines:
        DIAG["constat"] = "%d équipement(s) répondent sur le réseau mais aucun n'est un copieur lisible" % len(connus)
    config["copieurs"] = imprimantes
    return machines


def lire_et_envoyer(config, commande_ids=()):
    machines = lire_les_copieurs(config)
    reponse = appel(config, "/api/agent/releve", {
        "pc": nom_du_poste(), "systeme": R.platform.platform(), "version_programme": VERSION_AGENT,
        "machines": machines, "commandeIds": list(commande_ids)})
    config["derniere_lecture"] = time.time()
    ecrire_config(config)
    if machines:
        DIAG.pop("constat", None)
        DIAG["derniereLectureOk"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    elif DIAG.get("constat"):
        noter_erreur("lecture : " + DIAG["constat"])   # reste affichée dans Connexions tant qu'aucun copieur n'est lu
    journal("relevé envoyé : %d copieur(s)" % len(machines))
    return len(machines), reponse


# ----------------------------------------------------------------------------
# Mise à jour automatique : le lien du client ne change jamais, seul le programme est remplacé
# ----------------------------------------------------------------------------
VERIFIER_MAJ_TOUTES_LES = 6 * 3600
TAILLE_MAX_PROGRAMME = 120 * 1024 * 1024


def _contexte_ssl():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()


def _numeros(version):
    return tuple(int(x) for x in re.findall(r"\d+", str(version)))[:4]


def chercher_mise_a_jour(config):
    """Les informations de la dernière version publiée si elle est plus récente que celle-ci, sinon None."""
    base = os.environ.get("LEVAD_BASE_MAJ") or (config.get("serveur") or SERVEUR_PAR_DEFAUT).rstrip("/") + "/telechargements"
    with urllib.request.urlopen(base + "/version.json", timeout=60, context=_contexte_ssl()) as r:
        info = json.loads(r.read().decode("utf-8"))
    if _numeros(info.get("version", "0")) <= _numeros(VERSION_AGENT):
        return None
    if sys.platform == "darwin":                  # Mac : l'application est livrée dans un zip, avec sa propre empreinte
        mac = info.get("mac") or {}
        if not mac:
            return None
        info.update({"url": base + "/Levad-Connect-Mac.zip", "sha256": mac.get("sha256", ""), "taille": mac.get("taille", 0), "signe": False})
    else:
        info["url"] = base + "/Levad-Connect.exe"
    return info


def _signature_valide(chemin, signataire=""):
    """Windows : la signature numérique du programme est-elle valide (et au nom attendu, s'il est précisé) ?"""
    if sys.platform != "win32":
        return False
    commande = ("$s = Get-AuthenticodeSignature -LiteralPath '%s'; "
                "Write-Output $s.Status; Write-Output $s.SignerCertificate.Subject" % chemin.replace("'", "''"))
    r = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", commande],
                       capture_output=True, text=True, timeout=120, creationflags=0x08000000)
    lignes = (r.stdout or "").strip().splitlines()
    if not lignes or lignes[0].strip() != "Valid":
        return False
    return not signataire or signataire.lower() in " ".join(lignes[1:]).lower()


def telecharger_et_verifier(info, destination):
    """Télécharge la nouvelle version et vérifie sa taille, son empreinte (et sa signature si LEVAD en impose une)."""
    attendu = str(info.get("sha256", "")).lower()
    taille = int(info.get("taille", 0))
    if len(attendu) != 64 or not 0 < taille <= TAILLE_MAX_PROGRAMME:
        raise ValueError("informations de mise à jour incomplètes")
    empreinte, recu = hashlib.sha256(), 0
    with urllib.request.urlopen(info["url"], timeout=120, context=_contexte_ssl()) as r, open(destination, "wb") as f:
        while True:
            bloc = r.read(1024 * 256)
            if not bloc:
                break
            recu += len(bloc)
            if recu > taille:
                raise ValueError("fichier plus gros que prévu")
            empreinte.update(bloc)
            f.write(bloc)
    if recu != taille or empreinte.hexdigest() != attendu:
        os.remove(destination)
        raise ValueError("fichier téléchargé incorrect (empreinte différente)")
    if info.get("signe") and not _signature_valide(destination, info.get("signataire", "")):
        os.remove(destination)
        raise ValueError("signature numérique absente ou invalide")
    return destination


def appliquer_mise_a_jour(nouveau, actuel, ancien):
    """Remplace le programme en cours par le nouveau (le programme en cours est renommé, ce que Windows autorise).
    Le nouveau programme doit d'abord réussir son essai de démarrage ; en cas de souci on revient en arrière."""
    options = {"creationflags": 0x08000000} if sys.platform == "win32" else {}
    if sys.platform != "win32":
        os.chmod(nouveau, 0o755)
    essai = subprocess.run([nouveau, "--verifier"], timeout=120, stdin=subprocess.DEVNULL,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=_environnement_propre(), **options)
    if essai.returncode != 0:
        os.remove(nouveau)
        raise RuntimeError("la nouvelle version ne démarre pas (code %s)" % essai.returncode)
    try:
        os.remove(ancien)
    except OSError:
        pass
    os.replace(actuel, ancien)
    try:
        os.replace(nouveau, actuel)
    except OSError:
        os.replace(ancien, actuel)
        raise


def _mise_a_jour_mac(info, etat):
    """Mac : télécharge le zip, vérifie son empreinte, fait l'essai de démarrage de la nouvelle application puis la met en place."""
    app = _dossier_app_installee()
    if not os.path.isdir(app):
        return                                    # lancé depuis le dossier de téléchargement : rien à remplacer
    archive, dossier, ancien = _chemin("maj-mac.zip"), _chemin("maj-mac"), _chemin("Levad Connect.old.app")
    telecharger_et_verifier(info, archive)
    shutil.rmtree(dossier, ignore_errors=True)
    os.makedirs(dossier)
    subprocess.run(["ditto", "-x", "-k", archive, dossier], check=True, timeout=300)
    nouveau = os.path.join(dossier, "Levad Connect.app")
    subprocess.run(["xattr", "-cr", nouveau], capture_output=True, timeout=60)
    essai = subprocess.run([os.path.join(nouveau, "Contents", "MacOS", "Levad Connect"), "--verifier"], timeout=120,
                           stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=_environnement_propre())
    if essai.returncode != 0:
        raise RuntimeError("la nouvelle version ne démarre pas (code %s)" % essai.returncode)
    shutil.rmtree(ancien, ignore_errors=True)
    os.rename(app, ancien)
    try:
        os.rename(nouveau, app)
    except OSError:
        os.rename(ancien, app)
        raise
    shutil.rmtree(dossier, ignore_errors=True)
    try:
        os.remove(archive)
    except OSError:
        pass
    journal("mise à jour vers la version %s installée : redémarrage" % info.get("version"))
    etat["redemarrer"] = True


def _mise_a_jour(config, etat):
    """Vérifie s'il existe une nouvelle version et l'installe (Windows : le programme installé ; Mac : l'application installée)."""
    info = chercher_mise_a_jour(config)
    if info is None:
        return
    journal("nouvelle version %s disponible (actuelle : %s)" % (info.get("version"), VERSION_AGENT))
    if sys.platform == "darwin" and getattr(sys, "frozen", False):
        _mise_a_jour_mac(info, etat)
        return
    if getattr(sys, "frozen", False) and sys.platform == "win32":
        actuel = _commande_agent()[0]
    elif os.environ.get("LEVAD_MAJ_ACTUEL"):      # essais seulement : un faux programme à remplacer
        actuel = os.environ["LEVAD_MAJ_ACTUEL"]
    else:
        return                                    # Mac / usage en développement : pas de remplacement automatique
    nouveau = _chemin("Levad-Connect.new.exe")
    telecharger_et_verifier(info, nouveau)
    appliquer_mise_a_jour(nouveau, actuel, _chemin("Levad-Connect.old.exe"))
    journal("mise à jour vers la version %s installée : redémarrage" % info.get("version"))
    etat["redemarrer"] = True


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
    if config.get("version_installee") != VERSION_AGENT:      # après une mise à jour : la fenêtre d'état affichera la bonne version
        config["version_installee"] = VERSION_AGENT
        ecrire_config(config)
    if max_tours is None:
        _assurer_surveillance()       # les installations de la version 1.0 reçoivent aussi la tâche de relance
    for reste in ("Levad-Connect.old.exe", "Levad-Connect.new.exe", "maj-mac.zip"):      # restes d'une mise à jour précédente
        try:
            os.remove(_chemin(reste))
        except OSError:
            pass
    for reste in ("Levad Connect.old.app", "maj-mac"):
        shutil.rmtree(_chemin(reste), ignore_errors=True)
    maj = {"fil": None, "prochaine": time.time() + float(os.environ.get("LEVAD_MAJ_DELAI", 120)), "redemarrer": False}
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
        if maj["redemarrer"]:
            journal("redémarrage sur la nouvelle version")
            verrou.close()                         # libère le verrou pour que la nouvelle version puisse démarrer
            if sys.platform == "darwin" and os.path.exists(_plist_mac()):
                _launchctl("kickstart", "-k", "gui/%d/%s" % (os.getuid(), LABEL_MAC))   # launchd relance la nouvelle application
                time.sleep(5)
                return 0
            lancer_en_fond(_commande_agent())
            return 0
        if time.time() >= maj["prochaine"] and not (maj["fil"] is not None and maj["fil"].is_alive()):
            maj["prochaine"] = time.time() + VERIFIER_MAJ_TOUTES_LES

            def travail_maj():
                try:
                    _mise_a_jour(config, maj)
                except Exception as e:
                    noter_erreur("mise à jour : %s" % e)
            maj["fil"] = threading.Thread(target=travail_maj, daemon=True)
            maj["fil"].start()
        try:
            reponse = signal_de_vie(config)
            ips = [x for x in reponse.get("ips", []) if isinstance(x, str)]
            if ips != config.get("ips_manuelles", []):
                config["ips_manuelles"] = ips
                ecrire_config(config)
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
            for fil in (lecteur["fil"], maj["fil"]):
                if fil is not None:
                    fil.join(timeout=120)          # essais : on attend la fin des tâches en cours
            return 0
        time.sleep(pause)


# ----------------------------------------------------------------------------
# Installation / désinstallation
# ----------------------------------------------------------------------------
CLE_DEMARRAGE = r"Software\Microsoft\Windows\CurrentVersion\Run"
NOM_DEMARRAGE = "LevadConnect"


# --- Mac : l'application est copiée dans le dossier de données et lancée par launchd (agent utilisateur, sans mot de passe) ---
LABEL_MAC = "fr.levad.connect.agent"


def _dossier_app_installee():
    return os.path.join(dossier_donnees(), "Levad Connect.app")


def _plist_mac():
    return os.path.join(os.path.expanduser("~"), "Library", "LaunchAgents", LABEL_MAC + ".plist")


def _app_courante():
    """Le dossier « .app » dans lequel ce programme tourne (None hors application)."""
    p = os.path.abspath(sys.executable)
    while True:
        if p.endswith(".app"):
            return p
        parent = os.path.dirname(p)
        if parent == p:
            return None
        p = parent


def _launchctl(*args):
    return subprocess.run(["launchctl", *args], capture_output=True, timeout=30)


def _contenu_plist_mac(commande):
    return {
        "Label": LABEL_MAC,
        "ProgramArguments": list(commande),
        "RunAtLoad": True,
        "KeepAlive": {"SuccessfulExit": False},        # relancé s'il s'arrête de façon imprévue ; reste arrêté après une désinstallation
        "ThrottleInterval": 30,
        "ProcessType": "Background",
        "StandardErrorPath": _chemin("launchd.log"),
        "StandardOutPath": _chemin("launchd.log"),
    }


def _installer_lancement_mac(commande):
    """Mac : démarrage automatique à l'ouverture de session. Retourne True si launchd a pris le relais."""
    import plistlib
    chemin = _plist_mac()
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, "wb") as f:
        plistlib.dump(_contenu_plist_mac(commande), f)
    cible = "gui/%d" % os.getuid()
    _launchctl("bootout", "%s/%s" % (cible, LABEL_MAC))
    ok = _launchctl("bootstrap", cible, chemin).returncode == 0 or _launchctl("load", "-w", chemin).returncode == 0
    if not ok:
        journal("démarrage automatique non installé (launchctl a refusé)")
    return ok


def _retirer_lancement_mac():
    try:
        _launchctl("bootout", "gui/%d/%s" % (os.getuid(), LABEL_MAC))
    except Exception:
        pass
    try:
        os.remove(_plist_mac())
    except OSError:
        pass


def _commande_agent():
    """La commande qui lance le programme résident."""
    if getattr(sys, "frozen", False):
        if sys.platform == "darwin":
            return [os.path.join(_dossier_app_installee(), "Contents", "MacOS", "Levad Connect"), "--agent"]
        return [os.path.join(dossier_donnees(), "Levad-Connect.exe"), "--agent"]
    return [sys.executable, os.path.abspath(sys.argv[0]), "--agent"]


def installer(code, serveur=None, avec_demarrage_auto=True):
    """Copie le programme, enregistre le code du client, le fait démarrer avec l'ordinateur et le lance."""
    os.makedirs(dossier_donnees(), exist_ok=True)
    config = lire_config()
    config.update({"code": code, "serveur": serveur or config.get("serveur") or SERVEUR_PAR_DEFAUT, "version_installee": VERSION_AGENT})
    ecrire_config(config)
    try:
        os.remove(_chemin("arret"))
    except OSError:
        pass
    if getattr(sys, "frozen", False) and sys.platform == "darwin":
        source, destination = _app_courante(), _dossier_app_installee()
        if source and os.path.abspath(source) != os.path.abspath(destination):
            if avec_demarrage_auto:
                _retirer_lancement_mac()                      # arrête une ancienne installation avant de la remplacer
            shutil.rmtree(destination, ignore_errors=True)
            subprocess.run(["ditto", "--noqtn", source, destination], check=True, timeout=300)
            subprocess.run(["xattr", "-cr", destination], capture_output=True, timeout=60)
    elif getattr(sys, "frozen", False):
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
    if avec_demarrage_auto and sys.platform == "darwin" and getattr(sys, "frozen", False) and _installer_lancement_mac(commande):
        return                                                # launchd a démarré le programme
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


def _environnement_propre():
    """L'environnement pour lancer une autre copie de ce programme. Un programme PyInstaller « à fichier unique » qui en relance
    un autre (même fichier, ou fichier remplacé par une mise à jour) lui transmet ses variables internes : le nouveau
    réutiliserait alors le dossier temporaire de l'ancien, supprimé dès que celui-ci s'arrête (erreur « DLL load failed
    while importing _tkinter »). On les retire pour que le nouveau programme s'installe dans son propre dossier."""
    env = {k: v for k, v in os.environ.items() if not k.startswith("_PYI") and k != "_MEIPASS2"}
    env["PYINSTALLER_RESET_ENVIRONMENT"] = "1"
    return env


def lancer_en_fond(commande):
    """Lance le programme résident sans fenêtre et indépendamment de celle-ci."""
    options = {"stdin": subprocess.DEVNULL, "stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL, "env": _environnement_propre()}
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
        # prévient LEVAD (historique du lien) ; sans conséquence si le réseau est coupé
        try:
            config = lire_config()
            if config.get("code"):
                appel(config, "/api/agent/ping", {"pc": nom_du_poste(), "version": VERSION_AGENT, "desinstalle": True}, delai=10)
        except Exception:
            pass
    os.makedirs(dossier_donnees(), exist_ok=True)
    with open(_chemin("arret"), "w") as f:
        f.write("arrêt")
    journal("désinstallation demandée")
    if avec_demarrage_auto and sys.platform == "darwin" and getattr(sys, "frozen", False):
        _retirer_lancement_mac()                              # arrête aussitôt le programme résident
        dossier = dossier_donnees()
        subprocess.Popen(["sh", "-c", 'sleep 3; rm -rf "%s/Levad Connect.app" "%s/Levad Connect.old.app" "%s/maj-mac" "%s/config.json" "%s/config.bak" "%s/arret"'
                          % ((dossier,) * 6)], start_new_session=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


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
