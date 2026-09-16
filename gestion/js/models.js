/* ============================================================
   Modèle de données (structures par défaut / "schéma").
   Collections : clients, contracts, machines, meterReadings,
   invoices, sepaBatches, users, counters.
   ============================================================ */

function defaultClient() {
  return {
    id: cryptoId("cli"),
    kind: "prospect",            // "prospect" | "client"
    name: "", siret: "",
    address: { line1: "", line2: "", zip: "", city: "" },
    contacts: [],                // [{id,name,role,phone,email}]
    commercialId: "",            // id du commercial attitré
    chorusPro: false, chorusProCode: "",  // code service Chorus Pro (administrations)
    iban: "", bic: "", mandateRef: "", mandateDate: "",
    notes: "",
    createdAt: todayISO(), createdBy: "", convertedAt: "",
  };
}
function defaultContact() {
  return { id: cryptoId("ct"), name: "", role: "", phone: "", email: "" };
}

/* Un contrat = une activité vendue à un client, avec ses lignes de
   facturation. Le forfait fixe (abonnement + engagement de volume)
   est facturé À ÉCHOIR (à l'avance) ; les lignes "metered" ne portent
   que la règle de dépassement, facturée À ÉCHU une fois les compteurs
   relevés. */
function defaultContract() {
  return {
    id: cryptoId("ctr"),
    clientId: "",
    activity: "photocopieur",
    label: "",
    startDate: todayISO(),
    durationMonths: 36,
    billingFrequency: "quarterly",   // "monthly" | "quarterly"
    status: "active",
    machineIds: [],
    lines: [],                       // voir defaultLine()
    nextBillingDate: todayISO(),     // prochaine échéance (avance à chaque facturation)
    lastBilledCounters: {},          // { [lineId]: dernier relevé facturé }
    lastBilledPeriodEnd: "",         // fin de la dernière période dont le dépassement a été facturé
    terminatedAt: "", terminationInvoiceId: "", terminationReason: "",
    createdAt: todayISO(),
  };
}
function defaultFixedLine(over) {
  return { id: cryptoId("ln"), type: "fixed", label: "", amountHT: 0, vatRate: VAT_RATE_DEFAULT, ...over };
}
function defaultMeteredLine(over) {
  return {
    id: cryptoId("ln"), type: "metered", label: "", counterType: "bw",
    includedQty: 0, overageUnitPrice: 0, vatRate: VAT_RATE_DEFAULT, ...over,
  };
}
/* Gabarit standard photocopieur : forfait fixe + engagement N&B + engagement couleur. */
function photocopieurLineTemplate() {
  return [
    defaultFixedLine({ label: "Abonnement fixe", amountHT: 100 }),
    defaultFixedLine({ label: "Engagement pages N&B (forfait inclus)", amountHT: 6 }),
    defaultMeteredLine({ label: "Dépassement pages N&B", counterType: "bw", includedQty: 1000, overageUnitPrice: 0.006 }),
    defaultMeteredLine({ label: "Dépassement pages couleur", counterType: "color", includedQty: 0, overageUnitPrice: 0.06 }),
  ];
}

function defaultMachine() {
  return {
    id: cryptoId("mac"),
    reference: "", serialNumber: "",
    activity: "photocopieur",
    acquisition: "location_externe", financeOrg: "",
    currentClientId: "", currentContractId: "",
    history: [],   // [{clientId,contractId,from,to,event}]
  };
}
function defaultMeterReading() {
  return {
    id: cryptoId("mr"), machineId: "", date: todayISO(),
    bw: null, color: null, source: "manual", enteredBy: "", note: "",
  };
}

function defaultInvoice() {
  return {
    id: cryptoId("inv"), number: "",
    clientId: "", contractId: "", type: "period",  // "period" | "termination"
    date: todayISO(), dueDate: todayISO(),
    periodStart: "", periodEnd: "",
    lines: [],   // [{label, qty, unitPrice, amountHT, vatRate}]
    totalHT: 0, totalVAT: 0, totalTTC: 0,
    status: "draft",
    paymentMethod: "sepa",
    sepaBatchId: "",
    sentAt: "", sentMethod: "",
    dunningLevel: 0, dunningHistory: [],  // [{level,date,by}]
    createdAt: todayISO(),
  };
}

function defaultSepaBatch() {
  return { id: cryptoId("sep"), numeroRemise: 0, date: todayISO(), invoiceIds: [], totalAmount: 0 };
}

function defaultUser() {
  return {
    id: cryptoId("usr"), username: "", name: "", role: ROLES.COMMERCIAL,
    phone: "", email: "", passHash: "",
  };
}

function invoiceLine(label, qty, unitPrice, vatRate, extra) {
  const amountHT = round2(qty * unitPrice);
  return { label, qty, unitPrice, amountHT, vatRate: vatRate == null ? VAT_RATE_DEFAULT : vatRate, ...(extra || {}) };
}
function sumInvoiceTotals(lines) {
  const totalHT = round2(lines.reduce((s, l) => s + l.amountHT, 0));
  const totalVAT = round2(lines.reduce((s, l) => s + l.amountHT * (l.vatRate / 100), 0));
  return { totalHT, totalVAT, totalTTC: round2(totalHT + totalVAT) };
}
