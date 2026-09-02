/* ============================================================
   Export Excel « SA / SP type » — étude comparative de coûts.
   Feuille 1 « Comparatif » : Situation actuelle vs Solution
   proposée, une ligne par poste et par machine, avec totaux et
   économie annuelle. Feuille 2 « Détail » : reprise chiffrée.
   ============================================================ */

const Z_EUR = '#,##0.00" €"';
const Z_EUR0 = '#,##0" €"';
const Z_CC = '#,##0.000000" €"';
const Z_PAGES = '#,##0" Pages"';

function sideLines(side) {
  const services = side.ce - side.maintNB - side.maintCoul;
  const lines = [];
  lines.push(["Location — " + side.model, 1, side.loyer, side.loyer]);
  if (side.volNB || side.maintNB)
    lines.push(["Impressions N/B", side.volNB, side.ccNB, side.maintNB]);
  if (side.volCoul || side.maintCoul)
    lines.push(["Impressions couleurs", side.volCoul, side.ccCoul, side.maintCoul]);
  if (services)
    lines.push(["Services (pass, e-maintenance…)", 1, services, services]);
  return lines;
}

function cell(v, z) {
  if (v === "" || v === null || v === undefined) return { v: "" };
  if (typeof v === "number") return z ? { t: "n", v, z } : { t: "n", v };
  return { t: "s", v: String(v) };
}

function exportExcel(state, calc) {
  const wb = XLSX.utils.book_new();

  // ---------- Feuille Comparatif ----------
  const rows = [];      // tableau de tableaux de "cell"
  const merges = [];
  const push = (arr) => rows.push(arr);
  const R = () => rows.length; // index de la prochaine ligne

  push([cell("ÉTUDE COMPARATIVE DE COÛTS")]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
  push([cell(state.client.name || "Client")]);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });
  push([]);

  // en-tête des 2 blocs
  const hdrRow = R();
  push([
    cell("SITUATION ACTUELLE / TRIMESTRE (€ HT)"), cell(""), cell(""), cell(""),
    cell(""),
    cell("SOLUTION PROPOSÉE / TRIMESTRE (€ HT)"), cell(""), cell(""), cell(""),
  ]);
  merges.push({ s: { r: hdrRow, c: 0 }, e: { r: hdrRow, c: 3 } });
  merges.push({ s: { r: hdrRow, c: 5 }, e: { r: hdrRow, c: 8 } });

  const colHdr = ["Désignation", "Quantité", "PU HT", "Total HT"];
  push([
    ...colHdr.map((h) => cell(h)), cell(""),
    ...colHdr.map((h) => cell(h)),
  ]);

  // lignes par machine (SA à gauche, SP à droite, alignées)
  calc.rows.forEach((r, i) => {
    const sa = sideLines(r.sa), sp = sideLines(r.sp);
    const n = Math.max(sa.length, sp.length);
    for (let k = 0; k < n; k++) {
      const a = sa[k], b = sp[k];
      push([
        a ? cell(a[0]) : cell(""),
        a ? cell(a[1], a[0].startsWith("Location") || a[0].startsWith("Services") ? null : Z_PAGES) : cell(""),
        a ? cell(a[2], a[0].startsWith("Impressions") ? Z_CC : Z_EUR) : cell(""),
        a ? cell(a[3], Z_EUR) : cell(""),
        cell(""),
        b ? cell(b[0]) : cell(""),
        b ? cell(b[1], b[0].startsWith("Location") || b[0].startsWith("Services") ? null : Z_PAGES) : cell(""),
        b ? cell(b[2], b[0].startsWith("Impressions") ? Z_CC : Z_EUR) : cell(""),
        b ? cell(b[3], Z_EUR) : cell(""),
      ]);
    }
  });

  // totaux
  push([
    cell("TOTAL"), cell(""), cell(""), cell(calc.saTotal, Z_EUR), cell(""),
    cell("TOTAL"), cell(""), cell(""), cell(calc.spTotal, Z_EUR),
  ]);
  push([]);
  const ecoRow = R();
  const eco = calc.savingYear;
  push([cell(eco >= 0
    ? `Soit une économie de ${frNum(eco, 0)} € HT par an`
    : `Soit un surcoût de ${frNum(-eco, 0)} € HT par an`)]);
  merges.push({ s: { r: ecoRow, c: 0 }, e: { r: ecoRow, c: 8 } });

  const ws = XLSX.utils.aoa_to_sheet(rows.map((r) => r.map((c) => (c && c.v !== undefined ? c.v : ""))));
  // ré-applique types/formats
  rows.forEach((r, ri) => r.forEach((c, ci) => {
    if (!c || c.v === "" || c.v === undefined) return;
    const ref = XLSX.utils.encode_cell({ r: ri, c: ci });
    ws[ref] = c;
  }));
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 3 },
    { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Comparatif");

  // ---------- Feuille Détail ----------
  const d = [
    ["Client", state.client.name],
    ["Date", dateShort(state.client.date)],
    ["Durée (années)", state.durationYears],
    ["Coefficient leasing", coeffFor(state)],
    [],
    ["Machine", "Modèle actuel", "Modèle proposé", "Rachat", "Investissement",
     "Loyer SA", "Loyer SP", "CE SA", "CE SP", "Total SA", "Total SP"],
  ];
  calc.rows.forEach((r, i) => {
    d.push([
      "Machine " + (i + 1), r.sa.model, r.sp.model, r.rachat, r.invest,
      r.sa.loyer, r.sp.loyer, r.sa.ce, r.sp.ce, r.sa.total, r.sp.total,
    ]);
  });
  d.push([]);
  d.push(["", "", "", "", "", "", "", "", "TOTAL", calc.saTotal, calc.spTotal]);
  d.push(["Économie / trimestre", calc.savingQuarter]);
  d.push(["Économie / an", calc.savingYear]);
  const wd = XLSX.utils.aoa_to_sheet(d);
  wd["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 22 }].concat(Array(8).fill({ wch: 14 }));
  XLSX.utils.book_append_sheet(wb, wd, "Détail");

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    fileName(state, "xlsx"));
}
