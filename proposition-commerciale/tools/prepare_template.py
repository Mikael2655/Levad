#!/usr/bin/env python3
"""(Re)génère assets/template.pptx à partir de la présentation Offre_Commerciale.

Remplace les champs dynamiques par des jetons {{…}} (run unique) et applique
les retouches statiques demandées. Le navigateur (export-pptx.js) fait ensuite
la substitution des jetons et clone les lignes de tableau par machine.

Usage : python3 tools/prepare_template.py [SOURCE.pptx] [SORTIE.pptx]
Dépendance : python-pptx
"""
import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR

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


def drop_extra_paras(tf, keep):
    for p in tf.paragraphs[keep:]:
        p._p.getparent().remove(p._p)


def main():
    prs = Presentation(SRC)
    S = prs.slides

    # ---- Slide 1 (page de garde) ----
    s1 = S[0]
    set_para(shp(s1, "TextBox 13").text_frame.paragraphs[0], "{{DATE}}")
    tb14 = shp(s1, "TextBox 14").text_frame
    set_para(tb14.paragraphs[0], "{{REP_NAME}}")
    set_para(tb14.paragraphs[1], "{{REP_PHONE}}")
    set_para(tb14.paragraphs[2], "{{REP_MOBILE}}")
    set_para(tb14.paragraphs[3], "{{REP_EMAIL}}")
    # bas à droite : retire le téléphone, site = www.levad.fr (statique)
    tb15 = shp(s1, "TextBox 15").text_frame
    set_para(tb15.paragraphs[2], "")
    set_para(tb15.paragraphs[3], "www.levad.fr")

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
    set_para(tb7.paragraphs[2], "{{REP_PHONELINE}}")
    set_para(tb7.paragraphs[3], "")           # ancien 2e téléphone : supprimé
    set_para(tb7.paragraphs[4], "{{REP_EMAIL}}")
    tb9 = shp(s4, "TextBox 9").text_frame
    set_para(tb9.paragraphs[0], "{{CLIENT_NAME}}")
    set_para(tb9.paragraphs[1], "{{CLIENT_ADDR1}}")
    set_para(tb9.paragraphs[2], "{{CLIENT_ADDR2}}")

    # ---- Slide 26 (tableaux SA / SP) ----
    s26 = S[25]
    set_para(shp(s26, "TextBox 5").text_frame.paragraphs[0], "SITUATION ACTUELLE € HT / {{PER_UNIT}}")
    set_para(shp(s26, "TextBox 6").text_frame.paragraphs[0], "SOLUTION PROPOSEE € HT / {{PER_UNIT}}")
    tables = [s.table for s in s26.shapes if s.has_table]
    for tbl, pfx in zip(tables, ["SA", "SP"]):
        cells = tbl.rows[3].cells
        mapping = {0: "TYPE", 1: "FIN", 2: "LOYER", 3: "VNB", 4: "VCOUL",
                   5: "PASS", 6: "FNB", 7: "FCOUL", 8: "CCNB", 9: "CCCOUL", 10: "CE"}
        for ci, key in mapping.items():
            tf = cells[ci].text_frame
            set_para(tf.paragraphs[0], "{{%s_%s}}" % (pfx, key))
            drop_extra_paras(tf, 1)
        c11 = cells[11].text_frame           # total : plus de "soit …/mois"
        set_para(c11.paragraphs[0], "{{%s_TOTAL}}" % pfx)
        drop_extra_paras(c11, 1)

    # ---- Slide 27 (conditions financières) ----
    s27 = S[26]
    tb8 = shp(s27, "TextBox 8").text_frame
    set_para(tb8.paragraphs[1], " Durée : {{DUR_TRIM}} trimestres")
    set_para(tb8.paragraphs[2], " Périodicité {{PER_ADJ}}, terme à échoir")
    tb42 = shp(s27, "TextBox 17").text_frame   # références machines
    set_para(tb42.paragraphs[0], "{{PROP_MACHINE_1}}")
    set_para(tb42.paragraphs[2], "{{PROP_MACHINE_2}}")
    tb43 = shp(s27, "TextBox 26").text_frame   # loyers
    set_para(tb43.paragraphs[0], "Loyer {{PER_ADJ_MASC}} : {{PROP_LOYER_1}} € HT")
    set_para(tb43.paragraphs[2], "Loyer {{PER_ADJ_MASC}} : {{PROP_LOYER_2}} € HT")

    # ---- Slide 30 (e-maintenance) ----
    s30 = S[29]
    set_para(shp(s30, "TextBox 10").text_frame.paragraphs[0], "Service E-Maintenance : {{EMAINT_VAL}}")

    # ---- Slide 31 (bon pour accord) ----
    s31 = S[30]
    tb10 = shp(s31, "TextBox 10").text_frame
    set_para(tb10.paragraphs[0], "{{REP_NAME}}")
    set_para(tb10.paragraphs[1], "{{REP_TITLE}}")
    set_para(tb10.paragraphs[2], "{{REP_PHONELINE}}")
    set_para(tb10.paragraphs[3], "{{REP_EMAIL}}")
    tb11 = shp(s31, "TextBox 11").text_frame
    set_para(tb11.paragraphs[0], " Valeur {{PER_ADJ_CAP}} : {{SUM_VALEUR}} € HT")
    set_para(tb11.paragraphs[1], " Durée du leasing : {{DUR_TRIM}} Trimestres")
    set_para(tb11.paragraphs[3], " Coût à la page en Noir et Blanc : {{SUM_CC_NB}} € HT")
    set_para(tb11.paragraphs[4], " Coût à la page en Couleur : {{SUM_CC_COUL}} € HT")
    # cadre "bon pour accord" agrandi + bordure
    box = shp(s31, "TextBox 12")
    box.left = Inches(14.6); box.top = Inches(9.6)
    box.width = Inches(4.6); box.height = Inches(1.6)
    box.text_frame.word_wrap = True
    try:
        box.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    except Exception:
        pass
    ln = box.line
    ln.color.rgb = RGBColor(0x2F, 0x52, 0x33)
    ln.width = Pt(1.5)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    prs.save(OUT)
    print("Gabarit écrit :", OUT)
    Presentation(OUT)  # vérifie la réouverture


if __name__ == "__main__":
    main()
