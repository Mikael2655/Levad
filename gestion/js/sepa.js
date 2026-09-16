/* ============================================================
   Prélèvement SEPA — fichier XML ISO 20022 pain.008.001.02
   (SEPA Direct Debit Core, récurrent).
   ============================================================ */

function sepaEligibleInvoices(invoiceIds) {
  return invoiceIds.map((id) => Store.invoices.find((i) => i.id === id)).filter(Boolean).map((inv) => {
    const client = Store.clients.find((c) => c.id === inv.clientId);
    const problems = [];
    if (!client) problems.push("client introuvable");
    else {
      if (!client.iban) problems.push("IBAN manquant");
      if (!client.mandateRef) problems.push("mandat SEPA manquant");
    }
    return { invoice: inv, client, problems };
  });
}

/* Crée la remise (regroupement), fige son numéro et le montant total,
   puis rattache chaque facture à cette remise. Ne génère pas encore le XML. */
async function createSepaBatch(collectionDate, invoiceIds) {
  const eligible = sepaEligibleInvoices(invoiceIds).filter((r) => r.problems.length === 0);
  if (!eligible.length) throw new Error("Aucune facture éligible (IBAN + mandat requis).");

  const numeroRemise = await Store.nextSeq("remiseNumber");
  const batch = defaultSepaBatch();
  batch.numeroRemise = numeroRemise;
  batch.date = collectionDate;
  batch.invoiceIds = eligible.map((r) => r.invoice.id);
  batch.totalAmount = round2(eligible.reduce((s, r) => s + r.invoice.totalTTC, 0));
  await Store.put("sepaBatches", batch);

  for (const r of eligible) {
    r.invoice.sepaBatchId = batch.id;
    r.invoice.status = r.invoice.status === "draft" ? "sent" : r.invoice.status;
    await Store.put("invoices", r.invoice);
  }
  return batch;
}

function buildSepaXml(batch) {
  const company = Store.companySettings();
  if (!company.ics) throw new Error("ICS (identifiant créancier SEPA) non renseigné dans Paramètres.");
  if (!company.iban) throw new Error("IBAN de la société non renseigné dans Paramètres.");

  const rows = sepaEligibleInvoices(batch.invoiceIds).filter((r) => r.problems.length === 0);
  const nbTxs = rows.length;
  const ctrlSum = round2(rows.reduce((s, r) => s + r.invoice.totalTTC, 0)).toFixed(2);
  const msgId = `LEVAD-REM${String(batch.numeroRemise).padStart(5, "0")}`;
  const now = new Date().toISOString();

  const txs = rows.map((r) => {
    const c = r.client;
    const bic = c.bic ? `<BIC>${escXml(c.bic)}</BIC>` : `<Othr><Id>NOTPROVIDED</Id></Othr>`;
    return `
      <DrctDbtTxInf>
        <PmtId><EndToEndId>${escXml(r.invoice.number)}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${r.invoice.totalTTC.toFixed(2)}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${escXml(c.mandateRef)}</MndtId>
            <DtOfSgntr>${escXml(c.mandateDate || batch.date)}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt><FinInstnId>${bic}</FinInstnId></DbtrAgt>
        <Dbtr><Nm>${escXml(c.name)}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${escXml(c.iban.replace(/\s+/g, ""))}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${escXml(r.invoice.number)}</Ustrd></RmtInf>
      </DrctDbtTxInf>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${escXml(msgId)}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <NbOfTxs>${nbTxs}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InitgPty><Nm>${escXml(company.name)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>REMISE-${String(batch.numeroRemise).padStart(5, "0")}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${nbTxs}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>CORE</Cd></LclInstrm>
        <SeqTp>RCUR</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${escXml(batch.date)}</ReqdColltnDt>
      <Cdtr><Nm>${escXml(company.name)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${escXml(company.iban.replace(/\s+/g, ""))}</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId><BIC>${escXml(company.bic)}</BIC></FinInstnId></CdtrAgt>
      <CdtrSchmeId>
        <Id><PrvtId><Othr>
          <Id>${escXml(company.ics)}</Id>
          <SchmeNm><Prtry>SEPA</Prtry></SchmeNm>
        </Othr></PrvtId></Id>
      </CdtrSchmeId>${txs}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;
}

function downloadSepaXml(batch) {
  const xml = buildSepaXml(batch);
  downloadText(xml, `Remise_${String(batch.numeroRemise).padStart(5, "0")}_${batch.date}.xml`, "application/xml;charset=utf-8");
}
