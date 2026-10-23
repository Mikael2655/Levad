/* Utilitaires partagés : dates, formatage, stockage, téléchargement. */

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function parseISO(s) { return new Date(`${s}T00:00:00`); }
function toISO(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addMonths(iso, n) {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}
function endOfMonth(iso) {
  const d = parseISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
/* Dernier jour ouvré (lun-ven) du mois de la date donnée. */
function lastBusinessDayOfMonth(iso) {
  const d = parseISO(iso);
  let last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  while (last.getDay() === 0 || last.getDay() === 6) last.setDate(last.getDate() - 1);
  return toISO(last);
}
function sameMonth(isoA, isoB) {
  const a = parseISO(isoA), b = parseISO(isoB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
/* Nombre de mois entiers entre deux dates ISO (b - a), peut être négatif. */
function monthsBetween(isoA, isoB) {
  const a = parseISO(isoA), b = parseISO(isoB);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1);
}
function addDays(iso, n) {
  const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d);
}
function daysBetween(isoA, isoB) {
  return Math.round((parseISO(isoB) - parseISO(isoA)) / 86400000) + 1; // inclusif des deux bornes
}
/* Dernier jour (inclus) de la période calendaire (mois ou trimestre) contenant la date donnée. */
function periodEndForDate(iso, freqMonths) {
  const d = parseISO(iso);
  if (freqMonths === 3) {
    const qStartMonth = Math.floor(d.getMonth() / 3) * 3;
    return toISO(new Date(d.getFullYear(), qStartMonth + 3, 0));
  }
  return endOfMonth(iso);
}
/* Premier jour de la période calendaire (mois ou trimestre) se terminant à la date donnée. */
function periodStartForEnd(iso, freqMonths) {
  const d = parseISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() - freqMonths + 1, 1));
}
function fmtDate(iso) {
  if (!iso) return "";
  const d = parseISO(iso);
  return d.toLocaleDateString("fr-FR");
}
function fmtMoney(n) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function downloadText(text, name, mime) {
  downloadBlob(new Blob([text], { type: mime || "text/plain;charset=utf-8" }), name);
}
function slugify(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function escXml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function csvEscape(s) {
  const v = s == null ? "" : String(s);
  return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
function normStr(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

async function sha256(str) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function read(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function upsert(arr, item) {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i >= 0) arr[i] = item; else arr.unshift(item);
}
