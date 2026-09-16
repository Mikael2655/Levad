/* ============================================================
   Moteur de facturation.
   ------------------------------------------------------------
   Principe : chaque contrat porte une échéance `nextBillingDate`.
   À chaque passage de facturation on facture, À ÉCHOIR, la période
   qui commence à `nextBillingDate` (forfaits fixes + engagement de
   volume), et on solde, À ÉCHU, le dépassement de la période qui
   vient de s'achever (`lastBilledPeriodEnd` → `nextBillingDate`),
   à partir des relevés de compteurs saisis entre-temps.
   Après facturation, `nextBillingDate` avance d'1 ou 3 mois et
   `lastBilledPeriodEnd` prend la valeur de l'ancienne échéance.

   Règle de relevé : entre deux facturations, on retient la valeur
   la plus élevée (= la plus récente, la saisie étant bloquée en
   dessous du relevé précédent) et on soustrait le dernier compteur
   déjà facturé pour obtenir la consommation de la période.
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

/* Relevé "utile" d'une machine pour une ligne compteur, entre deux dates
   (borne basse exclue, borne haute incluse) : la valeur la plus haute
   trouvée (= la plus récente, par construction monotone). */
function bestReadingInRange(machineId, counterType, fromISOExclusive, toISOInclusive) {
  const rows = Store.meterReadings.filter((r) => r.machineId === machineId
    && r[counterType] != null
    && (!fromISOExclusive || r.date > fromISOExclusive)
    && r.date <= toISOInclusive);
  if (!rows.length) return null;
  return rows.reduce((best, r) => (best == null || r[counterType] > best ? r[counterType] : best), null);
}

/* Calcule (sans rien enregistrer) le détail de facturation d'un contrat
   pour un passage de facturation à `targetDate`. */
function previewContractInvoice(contract, targetDate) {
  const freq = FREQ_MONTHS[contract.billingFrequency];
  const periodStart = contract.nextBillingDate;
  const periodEnd = addMonths(periodStart, freq);
  const prevPeriodEnd = contract.lastBilledPeriodEnd || contract.startDate;

  const lines = [];
  const missingMeters = [];

  contract.lines.filter((l) => l.type === "fixed").forEach((l) => {
    lines.push(invoiceLine(`${l.label} — ${periodLabel(contract, periodStart)} (à échoir)`, 1, l.amountHT, l.vatRate, { kind: "fixed", lineRef: l.id }));
  });

  contract.lines.filter((l) => l.type === "metered").forEach((l) => {
    const machines = contract.machineIds.length ? contract.machineIds : [];
    let consumption = 0;
    machines.forEach((mid) => {
      const key = machineLineKey(mid, l.id);
      const baseline = contract.lastBilledCounters[key] || 0;
      const val = bestReadingInRange(mid, l.counterType, prevPeriodEnd, targetDate);
      if (val == null) { missingMeters.push({ machineId: mid, counterType: l.counterType, line: l.label }); return; }
      consumption += Math.max(0, val - baseline);
    });
    const overageQty = round2(Math.max(0, consumption - (l.includedQty || 0)));
    if (overageQty > 0) {
      lines.push(invoiceLine(`${l.label} — ${periodLabel(contract, prevPeriodEnd)} (${overageQty} unités × ${l.overageUnitPrice} € HT, à échu)`,
        overageQty, l.overageUnitPrice, l.vatRate, { kind: "overage", lineRef: l.id }));
    }
  });

  const totals = sumInvoiceTotals(lines);
  return { periodStart, periodEnd, prevPeriodEnd, lines, missingMeters, ...totals };
}

/* Génère et enregistre la facture, fait avancer l'échéance du contrat
   et les compteurs déjà facturés. */
async function generateContractInvoice(contract, targetDate, actingUserId) {
  const preview = previewContractInvoice(contract, targetDate);
  const number = await Store.nextSeq("invoiceNumber");
  const inv = defaultInvoice();
  Object.assign(inv, {
    number: `F${new Date(targetDate).getFullYear()}-${String(number).padStart(5, "0")}`,
    clientId: contract.clientId, contractId: contract.id, type: "period",
    date: targetDate, dueDate: targetDate,
    periodStart: preview.periodStart, periodEnd: preview.periodEnd,
    lines: preview.lines, totalHT: preview.totalHT, totalVAT: preview.totalVAT, totalTTC: preview.totalTTC,
    status: "draft", createdAt: todayISO(),
  });
  await Store.put("invoices", inv);

  const freq = FREQ_MONTHS[contract.billingFrequency];
  contract.lines.filter((l) => l.type === "metered").forEach((l) => {
    (contract.machineIds || []).forEach((mid) => {
      const val = bestReadingInRange(mid, l.counterType, preview.prevPeriodEnd, targetDate);
      if (val != null) contract.lastBilledCounters[machineLineKey(mid, l.id)] = val;
    });
  });
  contract.lastBilledPeriodEnd = preview.periodStart;
  contract.nextBillingDate = addMonths(preview.periodStart, freq);
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
    const inv = defaultInvoice();
    const lines = [];
    if (calc.fixedPart > 0) lines.push(invoiceLine(`Résiliation — solde des forfaits (${calc.remainingQuarters} trimestre(s) restant(s) × ${calc.quarterlyPackage} € HT)`, calc.remainingQuarters, calc.quarterlyPackage, VAT_RATE_DEFAULT, { kind: "termination" }));
    if (calc.variablePart > 0) lines.push(invoiceLine(`Résiliation — moyenne des dépassements (${calc.avgOverageQuarterly} € HT/trim. × ${calc.remainingQuarters})`, calc.remainingQuarters, calc.avgOverageQuarterly, VAT_RATE_DEFAULT, { kind: "termination" }));
    Object.assign(inv, {
      number: `F${new Date(terminationDate).getFullYear()}-${String(number).padStart(5, "0")}`,
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
