/* ============================================================
   Moteur de facturation.
   ------------------------------------------------------------
   Les périodes sont calées sur le calendrier (mois civil, ou
   trimestre civil Jan-Mar/Avr-Juin/Juil-Sep/Oct-Déc), pas sur la
   date anniversaire du contrat. `contract.nextBillingDate` est le
   premier jour de la période à échoir ; `contract.lastBilledPeriodEnd`
   est le dernier jour (inclus) déjà facturé — "" tant qu'aucune
   facture n'a encore été émise.

   Premshe facture : si l'installation (`startDate`) ne tombe pas
   pile au début d'une période calendaire, la première facturation
   combine un PRORATA de la période en cours (du jour d'installation
   à la fin de la période) + la période civile complète suivante,
   en une seule facture, À ÉCHOIR.

   Dépassement compteur : `lastBilledCounters` retient, par machine et
   par ligne, le dernier relevé déjà facturé. À chaque facturation, on
   reprend le relevé le plus haut disponible (= le plus récent, la
   saisie étant bloquée en dessous du relevé précédent) et on
   soustrait ce compteur déjà facturé pour obtenir la consommation à
   solder — inutile de rejouer les dates de période, la valeur du
   compteur fait foi.

   Indexation annuelle : à la date anniversaire du contrat (mois/jour
   de `startDate`), les lignes fixes et les prix de dépassement sont
   augmentés du taux effectif (par défaut celui de la société, sauf
   contrat en taux personnalisé ou exclu). Appliquée automatiquement
   juste avant de facturer un contrat.
   ============================================================ */

function periodLabel(contract, periodStartISO) {
  const freq = FREQ_MONTHS[contract.billingFrequency];
  const d = parseISO(periodStartISO);
  if (freq === 3) {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `T${q} ${d.getFullYear()}`;
  }
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function contractsDueForRun(targetDate) {
  return Store.contracts.filter((c) => c.status === "active" && c.nextBillingDate <= targetDate);
}

function machineLineKey(machineId, lineId) { return `${machineId}:${lineId}`; }

/* Relevé "utile" d'une machine pour une ligne compteur, à une date donnée
   (borne haute incluse) : la valeur la plus haute trouvée (= la plus
   récente, par construction monotone). Pas de borne basse nécessaire :
   `lastBilledCounters` sert déjà de référence "déjà facturé". */
function bestReadingInRange(machineId, counterType, fromISOExclusive, toISOInclusive) {
  const rows = Store.meterReadings.filter((r) => r.machineId === machineId
    && r[counterType] != null
    && (!fromISOExclusive || r.date > fromISOExclusive)
    && r.date <= toISOInclusive);
  if (!rows.length) return null;
  return rows.reduce((best, r) => (best == null || r[counterType] > best ? r[counterType] : best), null);
}

/* Lignes de dépassement non encore facturées, à une date donnée, pour
   toutes les lignes "compteur" du contrat (comparaison relevé le plus
   haut disponible vs dernier compteur déjà facturé). */
function computeOverageLines(contract, uptoDate) {
  const lines = [];
  const missing = [];
  contract.lines.filter((l) => l.type === "metered").forEach((l) => {
    let consumption = 0;
    let anyMachine = false;
    (contract.machineIds || []).forEach((mid) => {
      anyMachine = true;
      const key = machineLineKey(mid, l.id);
      const baseline = contract.lastBilledCounters[key] || 0;
      const val = bestReadingInRange(mid, l.counterType, null, uptoDate);
      if (val == null) { missing.push({ machineId: mid, counterType: l.counterType, line: l.label }); return; }
      consumption += Math.max(0, val - baseline);
    });
    if (!anyMachine) return;
    const overageQty = round2(Math.max(0, consumption - (l.includedQty || 0)));
    if (overageQty > 0) {
      lines.push(invoiceLine(`${l.label} — dépassement (${overageQty} unités × ${l.overageUnitPrice} € HT, à échu)`,
        overageQty, l.overageUnitPrice, l.vatRate, { kind: "overage", lineRef: l.id }));
    }
  });
  return { lines, missing };
}

/* Fait avancer les compteurs "déjà facturés" (baseline) au relevé le
   plus haut disponible à `uptoDate`, pour toutes les lignes compteur. */
function advanceOverageBaselines(contract, uptoDate) {
  contract.lines.filter((l) => l.type === "metered").forEach((l) => {
    (contract.machineIds || []).forEach((mid) => {
      const val = bestReadingInRange(mid, l.counterType, null, uptoDate);
      if (val != null) contract.lastBilledCounters[machineLineKey(mid, l.id)] = val;
    });
  });
}

/* --- Indexation annuelle (date anniversaire du contrat) --- */
function effectiveIndexationRate(contract, companySettings) {
  if (contract.indexationMode === "none") return 0;
  if (contract.indexationMode === "custom") return Number(contract.indexationRate) || 0;
  return Number((companySettings || Store.companySettings()).defaultIndexationRate) || 0;
}
/* Nombre d'anniversaires en attente d'application à `uptoDate`, sans rien modifier. */
function pendingIndexationCount(contract, uptoDate) {
  let from = contract.lastIndexationAt || contract.startDate;
  let n = 0;
  while (addMonths(from, 12) <= uptoDate) { from = addMonths(from, 12); n++; if (n > 25) break; }
  return n;
}
/* Applique (et enregistre sur `contract`) les augmentations dues jusqu'à `uptoDate`. */
function applyPendingIndexation(contract, uptoDate) {
  const companySettings = Store.companySettings();
  contract.lastIndexationAt = contract.lastIndexationAt || contract.startDate;
  contract.indexationHistory = contract.indexationHistory || [];
  let applied = 0;
  while (addMonths(contract.lastIndexationAt, 12) <= uptoDate) {
    contract.lastIndexationAt = addMonths(contract.lastIndexationAt, 12);
    const rate = effectiveIndexationRate(contract, companySettings);
    if (rate) {
      contract.lines.forEach((l) => {
        if (l.type === "fixed") l.amountHT = round2(l.amountHT * (1 + rate / 100));
        else if (l.type === "metered") l.overageUnitPrice = Math.round(l.overageUnitPrice * (1 + rate / 100) * 1000) / 1000;
      });
      contract.indexationHistory.push({ date: contract.lastIndexationAt, rate });
    }
    applied++;
    if (applied > 25) break;
  }
  return applied;
}

/* Calcule (sans rien enregistrer) le détail de facturation d'un contrat
   pour un passage de facturation à `targetDate`. Le contrat passé en
   argument doit déjà porter les prix à jour (voir applyPendingIndexation) :
   utilisez un clone pour un simple aperçu, l'objet réel pour générer. */
function previewContractInvoice(contract, targetDate) {
  const freq = FREQ_MONTHS[contract.billingFrequency];
  const isFirst = !contract.lastBilledPeriodEnd;
  const lines = [];
  let periodStart, periodEnd;

  if (isFirst) {
    const stubEnd = periodEndForDate(contract.startDate, freq);
    const stubPeriodStart = periodStartForEnd(stubEnd, freq);
    if (contract.startDate === stubPeriodStart) {
      periodStart = contract.startDate;
      periodEnd = stubEnd;
      contract.lines.filter((l) => l.type === "fixed").forEach((l) => {
        lines.push(invoiceLine(`${l.label} — ${periodLabel(contract, periodStart)} (à échoir)`, 1, l.amountHT, l.vatRate, { kind: "fixed", lineRef: l.id }));
      });
    } else {
      const stubDays = daysBetween(contract.startDate, stubEnd);
      const totalDays = daysBetween(stubPeriodStart, stubEnd);
      contract.lines.filter((l) => l.type === "fixed").forEach((l) => {
        const prorata = round2(l.amountHT * stubDays / totalDays);
        lines.push(invoiceLine(`${l.label} — prorata du ${fmtDate(contract.startDate)} au ${fmtDate(stubEnd)} (${stubDays}/${totalDays}j, à échoir)`, 1, prorata, l.vatRate, { kind: "fixed", lineRef: l.id }));
      });
      const fullStart = addDays(stubEnd, 1);
      const fullEnd = periodEndForDate(fullStart, freq);
      contract.lines.filter((l) => l.type === "fixed").forEach((l) => {
        lines.push(invoiceLine(`${l.label} — ${periodLabel(contract, fullStart)} (à échoir)`, 1, l.amountHT, l.vatRate, { kind: "fixed", lineRef: l.id }));
      });
      periodStart = contract.startDate;
      periodEnd = fullEnd;
    }
  } else {
    periodStart = contract.nextBillingDate;
    periodEnd = periodEndForDate(periodStart, freq);
    contract.lines.filter((l) => l.type === "fixed").forEach((l) => {
      lines.push(invoiceLine(`${l.label} — ${periodLabel(contract, periodStart)} (à échoir)`, 1, l.amountHT, l.vatRate, { kind: "fixed", lineRef: l.id }));
    });
  }

  const { lines: overageLines, missing } = computeOverageLines(contract, targetDate);
  lines.push(...overageLines);

  const totals = sumInvoiceTotals(lines);
  return { periodStart, periodEnd, lines, missingMeters: missing, ...totals };
}

/* Aperçu affichable (écran Facturation) : applique l'indexation sur un
   clone pour ne rien modifier, et signale si une augmentation est due. */
function previewContractInvoiceForDisplay(contract, targetDate) {
  const c = clone(contract);
  const indexationDue = pendingIndexationCount(contract, targetDate);
  if (indexationDue) applyPendingIndexation(c, targetDate);
  return { ...previewContractInvoice(c, targetDate), indexationDue };
}

/* Génère et enregistre la facture, applique l'indexation due, fait
   avancer l'échéance du contrat et les compteurs déjà facturés. */
async function generateContractInvoice(contract, targetDate, actingUserId) {
  applyPendingIndexation(contract, targetDate);
  const preview = previewContractInvoice(contract, targetDate);
  const number = await Store.nextSeq("invoiceNumber");
  const company = Store.companySettings();
  const inv = defaultInvoice();
  Object.assign(inv, {
    number: `${company.invoicePrefix || "F"}${new Date(targetDate).getFullYear()}-${String(number).padStart(5, "0")}`,
    clientId: contract.clientId, contractId: contract.id, type: "period",
    date: targetDate, dueDate: targetDate,
    periodStart: preview.periodStart, periodEnd: preview.periodEnd,
    lines: preview.lines, totalHT: preview.totalHT, totalVAT: preview.totalVAT, totalTTC: preview.totalTTC,
    status: "draft", createdAt: todayISO(),
  });
  await Store.put("invoices", inv);

  advanceOverageBaselines(contract, targetDate);
  contract.lastBilledPeriodEnd = preview.periodEnd;
  contract.nextBillingDate = addDays(preview.periodEnd, 1);
  await Store.put("contracts", contract);
  return inv;
}

/* Somme des lignes "dépassement" facturées pour un contrat entre deux dates. */
function sumOverageInvoiced(contractId, fromISO, toISO) {
  return round2(Store.invoices
    .filter((i) => i.contractId === contractId && i.date > fromISO && i.date <= toISO)
    .flatMap((i) => i.lines)
    .filter((l) => l.kind === "overage")
    .reduce((s, l) => s + l.amountHT, 0));
}

/* Facture de résiliation :
   somme des forfaits trimestriels × trimestres restants
   + (moyenne trimestrielle des dépassements sur 12 mois, ou sur 6 mois si
     supérieure) × trimestres restants. */
function computeTerminationInvoice(contract, terminationDate) {
  const endDate = addMonths(contract.startDate, contract.durationMonths);
  const remainingMonths = Math.max(0, monthsBetween(terminationDate, endDate));
  const remainingQuarters = Math.ceil(remainingMonths / 3);
  const freq = FREQ_MONTHS[contract.billingFrequency];

  const fixedPerPeriod = round2(contract.lines.filter((l) => l.type === "fixed").reduce((s, l) => s + l.amountHT, 0));
  const quarterlyPackage = round2(fixedPerPeriod * (3 / freq));
  const fixedPart = round2(quarterlyPackage * remainingQuarters);

  const overage12 = sumOverageInvoiced(contract.id, addMonths(terminationDate, -12), terminationDate);
  const overage6 = sumOverageInvoiced(contract.id, addMonths(terminationDate, -6), terminationDate);
  const avgQ12 = round2(overage12 / 4);
  const avgQ6 = round2(overage6 / 2);
  const avgOverageQuarterly = Math.max(avgQ12, avgQ6);
  const variablePart = round2(avgOverageQuarterly * remainingQuarters);

  return {
    endDate, remainingMonths, remainingQuarters, quarterlyPackage, fixedPart,
    overage12, overage6, avgQ12, avgQ6, avgOverageQuarterly, variablePart,
    total: round2(fixedPart + variablePart),
  };
}

async function terminateContract(contract, terminationDate, reason, invoiceIt) {
  let invoiceId = "";
  if (invoiceIt) {
    const calc = computeTerminationInvoice(contract, terminationDate);
    const number = await Store.nextSeq("invoiceNumber");
    const company = Store.companySettings();
    const inv = defaultInvoice();
    const lines = [];
    if (calc.fixedPart > 0) lines.push(invoiceLine(`Résiliation — solde des forfaits (${calc.remainingQuarters} trimestre(s) restant(s) × ${calc.quarterlyPackage} € HT)`, calc.remainingQuarters, calc.quarterlyPackage, VAT_RATE_DEFAULT, { kind: "termination" }));
    if (calc.variablePart > 0) lines.push(invoiceLine(`Résiliation — moyenne des dépassements (${calc.avgOverageQuarterly} € HT/trim. × ${calc.remainingQuarters})`, calc.remainingQuarters, calc.avgOverageQuarterly, VAT_RATE_DEFAULT, { kind: "termination" }));
    Object.assign(inv, {
      number: `${company.invoicePrefix || "F"}${new Date(terminationDate).getFullYear()}-${String(number).padStart(5, "0")}`,
      clientId: contract.clientId, contractId: contract.id, type: "termination",
      date: terminationDate, dueDate: terminationDate,
      periodStart: contract.lastBilledPeriodEnd || contract.startDate, periodEnd: terminationDate,
      lines, ...sumInvoiceTotals(lines), status: "draft", createdAt: todayISO(),
    });
    await Store.put("invoices", inv);
    invoiceId = inv.id;
  }
  contract.status = "terminated";
  contract.terminatedAt = terminationDate;
  contract.terminationReason = reason || "";
  contract.terminationInvoiceId = invoiceId;
  await Store.put("contracts", contract);
  return invoiceId;
}

/* ------------------------------------------------------------
   Renouvellement / remplacement de contrat : on arrête le contrat
   existant à la date de bascule, on établit un avoir au prorata des
   jours non consommés de la dernière facture déjà émise (partie
   fixe), et on facture en plus les éventuelles pages/unités
   consommées et pas encore soldées (relevés à jour). Contrairement à
   la résiliation, pas de pénalité : c'est un règlement de compte au
   réel, le client reste chez Levad avec un nouveau contrat.
   ------------------------------------------------------------ */
function computeRenewalSettlement(contract, cutoverDate) {
  const creditLines = [];
  let referenceInvoice = null;
  let unusedDays = 0, totalDays = 0;

  if (contract.lastBilledPeriodEnd && contract.lastBilledPeriodEnd > cutoverDate) {
    referenceInvoice = Store.invoices.find((i) => i.contractId === contract.id && i.type === "period" && i.periodEnd === contract.lastBilledPeriodEnd);
    if (referenceInvoice) {
      totalDays = daysBetween(referenceInvoice.periodStart, referenceInvoice.periodEnd);
      unusedDays = daysBetween(addDays(cutoverDate, 1), referenceInvoice.periodEnd);
      referenceInvoice.lines.filter((l) => l.kind === "fixed").forEach((l) => {
        const credit = round2(-l.amountHT * unusedDays / totalDays);
        creditLines.push(invoiceLine(`Avoir — ${l.label} (prorata ${unusedDays}/${totalDays}j non consommés, facture ${referenceInvoice.number})`, 1, credit, l.vatRate, { kind: "renewal-credit" }));
      });
    }
  }

  const { lines: overageLines, missing } = computeOverageLines(contract, cutoverDate);

  const allLines = [...creditLines, ...overageLines];
  const totals = sumInvoiceTotals(allLines);
  return { referenceInvoice, unusedDays, totalDays, creditLines, overageLines, missingMeters: missing, lines: allLines, ...totals };
}

/* Termine le contrat existant à `cutoverDate`, émet l'avoir/complément
   s'il y a lieu, libère ses machines (transfert) et renvoie
   { avoirInvoiceId, oldContract } pour enchaîner sur le nouveau contrat. */
async function renewContract(contract, cutoverDate) {
  const settlement = computeRenewalSettlement(contract, cutoverDate);
  let avoirInvoiceId = "";
  if (settlement.lines.length) {
    const number = await Store.nextSeq("invoiceNumber");
    const company = Store.companySettings();
    const inv = defaultInvoice();
    Object.assign(inv, {
      number: `${company.invoicePrefix || "F"}${new Date(cutoverDate).getFullYear()}-${String(number).padStart(5, "0")}`,
      clientId: contract.clientId, contractId: contract.id, type: "avoir",
      date: cutoverDate, dueDate: cutoverDate,
      periodStart: contract.lastBilledPeriodEnd || contract.startDate, periodEnd: cutoverDate,
      lines: settlement.lines, totalHT: settlement.totalHT, totalVAT: settlement.totalVAT, totalTTC: settlement.totalTTC,
      status: "draft", createdAt: todayISO(),
    });
    await Store.put("invoices", inv);
    avoirInvoiceId = inv.id;
  }

  for (const mid of contract.machineIds || []) {
    const m = Store.machines.find((x) => x.id === mid);
    if (m) await detachMachine(m, cutoverDate, "transfert");
  }
  contract.machineIds = [];
  contract.status = "replaced";
  contract.terminatedAt = cutoverDate;
  contract.terminationReason = "Remplacé par un nouveau contrat";
  contract.terminationInvoiceId = avoirInvoiceId;
  await Store.put("contracts", contract);
  return { avoirInvoiceId, missingMeters: settlement.missingMeters };
}

/* ------------------------------------------------------------
   Machines : cycle de vie (installation, transfert, retrait).
   ------------------------------------------------------------ */

async function attachMachineToContract(machine, contract, atDate) {
  if (machine.currentContractId && machine.currentContractId !== contract.id) {
    throw new Error("Cette machine est déjà affectée à un autre contrat actif. Retirez-la d'abord.");
  }
  const baseline = { bw: null, color: null };
  const rows = Store.meterReadings.filter((r) => r.machineId === machine.id).sort((a, b) => a.date < b.date ? 1 : -1);
  if (rows.length) { baseline.bw = rows[0].bw; baseline.color = rows[0].color; }

  machine.currentClientId = contract.clientId;
  machine.currentContractId = contract.id;
  machine.history = machine.history || [];
  machine.history.push({ clientId: contract.clientId, contractId: contract.id, from: atDate || todayISO(), to: "", event: "installation" });
  await Store.put("machines", machine);

  contract.machineIds = contract.machineIds || [];
  if (!contract.machineIds.includes(machine.id)) contract.machineIds.push(machine.id);
  contract.lastBilledCounters = contract.lastBilledCounters || {};
  contract.lines.filter((l) => l.type === "metered").forEach((l) => {
    const v = baseline[l.counterType];
    if (v != null) contract.lastBilledCounters[machineLineKey(machine.id, l.id)] = v;
  });
  await Store.put("contracts", contract);
}

async function detachMachine(machine, atDate, exitType) {
  const hist = (machine.history || []).find((h) => !h.to && h.contractId === machine.currentContractId);
  if (hist) hist.to = atDate || todayISO();
  machine.history = machine.history || [];
  machine.history.push({ clientId: machine.currentClientId, contractId: machine.currentContractId, from: atDate || todayISO(), to: atDate || todayISO(), event: exitType || "retrait" });
  if (exitType === "laisse_client") {
    // reste chez le client (achetée) : on garde la trace mais on libère le suivi contrat
  }
  machine.currentClientId = "";
  machine.currentContractId = "";
  await Store.put("machines", machine);
}
