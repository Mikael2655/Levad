#!/usr/bin/env python3
"""(Re)génère assets/template.pptx à partir d'une présentation Offre_Commerciale.

Remplace les champs dynamiques par des jetons {{…}} à run unique pour que le
navigateur puisse faire une simple substitution de chaîne. Les 2 tableaux du
slide 26 (SA = actuel en haut, SP = proposé en bas) conservent une ligne de
données tokenisée que le navigateur clone pour chaque machine.

Usage :
    python3 tools/prepare_template.py [SOURCE.pptx] [SORTIE.pptx]
Par défaut : SOURCE = tools/Offre_Commerciale.pptx, SORTIE = assets/template.pptx

Dépendance : python-pptx  (pip install python-pptx)
"""
import os
import sys
from pptx import Presentation

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "Offre_Commerciale.pptx")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "assets", "template.pptx")


def shp(slide, name):
    for s in slide.shapes:
        if s.name == name:
            return s
    raise KeyError(name)


def set_para(paragraph, text):
    """Force un paragraphe à un seul run = text, en gardant le format du 1er run."""
    runs = paragraph.runs
    if not runs:
        return
    runs[0].text = text
    for r in runs[1:]:
        r._r.getparent().remove(r._r)


def main():
    prs = Presentation(SRC)
    S = prs.slides

    # ---- Slide 1 (page de garde) ----
    s1 = S[0]
    set_para(shp(s1, "TextBox 13").text_frame.paragraphs[0], "{{DATE}}")
    tb14 = shp(s1, "TextBox 14").text_frame
    set_para(tb14.paragraphs[0], "{{REP_NAME}}")
    set_para(tb14.paragraphs[3], "{{REP_EMAIL}}")

    # ---- Slide 4 (lettre) ----
    s4 = S[3]
    tb5 = shp(s4, "TextBox 5").text_frame
    p0 = tb5.paragraphs[0]
    p0.runs[0].text = "Paris, le "
    p0.runs[1].text = "{{DATE_LONG}}"
    for r in p0.runs[2:]:
        r._r.getparent().remove(r._r)
    set_para(tb5.paragraphs[1], "{{CLIENT_CONTACT}}")
    set_para(shp(s4, "TextBox 6").text_frame.paragraphs[0], "{{MACHINE_HEADLINE}}")
    tb7 = shp(s4, "TextBox 7").text_frame
    set_para(tb7.paragraphs[0], "{{REP_NAME}}")
    set_para(tb7.paragraphs[1], "{{REP_TITLE}}")
    set_para(tb7.paragraphs[4], "{{REP_EMAIL}}")
    tb9 = shp(s4, "TextBox 9").text_frame
    set_para(tb9.paragraphs[0], "{{CLIENT_NAME}}")
    set_para(tb9.paragraphs[1], "{{CLIENT_ADDR1}}")
    set_para(tb9.paragraphs[2], "{{CLIENT_ADDR2}}")

    # ---- Slide 31 (bon pour accord) ----
    s31 = S[30]
    tb10 = shp(s31, "TextBox 10").text_frame
    set_para(tb10.paragraphs[0], "{{REP_NAME}}")
    set_para(tb10.paragraphs[1], "{{REP_TITLE}}")
    set_para(tb10.paragraphs[3], "{{REP_EMAIL}}")
    tb11 = shp(s31, "TextBox 11").text_frame
    set_para(tb11.paragraphs[0], " Valeur Mensuelle : {{SUM_MENSUEL}} € HT")
    set_para(tb11.paragraphs[1], " Durée du leasing : {{SUM_TRIMESTRES}} Trimestres")
    set_para(tb11.paragraphs[3], " Coût à la page en Noir et Blanc : {{SUM_CC_NB}} € HT")
    set_para(tb11.paragraphs[4], " Coût à la page en Couleur : {{SUM_CC_COUL}} € HT")

    # ---- Slide 26 (tableaux SA / SP) ----
    s26 = S[25]
    tables = [s.table for s in s26.shapes if s.has_table]
    for tbl, pfx in zip(tables, ["SA", "SP"]):  # 1er tableau = SA, 2e = SP
        cells = tbl.rows[3].cells  # ligne de données
        mapping = {0: "TYPE", 1: "FIN", 2: "LOYER", 3: "VNB", 4: "VCOUL",
                   5: "PASS", 6: "FNB", 7: "FCOUL", 8: "CCNB", 9: "CCCOUL", 10: "CE"}
        for ci, key in mapping.items():
            tf = cells[ci].text_frame
            set_para(tf.paragraphs[0], "{{%s_%s}}" % (pfx, key))
            for p in tf.paragraphs[1:]:
                p._p.getparent().remove(p._p)
        c11 = cells[11].text_frame
        set_para(c11.paragraphs[0], "{{%s_TOTAL}}" % pfx)
        if len(c11.paragraphs) > 1:
            set_para(c11.paragraphs[1], "{{%s_TOTAL2}}" % pfx)
            for p in c11.paragraphs[2:]:
                p._p.getparent().remove(p._p)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    prs.save(OUT)
    print("Gabarit écrit :", OUT)


if __name__ == "__main__":
    main()
