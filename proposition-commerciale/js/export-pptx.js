/* ============================================================
   Export PowerPoint : réutilise votre modèle complet (31 slides)
   comme gabarit et n'injecte que les données.
   - slides 1 / 4 / 31 : remplacement de jetons {{...}}
   - slide 26 : les 2 tableaux (SA en haut, SP en bas) sont
     régénérés avec une ligne par machine, et le bloc SP est
     décalé vers le bas selon le nombre de lignes SA.
   ============================================================ */

const ROW_H = 573542;          // hauteur EMU d'une ligne de données
const SA_EXT_CY = 2586982;     // hauteur EMU d'origine du tableau SA
const SP_EXT_CY = 2635026;     // hauteur EMU d'origine du tableau SP
const SP_OFF_Y = 6942042;      // position Y d'origine du tableau SP
const SP_TITLE_Y = 6167707;    // position Y d'origine du titre "SOLUTION PROPOSEE"

function xmlEsc(v) {
  return String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function moneySmart(v, ht) {
  const n = num(v);
  const dec = Number.isInteger(n) ? 0 : 2;
  return frNum(n, dec) + (ht ? " € HT" : " €");
}

/* Valeurs d'une ligne de tableau (SA ou SP) -> map jeton/valeur. */
function rowTokens(pfx, r) {
  const perMonth = Math.round(r.total / 3);
  return {
    [`${pfx}_TYPE`]: r.model,
    [`${pfx}_FIN`]: r.fin,
    [`${pfx}_LOYER`]: moneySmart(r.loyer, true),
    [`${pfx}_VNB`]: pages(r.volNB),
    [`${pfx}_VCOUL`]: pages(r.volCoul),
    [`${pfx}_PASS`]: r.pass ? moneySmart(r.pass, false) : "0",
    [`${pfx}_FNB`]: r.forfaitNB ? moneySmart(r.forfaitNB, false) : "0",
    [`${pfx}_FCOUL`]: r.forfaitCoul ? moneySmart(r.forfaitCoul, false) : "0",
    [`${pfx}_CCNB`]: ccFmt(r.ccNB),
    [`${pfx}_CCCOUL`]: ccFmt(r.ccCoul),
    [`${pfx}_CE`]: moneySmart(r.ce, false),
    [`${pfx}_TOTAL`]: moneySmart(r.total, false),
    [`${pfx}_TOTAL2`]: `Soit ${perMonth}€ / Mois`,
  };
}

function fillRow(rowXml, tokens) {
  let out = rowXml;
  for (const [k, v] of Object.entries(tokens)) {
    out = out.split("{{" + k + "}}").join(xmlEsc(v));
  }
  return out;
}

/* Régénère un tableau (une ligne par machine) à partir de la ligne modèle. */
function expandTable(xml, pfx, rows) {
  const tokIdx = xml.indexOf(`{{${pfx}_TYPE}}`);
  if (tokIdx < 0) return { xml, count: 1 };
  const start = xml.lastIndexOf("<a:tr ", tokIdx);
  const end = xml.indexOf("</a:tr>", tokIdx) + "</a:tr>".length;
  const template = xml.slice(start, end);
  const built = rows.map((r) => fillRow(template, rowTokens(pfx, r[pfx === "SA" ? "sa" : "sp"]))).join("");
  return { xml: xml.slice(0, start) + built + xml.slice(end), count: rows.length };
}

function buildSlide26(xml, calc) {
  // 1) tableau SA (premier), puis tableau SP (deuxième)
  let r = expandTable(xml, "SA", calc.rows);
  xml = r.xml; const nSA = r.count;
  r = expandTable(xml, "SP", calc.rows);
  xml = r.xml; const nSP = r.count;

  // 2) décalage vertical : le bloc SP descend selon les lignes SA en trop
  const deltaSA = (nSA - 1) * ROW_H;
  if (deltaSA > 0) {
    xml = xml.replace(`cy="${SA_EXT_CY}"`, `cy="${SA_EXT_CY + deltaSA}"`);
    xml = xml.replace(`y="${SP_OFF_Y}"`, `y="${SP_OFF_Y + deltaSA}"`);
    xml = xml.replace(`y="${SP_TITLE_Y}"`, `y="${SP_TITLE_Y + deltaSA}"`);
  }
  const deltaSP = (nSP - 1) * ROW_H;
  if (deltaSP > 0) {
    xml = xml.replace(`cy="${SP_EXT_CY}"`, `cy="${SP_EXT_CY + deltaSP}"`);
  }
  return xml;
}

/* Jetons scalaires (client, commercial, dates, synthèse). */
function scalarTokens(state, calc) {
  const c = state.client, co = state.company;
  const headline = state.machines.map((m) => m.proposedModel).filter(Boolean).join(" / ")
                   || "Solution proposée";
  const first = calc.rows[0] ? calc.rows[0].sp : { ccNB: 0, ccCoul: 0 };
  return {
    DATE: dateShort(c.date),
    DATE_LONG: dateLong(c.date),
    CLIENT_NAME: c.name || "Client",
    CLIENT_CONTACT: c.contact || "Madame, Monsieur,",
    CLIENT_ADDR1: c.addr1 || "",
    CLIENT_ADDR2: c.addr2 || "",
    MACHINE_HEADLINE: headline,
    REP_NAME: co.repName || "",
    REP_TITLE: co.repTitle || "",
    REP_EMAIL: co.repEmail || "",
    SUM_MENSUEL: moneySmartPlain(calc.spLoyerTotal / 3),
    SUM_TRIMESTRES: String(calc.durationTrim),
    SUM_CC_NB: ccPlain(first.ccNB),
    SUM_CC_COUL: ccPlain(first.ccCoul),
  };
}
/* Coût copie sans symbole : 2 à 6 décimales (ex. 0,005). */
function ccPlain(v) {
  return num(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}
function moneySmartPlain(v) { const n = num(v); return frNum(n, Number.isInteger(n) ? 0 : 2); }

async function exportPptx(state, calc) {
  const resp = await fetch("assets/template.pptx", { cache: "reload" });
  if (!resp.ok) throw new Error("Gabarit PowerPoint introuvable (assets/template.pptx)");
  const buf = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // slide 26 : tableaux dynamiques
  const s26path = "ppt/slides/slide26.xml";
  let s26 = await zip.file(s26path).async("string");
  s26 = buildSlide26(s26, calc);
  zip.file(s26path, s26);

  // jetons scalaires sur toutes les slides
  const scal = scalarTokens(state, calc);
  const slideFiles = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
  for (const p of slideFiles) {
    let x = await zip.file(p).async("string");
    if (x.indexOf("{{") < 0) continue;
    for (const [k, v] of Object.entries(scal)) {
      x = x.split("{{" + k + "}}").join(xmlEsc(v));
    }
    zip.file(p, x);
  }

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    compression: "DEFLATE",
  });
  downloadBlob(blob, fileName(state, "pptx"));
}
