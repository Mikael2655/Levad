/* ============================================================
   Moteur de calcul SA / SP.

   Tous les montants internes sont calculés au TRIMESTRE. La
   périodicité (T/M) ne change que l'affichage (÷3 pour le mois),
   sauf le loyer proposé dont le coefficient est majoré de 1,5 %
   en paiement mensuel.
   ============================================================ */

function num(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(",", ".").replace(/\s/g, ""));
  return isFinite(n) ? n : 0;
}

/* Volume facturable = le plus gros de (forfait + dépassement) ou volume réel. */
function billedVol(forfait, depass, reel) {
  return Math.max(num(forfait) + num(depass), num(reel));
}

/* Tranche (index 0/1/2) pour un montant financé. */
function trancheIndex(financed) {
  for (let i = 0; i < TRANCHES.length; i++) if (financed < TRANCHES[i]) return i;
  return TRANCHES.length - 1;
}

/* Coefficient trimestriel de base : override admin sinon barème. */
function baseCoeff(state, financed) {
  const ov = num(state.coeffOverride);
  if (state.coeffOverride !== "" && ov > 0) return ov;
  const table = BAREME[state.leaser] || BAREME.GRENKE;
  const row = table[state.durationTrim];
  if (!row) return 0;
  return row[trancheIndex(financed)];
}
/* Coefficient effectif (majoré en mensuel). */
function effCoeff(state, financed) {
  return baseCoeff(state, financed) * (state.periodicite === "M" ? MAJ_MENSUEL : 1);
}

/* Rachat du contrat actuel. */
function rachatMachine(m) {
  const loyer = num(m.loyerActuel), trim = num(m.trimRestants);
  const base = loyer * trim;
  if (!m.prospect) return base; // client Levad : solde des loyers restants
  // prospect (chez un concurrent) : loyers + 10% + maintenance + abonnements
  const maintNB = billedVol(m.forfaitNB, m.depassNB, m.volNBreel) * num(m.ccNBactuel);
  const maintCoul = billedVol(m.forfaitCoul, m.depassCoul, m.volCoulReel) * num(m.ccCoulActuel);
  const abos = (m.services || []).reduce((a, s) => a + num(s.sa), 0);
  return base * 1.10 + (maintNB + maintCoul + abos) * trim;
}

function computeMachine(m, state) {
  const rachat = rachatMachine(m);
  const prixComplet = num(m.prixMachine) + num(m.livraison) + num(m.portageLivraison) +
                      num(m.retrait) + num(m.portageRetrait) + num(m.installation);
  const financed = rachat + prixComplet + num(m.marge) + num(m.cadeaux);
  const coeffT = baseCoeff(state, financed);
  const spLoyer = financed * effCoeff(state, financed) / 100;

  const billedNB = billedVol(m.forfaitNB, m.depassNB, m.volNBreel);
  const billedCoul = billedVol(m.forfaitCoul, m.depassCoul, m.volCoulReel);

  const saMaintNB = billedNB * num(m.ccNBactuel);
  const saMaintCoul = billedCoul * num(m.ccCoulActuel);
  const spMaintNB = billedNB * num(m.ccNBpropose);
  const spMaintCoul = billedCoul * num(m.ccCoulPropose);

  const services = (m.services || []).map((s) => ({ label: s.label, sa: num(s.sa), sp: num(s.sp) }))
    .filter((s) => s.sa || s.sp); // seulement les services avec un montant
  const saServ = services.reduce((a, s) => a + s.sa, 0);
  const spServ = services.reduce((a, s) => a + s.sp, 0);

  const saTotal = num(m.loyerActuel) + saMaintNB + saMaintCoul + saServ;
  const spTotal = spLoyer + spMaintNB + spMaintCoul + spServ;

  return {
    rachat, financed, coeffT, prixComplet, marge: num(m.marge),
    cadeaux: num(m.cadeaux), cadeauxLabel: m.cadeauxLabel || "",
    billedNB, billedCoul, services,
    sa: {
      model: m.currentModel || "Machine actuelle", fin: "Location",
      loyer: num(m.loyerActuel), volNB: billedNB, volCoul: billedCoul,
      ccNB: num(m.ccNBactuel), ccCoul: num(m.ccCoulActuel),
      maintNB: saMaintNB, maintCoul: saMaintCoul, servTotal: saServ, total: saTotal,
    },
    sp: {
      model: m.proposedModel || "Machine proposée", fin: "Location",
      loyer: spLoyer, volNB: billedNB, volCoul: billedCoul,
      ccNB: num(m.ccNBpropose), ccCoul: num(m.ccCoulPropose),
      maintNB: spMaintNB, maintCoul: spMaintCoul, servTotal: spServ, total: spTotal,
    },
  };
}

function computeAll(state) {
  const rows = state.machines.map((m) => computeMachine(m, state));
  const sum = (side, key) => rows.reduce((a, r) => a + r[side][key], 0);
  const saTotal = sum("sa", "total"), spTotal = sum("sp", "total");
  const savingQuarter = saTotal - spTotal;
  return {
    rows, saTotal, spTotal,
    savingQuarter, savingYear: savingQuarter * 4,
    spLoyerTotal: sum("sp", "loyer"),
    rachatTotal: rows.reduce((a, r) => a + r.rachat, 0),
    durationTrim: state.durationTrim,
    divisor: state.periodicite === "M" ? 3 : 1,
  };
}

/* -------- Périodicité -------- */
function perDivisor(state) { return state.periodicite === "M" ? 3 : 1; }
function perUnit(state) { return state.periodicite === "M" ? "MOIS" : "TRIMESTRE"; }
function perAdj(state) { return state.periodicite === "M" ? "mensuelle" : "trimestrielle"; }
function perAdjCap(state) { return state.periodicite === "M" ? "Mensuelle" : "Trimestrielle"; }
function perAdjMasc(state) { return state.periodicite === "M" ? "Mensuel" : "Trimestriel"; }
function perShort(state) { return state.periodicite === "M" ? "/ mois" : "/ trim"; }

/* -------- Formatage à la française -------- */
function frNum(v, dec = 2) {
  return num(v).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function moneySmart(v, ht) {
  const n = num(v), dec = Number.isInteger(n) ? 0 : 2;
  return frNum(n, dec) + (ht ? " € HT" : " €");
}
function eur(v, dec = 2) { return frNum(v, dec) + " €"; }
function pages(v) { return num(v).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " Pages"; }
function ccFmt(v) { return num(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 6 }) + " €"; }
function ccPlain(v) { return num(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 6 }); }

/* -------- Email & téléphone du commercial -------- */
function autoEmail(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 1 || !parts[0]) return "";
  const strip = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
  const prenom = strip(parts[0]);
  const nom = parts.slice(1).map(strip).join("");
  if (!prenom) return "";
  return (nom ? prenom[0] + nom : prenom) + "@levad.fr";
}
function repEmail(company) {
  if (company.repEmailManual && company.repEmail) return company.repEmail;
  return autoEmail(company.repName) || company.repEmail || "";
}
/* Ligne téléphone : fixe seul, ou "fixe / portable" si portable saisi. */
function repPhoneLine(company) {
  const fixe = company.repPhone || "";
  const mob = company.repMobile || "";
  return mob ? (fixe ? fixe + " / " + mob : mob) : fixe;
}

/* -------- Dates -------- */
function dateLong(iso) {
  if (!iso) return "";
  const [y, mo, d] = iso.split("-").map(Number);
  const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  return `${d} ${mois[mo - 1]} ${y}`;
}
function dateShort(iso) {
  if (!iso) return "";
  const [y, mo, d] = iso.split("-");
  return `${d}/${mo}/${y}`;
}
