#!/usr/bin/env python3
"""Extrait le catalogue Canon (gammes -> machines -> moteur/accessoires,
désignation + Prix de Cession HT) du PDF tarifaire fourni par LEVAD, et
génère assets/catalog.json utilisé par le configurateur du simulateur.

À relancer chaque mois quand LEVAD transmet un PDF tarifaire à jour.

Usage : python3 tools/parse_canon_catalog.py TARIFS.pdf [SORTIE.json]
Dépendance : PyMuPDF (pip install pymupdf)

Repérage dans le PDF (constaté sur l'édition juillet 2026, à revérifier si
la mise en page du PDF change d'une édition à l'autre) :
- en-tête de page (taille 14, y<=45) : gamme à gauche (x<250), nom de la
  machine en cours à droite (x>=250) - présent sur CHAQUE page.
- titres de section (taille 14, y>50, colonne de gauche) : "MOTEUR/SOLUTION
  D'IMPRESSION" et "ACCESSOIRES" sont conservés ; "AGRAFES", "ENCRE",
  "SERVICES PROFESSIONNELS", "TAMBOUR", "TONER" sont ignorés.
- dans une section conservée, chaque ligne d'article (repérée par un taux de
  remise du type "45,00%") porte, sur la même ligne : désignation (x<305),
  ..., taux de cession, puis le Prix de Cession HT (dernier montant de la
  ligne) - c'est la seule valeur retenue.
"""
import json
import re
import sys

import fitz

CATEGORIES = [
    "OFFICE - IMPRIMANTES LASER",
    "OFFICE - MULTIFONCTIONS I-SENSYS",
    "OFFICE - SYSTEMES D'IMPRESSION NOIR & BLANC",
    "OFFICE - SYSTEMES D'IMPRESSION COULEUR",
]
KEEP_SECTIONS = {"MOTEUR/SOLUTION D'IMPRESSION", "ACCESSOIRES"}
ALL_SECTIONS = KEEP_SECTIONS | {"AGRAFES", "ENCRE", "SERVICES PROFESSIONNELS", "TAMBOUR", "TONER"}

PCT_RE = re.compile(r"^\d{1,3},\d{2}%$")


def norm(s):
    return re.sub(r"\s+", " ", s).strip().upper()


def group_lines(words, ytol=2.0):
    lines = []
    for w in sorted(words, key=lambda w: (w[1], w[0])):
        y = w[1]
        for line in lines:
            if abs(line["y"] - y) <= ytol:
                line["words"].append(w)
                break
        else:
            lines.append({"y": y, "words": [w]})
    lines.sort(key=lambda l: l["y"])
    for line in lines:
        line["words"].sort(key=lambda w: w[0])
    return lines


def running_header(d):
    """Gamme + nom de machine courants, lus dans l'en-tête de page."""
    left, right = [], []
    for block in d["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                t = span["text"].strip()
                if not t or span["size"] < 13.5 or line["bbox"][1] > 45:
                    continue
                x0 = span["bbox"][0]
                (left if x0 < 250 else right).append((line["bbox"][1], x0, t))
    left.sort()
    right.sort()
    return " ".join(t for _, _, t in left).strip(), " ".join(t for _, _, t in right).strip()


def parse(src):
    doc = fitz.open(src)
    catalog = {cat: {} for cat in CATEGORIES}
    cur_section = None
    cur_machine_key = None

    for pno in range(doc.page_count):
        page = doc[pno]
        d = page.get_text("dict")
        cat, name = running_header(d)
        cat_match = next((c for c in CATEGORIES if norm(c) == norm(cat)), None)
        if cat_match is None or not name:
            continue

        machine_key = (cat_match, name)
        if machine_key != cur_machine_key:
            cur_machine_key = machine_key
            cur_section = None
            catalog[cat_match].setdefault(name, {"engine": [], "accessories": []})
        machine = catalog[cat_match][name]

        section_ys = {}
        for block in d["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    t = norm(span["text"])
                    if span["size"] >= 13.5 and line["bbox"][1] > 50 and t in ALL_SECTIONS:
                        section_ys[round(line["bbox"][1], 1)] = t

        lines = group_lines(page.get_text("words"))
        for line in lines:
            y = round(line["y"], 1)
            for sy, sname in section_ys.items():
                if abs(sy - y) <= 2.0:
                    cur_section = sname
                    break
            if cur_section not in KEEP_SECTIONS:
                continue
            texts = [w[4] for w in line["words"]]
            pct_idx = next((i for i, t in enumerate(texts) if PCT_RE.match(t)), None)
            if pct_idx is None:
                continue
            designation = " ".join(w[4] for w in line["words"] if w[0] < 305).strip()
            if not designation:
                continue
            price_str = "".join(texts[pct_idx + 1:]).replace("€", "").replace(" ", "") \
                .replace("\xa0", "").replace(",", ".")
            try:
                price = round(float(price_str), 2)
            except ValueError:
                continue
            target = machine["engine"] if cur_section == "MOTEUR/SOLUTION D'IMPRESSION" else machine["accessories"]
            if not any(it["designation"] == designation and it["price"] == price for it in target):
                target.append({"designation": designation, "price": price})

    doc.close()
    out = {}
    for cat, machines in catalog.items():
        out[cat] = [
            {"name": name, "engine": data["engine"], "accessories": data["accessories"]}
            for name, data in machines.items()
            if data["engine"] or data["accessories"]
        ]
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else "assets/catalog.json"
    catalog = parse(src)
    with open(out_path, "w", encoding="utf8") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(",", ":"))
    total = sum(len(m["engine"]) + len(m["accessories"]) for ms in catalog.values() for m in ms)
    print(f"Catalogue écrit : {out_path}")
    for cat, machines in catalog.items():
        print(f"  {cat} : {len(machines)} machines")
    print(f"Total articles : {total}")


if __name__ == "__main__":
    main()
