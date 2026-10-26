#!/usr/bin/env python3
"""
Levad Connect pour Linux : version sans fenêtre, à lancer dans un terminal.

  chmod +x Levad-Connect-<code>
  ./Levad-Connect-<code>            installe le programme (démarrage automatique par cron) et le lance
  ./Levad-Connect-<code> --desinstaller

Le code du client est lu dans le nom du fichier téléchargé, comme sous Windows. Le programme est copié dans
~/.levad-connect, relancé au démarrage de la machine et toutes les 15 minutes s'il s'est arrêté (une seule copie tourne à la fois).
Aucun droit administrateur n'est nécessaire. Les mises à jour automatiques ne sont pas encore prévues sous Linux :
pour changer de version, télécharger à nouveau le programme avec le même lien et le relancer.
Ce fichier est volontairement séparé de levad-connect/ : il n'a aucune incidence sur les versions Windows et Mac.
"""
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "levad-connect"))
import levad_agent as A  # noqa: E402

MARQUE_CRON = "# levad-connect"


def _programme():
    return os.path.join(A.dossier_donnees(), "levad-connect")


def _lignes_cron():
    r = subprocess.run(["crontab", "-l"], capture_output=True, text=True, timeout=30)
    return r.stdout.splitlines() if r.returncode == 0 else []


def _ecrire_cron(lignes):
    subprocess.run(["crontab", "-"], input="\n".join(lignes) + "\n", text=True, check=True, timeout=30)


def installer_demarrage():
    """Ajoute (sans toucher au reste) les deux lignes cron de Levad Connect. Retourne False si crontab est absent."""
    try:
        autres = [l for l in _lignes_cron() if MARQUE_CRON not in l]
        commande = '"%s" --agent >/dev/null 2>&1' % _programme()
        _ecrire_cron(autres + ["@reboot %s %s" % (commande, MARQUE_CRON), "*/15 * * * * %s %s" % (commande, MARQUE_CRON)])
        return True
    except (OSError, subprocess.SubprocessError):
        return False


def retirer_demarrage():
    try:
        _ecrire_cron([l for l in _lignes_cron() if MARQUE_CRON not in l])
    except (OSError, subprocess.SubprocessError):
        pass


def installer():
    code = A.code_depuis_nom_de_fichier()
    if not code:
        print("Le nom du fichier doit contenir le code du client : Levad-Connect-<code>. Retéléchargez le programme avec le lien du client.")
        return 1
    os.makedirs(A.dossier_donnees(), exist_ok=True)
    config = A.lire_config()
    config.update({"code": code, "serveur": config.get("serveur") or A.SERVEUR_PAR_DEFAUT, "version_installee": A.VERSION_AGENT})
    A.ecrire_config(config)
    try:
        os.remove(A._chemin("arret"))
    except OSError:
        pass
    if getattr(sys, "frozen", False) and os.path.abspath(sys.executable) != os.path.abspath(_programme()):
        shutil.copy2(sys.executable, _programme())
        os.chmod(_programme(), 0o755)
    A.journal("installé sous Linux (code %s…)" % code[:4])
    cron = False if os.environ.get("LEVAD_SANS_AUTODEMARRAGE") else installer_demarrage()
    if not os.environ.get("LEVAD_SANS_LANCEMENT"):
        A.lancer_en_fond([_programme(), "--agent"] if getattr(sys, "frozen", False) else [sys.executable, os.path.abspath(__file__), "--agent"])
    print("Levad Connect est installé et démarré (version %s)." % A.VERSION_AGENT)
    print("Il recherche les copieurs du réseau : les machines apparaissent chez LEVAD dans quelques minutes.")
    if not cron and not os.environ.get("LEVAD_SANS_AUTODEMARRAGE"):
        print("Attention : « crontab » est introuvable, le programme ne redémarrera pas tout seul avec la machine.")
    print("Journal : %s" % A._chemin("agent.log"))
    return 0


def main():
    args = sys.argv[1:]
    if "--verifier" in args:
        return 0
    if "--agent" in args:
        return A.boucle()
    if "--desinstaller" in args:
        retirer_demarrage()
        A.desinstaller(avec_demarrage_auto=False)
        print("Levad Connect a été désinstallé (le dossier %s peut être supprimé)." % A.dossier_donnees())
        return 0
    return installer()


if __name__ == "__main__":
    sys.exit(main())
