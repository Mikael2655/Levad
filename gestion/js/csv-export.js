/* ============================================================
   Exports pour la comptabilité externe (CSV, séparateur ;).
   ============================================================ */

function toCsv(headers, rows) {
  const lines = [headers.join(";")];
  rows.forEach((r) => lines.push(r.map(csvEscape).join(";")));
  return "﻿" + lines.join("\r\n");   // BOM pour Excel
}

function exportClientsCsv() {
  const headers = ["Type", "Nom", "SIRET", "Adresse", "CP", "Ville", "Commercial", "Chorus Pro", "IBAN", "Email(s)", "Téléphone(s)", "Créé le"];
  const rows = Store.clients.map((c) => {
    const com = getUserById(c.commercialId);
    return [
      c.kind === "client" ? "Client" : "Prospect", c.name, c.siret,
      [c.address.line1, c.address.line2].filter(Boolean).join(" "), c.address.zip, c.address.city,
      com ? com.name : "", c.chorusPro ? "Oui" : "Non", c.iban,
      c.contacts.map((x) => x.email).filter(Boolean).join(", "),
      c.contacts.map((x) => x.phone).filter(Boolean).join(", "),
      fmtDate(c.createdAt),
    ];
  });
  downloadText(toCsv(headers, rows), `Clients_${todayISO()}.csv`, "text/csv;charset=utf-8");
}

function exportInvoicesCsv(fromISO, toISOdate) {
  let list = Store.invoices;
  if (fromISO) list = list.filter((i) => i.date >= fromISO);
  if (toISOdate) list = list.filter((i) => i.date <= toISOdate);
  const headers = ["Numéro", "Date", "Client", "Contrat/Activité", "Type", "Total HT", "TVA", "Total TTC", "Statut", "Remise SEPA n°"];
  const rows = list.map((i) => {
    const client = Store.clients.find((c) => c.id === i.clientId);
    const contract = Store.contracts.find((c) => c.id === i.contractId);
    const batch = Store.sepaBatches.find((b) => b.id === i.sepaBatchId);
    return [
      i.number, fmtDate(i.date), client ? client.name : "", contract ? (ACTIVITIES[contract.activity] || contract.activity) : "",
      i.type === "termination" ? "Résiliation" : "Période", i.totalHT.toFixed(2), i.totalVAT.toFixed(2), i.totalTTC.toFixed(2),
      INVOICE_STATUS[i.status] || i.status, batch ? batch.numeroRemise : "",
    ];
  });
  downloadText(toCsv(headers, rows), `Factures_${fromISO || "debut"}_${toISOdate || "fin"}.csv`, "text/csv;charset=utf-8");
}

function exportSepaBatchesCsv() {
  const headers = ["N° remise", "Date de prélèvement", "Nb factures", "Montant total", "N° factures incluses"];
  const rows = Store.sepaBatches.map((b) => [
    b.numeroRemise, fmtDate(b.date), b.invoiceIds.length, b.totalAmount.toFixed(2),
    b.invoiceIds.map((id) => { const i = Store.invoices.find((x) => x.id === id); return i ? i.number : id; }).join(", "),
  ]);
  downloadText(toCsv(headers, rows), `Remises_SEPA_${todayISO()}.csv`, "text/csv;charset=utf-8");
}

/* --- Relances (impayés) --- */
function unpaidInvoices(clientId) {
  return Store.invoices.filter((i) => i.clientId === clientId && i.status === "unpaid");
}
async function recordDunning(invoice, level, byUserId) {
  invoice.dunningLevel = level;
  invoice.dunningHistory = invoice.dunningHistory || [];
  invoice.dunningHistory.push({ level, date: todayISO(), by: byUserId });
  await Store.put("invoices", invoice);
}
