#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Levad Connect - version avec fenêtre, pour les clients (Windows et Mac).

Le client double-clique, tape le nom de sa société, clique sur « Lancer le relevé »,
et attend. Tout le travail est fait par releve_snmp.py (le même code que la version
en ligne de commande) ; ce fichier ne fait que l'habiller d'une fenêtre.
"""

import argparse
import contextlib
import os
import queue
import sys
import threading
import time
import tkinter as tk
from tkinter import messagebox, simpledialog, ttk

import levad_agent as A
import releve_snmp as R
from logos_levad import LOGO_CARRE_B64, LOGO_COMPLET_B64

TITRE = "Levad Connect"
VERT = "#8c9e8b"      # le vert du logo LEVAD


class EcrivainFile:
    """Récupère ce que le programme « affiche » pour le mettre dans le cadre « détail »."""

    def __init__(self, file):
        self.file = file

    def write(self, texte):
        if texte:
            self.file.put(("log", texte))
        return len(texte or "")

    def flush(self):
        pass


class Fenetre:
    def __init__(self, racine, plage=None, port=161):
        self.racine, self.port = racine, port
        self.file = queue.Queue()
        self.en_cours = False
        if plage:                                   # réservé aux essais
            R.plage_locale = lambda: plage

        racine.title(TITRE)
        racine.geometry("560x590")
        racine.minsize(520, 560)

        # Logos : le carré vert comme icône de la fenêtre, le logo complet en en-tête
        self.logo_carre = tk.PhotoImage(data=LOGO_CARRE_B64).subsample(4, 4)
        self.logo_complet = tk.PhotoImage(data=LOGO_COMPLET_B64)
        try:
            racine.iconphoto(True, self.logo_carre)
        except tk.TclError:
            pass

        entete = tk.Frame(racine, bg="white")
        entete.pack(fill="x")
        tk.Label(entete, image=self.logo_complet, bg="white").pack(anchor="w", padx=20, pady=(16, 4))
        tk.Label(entete, text="Connect - Relevé des copieurs de votre entreprise", bg="white", fg="#475569",
                 font=("Helvetica", 11)).pack(anchor="w", padx=22, pady=(0, 12))
        tk.Frame(racine, bg=VERT, height=4).pack(fill="x")

        corps = tk.Frame(racine)
        corps.pack(fill="both", expand=True, padx=20, pady=14)
        tk.Label(corps, justify="left", wraplength=500, anchor="w",
                 text="Ce programme cherche les copieurs de votre réseau et lit leurs compteurs "
                      "et niveaux d'encre. Il ne modifie aucun réglage. Le résultat est transmis "
                      "automatiquement à LEVAD.").pack(anchor="w", pady=(0, 12))

        tk.Label(corps, text="Nom de votre société").pack(anchor="w")
        self.societe = tk.StringVar()
        self.champ = ttk.Entry(corps, textvariable=self.societe, width=44)
        self.champ.pack(anchor="w", pady=(2, 12))
        self.champ.focus_set()
        self.champ.bind("<Return>", lambda e: self.lancer())

        self.bouton = ttk.Button(corps, text="Lancer le relevé", command=self.lancer)
        self.bouton.pack(anchor="w")

        self.barre = ttk.Progressbar(corps, mode="indeterminate", length=500)
        self.etat = tk.Label(corps, text="", justify="left", wraplength=500, anchor="w")
        self.etat.pack(anchor="w", pady=(12, 0))

        # Le détail technique (nombre de machines, adresses...) n'est pas montré aux clients.
        # Pour le support LEVAD : Ctrl + Maj + D (ou Cmd + Maj + D sur Mac) l'affiche.
        self.detail_visible = False
        self.detail = tk.Text(corps, height=8, width=64, state="disabled", font=("Courier", 9))
        for raccourci in ("<Control-Shift-D>", "<Command-Shift-D>"):
            try:
                racine.bind(raccourci, lambda e: self.basculer_detail())
            except tk.TclError:
                pass

        racine.after(100, self.pomper)

    # --- affichage -----------------------------------------------------
    def basculer_detail(self):
        self.detail_visible = not self.detail_visible
        if self.detail_visible:
            self.detail.pack(anchor="w", pady=(10, 0), fill="both", expand=True)
        else:
            self.detail.pack_forget()

    def ecrire_detail(self, texte):
        self.detail.config(state="normal")
        self.detail.insert("end", texte)
        self.detail.see("end")
        self.detail.config(state="disabled")

    # --- lancement du relevé --------------------------------------------
    def lancer(self):
        if self.en_cours:
            return
        if not self.societe.get().strip():
            messagebox.showinfo(TITRE, "Merci d'indiquer le nom de votre société avant de lancer le relevé.")
            return
        self.en_cours = True
        self.bouton.config(state="disabled")
        self.champ.config(state="disabled")
        self.barre.pack(anchor="w", pady=(14, 0), before=self.etat)
        self.barre.start(12)
        self.etat.config(text="Démarrage…", fg="black")
        threading.Thread(target=self.travail, args=(self.societe.get().strip(),), daemon=True).start()

    def poser_question(self, texte):
        """Appelée par le travail de fond : pose la question dans une fenêtre et attend la réponse."""
        evenement, reponse = threading.Event(), []
        self.file.put(("question", texte.replace("sinon Entrée", "sinon laissez vide"), evenement, reponse))
        evenement.wait()
        return reponse[0] if reponse else ""

    def travail(self, societe):
        R.ETAT = lambda message: self.file.put(("etat", message))
        R._question = self.poser_question
        try:
            with contextlib.redirect_stdout(EcrivainFile(self.file)):
                R.mode_client("public", 2.0, self.port, (1, 0), None, societe=societe or None)
        except Exception as e:
            self.file.put(("erreur", str(e)))
        else:
            self.file.put(("fin", None))

    def pomper(self):
        """Traite, côté fenêtre, les messages envoyés par le travail de fond."""
        try:
            while True:
                genre, *reste = self.file.get_nowait()
                if genre == "log":
                    self.ecrire_detail(reste[0])
                elif genre == "etat":
                    self.etat.config(text=reste[0])
                elif genre == "question":
                    texte, evenement, reponse = reste
                    saisie = simpledialog.askstring(TITRE, texte, parent=self.racine)
                    reponse.append((saisie or "").strip())
                    evenement.set()
                elif genre == "fin":
                    self.terminer()
                elif genre == "erreur":
                    self.terminer(erreur=reste[0])
        except queue.Empty:
            pass
        self.racine.after(100, self.pomper)

    def terminer(self, erreur=None):
        self.barre.stop()
        self.barre.pack_forget()
        self.en_cours = False
        res = R.DERNIER_RESULTAT
        if erreur:
            message = "Une erreur est survenue : %s\n\nMerci de prévenir LEVAD." % erreur
            self.etat.config(text=message, fg="#b91c1c")
            messagebox.showerror(TITRE, message)
        elif res["envoye"] and res["copieurs"] == 0:
            message = ("Aucun copieur n'a été trouvé sur votre réseau. LEVAD en a été informé.\n\n"
                       "Sur Mac, vérifiez que « Levad Connect » est autorisé dans Réglages Système > "
                       "Confidentialité et sécurité > Réseau local, puis relancez le relevé.")
            self.etat.config(text=message, fg="#b45309")
            messagebox.showwarning(TITRE, message)
        elif res["envoye"]:
            message = ("Terminé : le relevé a été transmis à LEVAD.\n\n"
                       "Merci ! Vous pouvez fermer cette fenêtre.")
            self.etat.config(text=message, fg="#15803d")
            messagebox.showinfo(TITRE, message)
        elif res["fichier"]:
            message = ("L'envoi n'a pas pu se faire.\n\nUn fichier a été enregistré ici :\n%s\n\n"
                       "Merci de l'envoyer par mail à LEVAD." % res["fichier"])
            self.etat.config(text=message, fg="#b45309")
            messagebox.showwarning(TITRE, message)
        else:
            message = "Le relevé n'a pas pu être fait. Merci de prévenir LEVAD."
            self.etat.config(text=message, fg="#b91c1c")
            messagebox.showwarning(TITRE, message)


class FenetreResident:
    """
    Fenêtre du programme résident : installation au premier lancement (si le nom du fichier contient le code du
    client), puis, une fois installé, état du programme et possibilité de le désinstaller.
    """

    def __init__(self, racine, code=None):
        self.racine, self.code = racine, code
        racine.title(TITRE)
        racine.geometry("560x460")
        racine.minsize(520, 420)
        self.logo_carre = tk.PhotoImage(data=LOGO_CARRE_B64).subsample(4, 4)
        self.logo_complet = tk.PhotoImage(data=LOGO_COMPLET_B64)
        try:
            racine.iconphoto(True, self.logo_carre)
        except tk.TclError:
            pass
        entete = tk.Frame(racine, bg="white")
        entete.pack(fill="x")
        tk.Label(entete, image=self.logo_complet, bg="white").pack(anchor="w", padx=20, pady=(16, 4))
        tk.Label(entete, text="Connect - Relevé automatique de vos copieurs", bg="white", fg="#475569",
                 font=("Helvetica", 11)).pack(anchor="w", padx=22, pady=(0, 12))
        tk.Frame(racine, bg=VERT, height=4).pack(fill="x")
        self.corps = tk.Frame(racine)
        self.corps.pack(fill="both", expand=True, padx=20, pady=16)
        self.afficher()

    def vider(self):
        for w in self.corps.winfo_children():
            w.destroy()

    def texte(self, contenu, couleur="black"):
        tk.Label(self.corps, text=contenu, justify="left", wraplength=500, anchor="w", fg=couleur).pack(anchor="w", pady=(0, 12))

    def afficher(self):
        self.vider()
        if A.est_installe():
            config = A.lire_config()
            derniere = config.get("derniere_lecture")
            quand = (time.strftime("%d/%m/%Y à %H:%M", time.localtime(derniere)) if derniere else "pas encore de lecture")
            self.texte("Levad Connect est installé sur cet ordinateur et fonctionne en arrière-plan : il relève vos copieurs "
                       "automatiquement. Vous n'avez rien à faire.", "#15803d")
            self.texte("Dernière lecture : %s (une lecture toutes les 30 minutes)\nVersion installée : %s"
                       % (quand, config.get("version_installee") or "inconnue"))
            ttk.Button(self.corps, text="Désinstaller", command=self.desinstaller).pack(anchor="w")
        else:
            self.texte("Levad Connect va s'installer sur cet ordinateur. Il relèvera ensuite vos copieurs "
                       "automatiquement, en arrière-plan, à chaque démarrage de l'ordinateur. Il ne modifie aucun réglage "
                       "et peut être désinstallé à tout moment.")
            self.bouton = ttk.Button(self.corps, text="Installer", command=self.installer)
            self.bouton.pack(anchor="w")
        self.etat = tk.Label(self.corps, text="", justify="left", wraplength=500, anchor="w")
        self.etat.pack(anchor="w", pady=(14, 0))

    def installer(self):
        self.bouton.config(state="disabled")
        self.etat.config(text="Installation en cours…", fg="black")
        self.racine.update_idletasks()
        config = {"code": self.code, "serveur": os.environ.get("LEVAD_SERVEUR") or A.SERVEUR_PAR_DEFAUT}
        try:
            A.signal_de_vie(config)                    # vérifie que le lien est valable avant d'installer
        except A.CodeInconnu:
            self.etat.config(text="Ce lien d'installation n'est plus valable. Merci de contacter LEVAD.", fg="#b91c1c")
            self.bouton.config(state="normal")
            return
        except Exception as e:
            self.etat.config(text="Impossible de joindre LEVAD (%s). Vérifiez la connexion Internet puis réessayez." % e, fg="#b91c1c")
            self.bouton.config(state="normal")
            return
        try:
            A.installer(self.code, os.environ.get("LEVAD_SERVEUR") or None,
                        avec_demarrage_auto=not os.environ.get("LEVAD_SANS_AUTODEMARRAGE"))
        except Exception as e:
            self.etat.config(text="L'installation a échoué : %s. Merci de contacter LEVAD." % e, fg="#b91c1c")
            self.bouton.config(state="normal")
            return
        self.afficher()
        self.etat.config(text="Installation terminée. La première lecture se fait en arrière-plan : vous pouvez fermer cette fenêtre.",
                         fg="#15803d")

    def desinstaller(self):
        if messagebox.askyesno(TITRE, "Désinstaller Levad Connect de cet ordinateur ?\nLes copieurs ne seront plus relevés automatiquement."):
            A.desinstaller(avec_demarrage_auto=not os.environ.get("LEVAD_SANS_AUTODEMARRAGE"))
            self.vider()
            self.texte("Levad Connect a été désinstallé. Vous pouvez fermer cette fenêtre.", "#15803d")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", action="store_true", help=argparse.SUPPRESS)      # programme résident (sans fenêtre)
    parser.add_argument("--desinstaller", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--autotest", action="store_true", help=argparse.SUPPRESS)   # essai de fabrication
    parser.add_argument("--verifier", action="store_true", help=argparse.SUPPRESS)   # essai de démarrage avant une mise à jour
    parser.add_argument("--plage", help=argparse.SUPPRESS)                          # essais
    parser.add_argument("--port", type=int, default=161, help=argparse.SUPPRESS)    # essais
    args, _ = parser.parse_known_args()

    if args.verifier:                             # le programme démarre correctement : rien d'autre à faire
        return 0
    if args.agent:                                # arrière-plan : aucune fenêtre
        return A.boucle()
    if args.desinstaller:
        A.desinstaller(avec_demarrage_auto=not os.environ.get("LEVAD_SANS_AUTODEMARRAGE"))
        return 0

    try:                                          # écran net sous Windows (haute résolution)
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        pass

    racine = tk.Tk()
    code = A.code_depuis_nom_de_fichier()
    if A.est_installe() or code:
        FenetreResident(racine, code or A.lire_config().get("code"))
    else:
        Fenetre(racine, plage=args.plage, port=args.port)
    if args.autotest:                             # ouvre la fenêtre, la referme, et quitte avec le code 0
        racine.after(500, racine.destroy)
    racine.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
