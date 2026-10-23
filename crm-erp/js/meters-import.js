/* ============================================================
   Relevés de compteurs : saisie manuelle + import Excel.
   Règle : un relevé ne peut jamais être inférieur au relevé
   précédent de la même machine (compteur physique, monotone),
   ni supérieur au relevé suivant s'il en existe un (saisie
   rétroactive).
   ============================================================ */

function validateMeterReading(machineId, date, field, value, excludeId) {
  if (value == null || value === "") return { ok: true };
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) return { ok: false, error: "Valeur de compteur invalide." };
  const rows = Store.meterReadings.filter((r) => r.machineId === machineId && r.id !== excludeId && r[field] != null);
  const before = rows.filter((r) => r.date <= date);
  const after = rows.filter((r) => r.date > date);
  const prevMax = before.length ? Math.max(...before.map((r) => r[field])) : null;
  const nextMin = after.length ? Math.min(...after.map((r) => r[field])) : null;
  if (prevMax != null && v < prevMax) {
    return { ok: false, error: `Le compteur ne peut pas être inférieur au relevé précédent (${prevMax}).` };
  }
  if (nextMin != null && v > nextMin) {
    return { ok: false, error: `Le compteur ne peut pas dépasser un relevé déjà saisi après cette date (${nextMin}).` };
  }
  return { ok: true };
}

async function saveMeterReading(machineId, date, bw, color, source, enteredBy, note, id) {
  const bwCheck = validateMeterReading(machineId, date, "bw", bw, id);
  if (!bwCheck.ok) throw new Error(bwCheck.error);
  const colorCheck = validateMeterReading(machineId, date, "color", color, id);
  if (!colorCheck.ok) throw new Error(colorCheck.error);

  const row = id ? Store.meterReadings.find((r) => r.id === id) : defaultMeterReading();
  Object.assign(row, {
    machineId, date,
    bw: bw === "" || bw == null ? null : Number(bw),
    color: color === "" || color == null ? null : Number(color),
    source: source || "manual", enteredBy: enteredBy || "", note: note || "",
  });
  await Store.put("meterReadings", row);
  return row;
}

/* Repère les colonnes utiles quel que soit leur libellé/ordre exact. */
function matchHeader(headers, candidates) {
  for (let i = 0; i < headers.length; i++) {
    const h = normStr(headers[i]);
    if (candidates.some((c) => h.includes(c))) return i;
  }
  return -1;
}

/* Lit un classeur Excel de relevés et renvoie les lignes appariées aux
   machines existantes (par numéro de série, puis référence), avec le
   résultat de validation de chacune. Rien n'est enregistré ici. */
async function parseMetersExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Fichier Excel vide.");

  const headerRow = ws.getRow(1).values.slice(1).map((v) => (v == null ? "" : String(v)));
  const idxSerial = matchHeader(headerRow, ["numero de serie", "n de serie", "serie", "serial"]);
  const idxRef = matchHeader(headerRow, ["reference", "modele"]);
  const idxDate = matchHeader(headerRow, ["date"]);
  const idxBw = matchHeader(headerRow, ["n&b", "noir et blanc", "nb", "bw"]);
  const idxColor = matchHeader(headerRow, ["couleur", "color"]);
  if (idxSerial < 0 && idxRef < 0) throw new Error("Colonne « numéro de série » ou « référence » introuvable dans le fichier.");
  if (idxBw < 0 && idxColor < 0) throw new Error("Aucune colonne de compteur (N&B / couleur) trouvée.");

  const results = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = row.values.slice(1);
    const serial = idxSerial >= 0 ? String(vals[idxSerial] || "").trim() : "";
    const ref = idxRef >= 0 ? String(vals[idxRef] || "").trim() : "";
    if (!serial && !ref) return;
    let dateVal = idxDate >= 0 ? vals[idxDate] : null;
    let dateISO = todayISO();
    if (dateVal instanceof Date) dateISO = toISO(dateVal);
    else if (typeof dateVal === "string" && dateVal.trim()) {
      const m = dateVal.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (m) dateISO = `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      else if (/^\d{4}-\d{2}-\d{2}/.test(dateVal.trim())) dateISO = dateVal.trim().slice(0, 10);
    }
    const bw = idxBw >= 0 && vals[idxBw] !== "" && vals[idxBw] != null ? Number(vals[idxBw]) : null;
    const color = idxColor >= 0 && vals[idxColor] !== "" && vals[idxColor] != null ? Number(vals[idxColor]) : null;

    const machine = Store.machines.find((m) => (serial && normStr(m.serialNumber) === normStr(serial))
      || (!serial && ref && normStr(m.reference) === normStr(ref)));

    let status = "ok", error = "";
    if (!machine) { status = "no-match"; error = "Aucune machine ne correspond (numéro de série/référence)."; }
    else {
      const bwCheck = validateMeterReading(machine.id, dateISO, "bw", bw);
      const colorCheck = validateMeterReading(machine.id, dateISO, "color", color);
      if (!bwCheck.ok) { status = "error"; error = bwCheck.error; }
      else if (!colorCheck.ok) { status = "error"; error = colorCheck.error; }
    }
    results.push({ row: rowNumber, serial, ref, date: dateISO, bw, color, machineId: machine ? machine.id : "", status, error });
  });
  return results;
}

async function commitImportedMeters(rows, enteredBy) {
  let ok = 0, failed = 0;
  for (const r of rows) {
    if (r.status !== "ok") { failed++; continue; }
    try { await saveMeterReading(r.machineId, r.date, r.bw, r.color, "import", enteredBy, "Import Excel"); ok++; }
    catch (e) { failed++; r.status = "error"; r.error = e.message; }
  }
  return { ok, failed };
}
