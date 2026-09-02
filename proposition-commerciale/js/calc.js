/* ============================================================
   Moteur de calcul — reproduit la logique des simulateurs Excel
   (Simul_SASP) pour chaque machine, puis agrège.

   Situation Actuelle (SA) :
     loyer actuel + maintenance N&B/coul (forfait ou réel)
     + services (pass, TAS, e-maintenance, scan, recyclage).
   Solution Proposée (SP) :
     loyer = (rachat + cadeaux + prix + livraison + installation
              + marge) × coefficient ÷ 100
     + coûts copie proposés + services proposés.
   ============================================================ */

function num(v) {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : 0;
}

/* Coefficient de leasing pour la durée choisie. */
function coeffFor(state) {
  return num(state.coeffs[state.durationYears]) || 0;
}

/* Rachat du contrat actuel (B5 du simulateur). */
function rachat(m) {
  const loyer = num(m.loyerActuel), trim = num(m.trimRestants), maint = num(m.maintMoyenne);
  if (m.prospect) return 0;                 // prospect : rien à racheter
  return loyer * trim; // client déjà équipé : solde des loyers restants
}

/* Maintenance d'un poste (forfait si supérieur au réel, sinon réel). */
function maintCost(forfait, depass, volReel, cc) {
  forfait = num(forfait); depass = num(depass); volReel = num(volReel); cc = num(cc);
  return forfait > volReel ? (forfait + depass) * cc : volReel * cc;
}

/* Calcul complet d'une machine -> { sa:{...}, sp:{...} } par trimestre. */
function computeMachine(m, state) {
  const coeff = coeffFor(state);

  // --- Situation actuelle ---
  const saLoyer = num(m.loyerActuel);
  const saMaintNB = maintCost(m.forfaitNB, m.depassNB, m.volNBreel, m.ccNBactuel);
  const saMaintCoul = maintCost(m.forfaitCoul, m.depassCoul, m.volCoulReel, m.ccCoulActuel);
  const saServices = num(m.passActuel) + num(m.tasActuel) + num(m.emaintActuel) +
                     num(m.scanMailActuel) + num(m.recyclageActuel) +
                     num(m.forfaitEurNBactuel) + num(m.forfaitEurCoulActuel);
  const saCE = saMaintNB + saMaintCoul + saServices;       // total consommables/entretien
  const saTotal = saLoyer + saCE;

  // --- Solution proposée ---
  const invest = rachat(m) + num(m.cadeaux) + num(m.prixMachine) +
                 num(m.livraison) + num(m.installation) + num(m.marge);
  const spLoyer = invest * coeff / 100;
  const spMaintNB = num(m.volNBreel) * num(m.ccNBpropose);
  const spMaintCoul = num(m.volCoulReel) * num(m.ccCoulPropose);
  const spServices = num(m.passPropose) + num(m.tasPropose) + num(m.emaintPropose) +
                     num(m.scanMailPropose) + num(m.recyclagePropose) +
                     num(m.forfaitEurNBpropose) + num(m.forfaitEurCoulPropose);
  const spCE = spMaintNB + spMaintCoul + spServices;
  const spTotal = spLoyer + spCE;

  return {
    coeff, invest, rachat: rachat(m),
    sa: {
      model: m.currentModel || "Machine actuelle",
      fin: "Location",
      loyer: saLoyer, volNB: num(m.volNBreel), volCoul: num(m.volCoulReel),
      pass: num(m.passActuel), forfaitNB: num(m.forfaitEurNBactuel),
      forfaitCoul: num(m.forfaitEurCoulActuel),
      ccNB: num(m.ccNBactuel), ccCoul: num(m.ccCoulActuel),
      maintNB: saMaintNB, maintCoul: saMaintCoul, ce: saCE, total: saTotal,
    },
    sp: {
      model: m.proposedModel || "Machine proposée",
      fin: "Location",
      loyer: spLoyer, volNB: num(m.volNBreel), volCoul: num(m.volCoulReel),
      pass: num(m.passPropose), forfaitNB: num(m.forfaitEurNBpropose),
      forfaitCoul: num(m.forfaitEurCoulPropose),
      ccNB: num(m.ccNBpropose), ccCoul: num(m.ccCoulPropose),
      maintNB: spMaintNB, maintCoul: spMaintCoul, ce: spCE, total: spTotal,
    },
  };
}

/* Agrégat sur toutes les machines. */
function computeAll(state) {
  const rows = state.machines.map((m) => computeMachine(m, state));
  const sum = (arr, side, key) => arr.reduce((a, r) => a + r[side][key], 0);
  const saTotal = sum(rows, "sa", "total");
  const spTotal = sum(rows, "sp", "total");
  const savingQuarter = saTotal - spTotal;
  return {
    rows,
    saTotal, spTotal,
    savingQuarter,
    savingYear: savingQuarter * 4,
    spLoyerTotal: sum(rows, "sp", "loyer"),
    durationTrim: state.durationYears * 4,
  };
}

/* -------- Formatage à la française -------- */
function frNum(v, dec = 2) {
  return num(v).toLocaleString("fr-FR", {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });
}
function eur(v, dec = 2) { return frNum(v, dec) + " €"; }
function eurHT(v, dec = 2) { return frNum(v, dec) + " € HT"; }
function pages(v) { return num(v).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " Pages"; }
/* Coût copie : jusqu'à 6 décimales, sans zéros superflus au-delà de 2. */
function ccFmt(v) {
  const n = num(v);
  let s = n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  return s + " €";
}

/* Date longue « 6 août 2026 ». */
function dateLong(iso) {
  if (!iso) return "";
  const [y, mo, d] = iso.split("-").map(Number);
  const mois = ["janvier","février","mars","avril","mai","juin","juillet",
                "août","septembre","octobre","novembre","décembre"];
  return `${d} ${mois[mo - 1]} ${y}`;
}
/* Date courte « 06/08/2026 ». */
function dateShort(iso) {
  if (!iso) return "";
  const [y, mo, d] = iso.split("-");
  return `${d}/${mo}/${y}`;
}
