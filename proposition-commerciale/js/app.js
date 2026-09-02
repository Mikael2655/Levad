/* ============================================================
   Application — saisie de la proposition, calcul en direct,
   export Excel (SA/SP) et PowerPoint (gabarit complet).
   Tout reste dans le navigateur ; aucune donnée n'est envoyée.
   ============================================================ */

let STATE = loadState();
let ADMIN = false; // déverrouillage admin (non persisté)

/* -------------------- Description des champs -------------------- */
const NUM = "num";
const TXT = "txt";
const CHK = "chk";

const SA_FIELDS = [
  { k: "currentModel", label: "Modèle actuel", t: TXT },
  { k: "prospect", label: "Prospect (aucun contrat à racheter)", t: CHK },
  { k: "loyerActuel", label: "Loyer actuel / trim (€)", t: NUM },
  { k: "trimRestants", label: "Trimestres restants", t: NUM },
  { k: "maintMoyenne", label: "Maintenance moyenne / trim (€)", t: NUM },
  { k: "volNBreel", label: "Volume N&B réel (pages/trim)", t: NUM },
  { k: "ccNBactuel", label: "Coût copie N&B actuel (€)", t: NUM },
  { k: "volCoulReel", label: "Volume couleur réel (pages/trim)", t: NUM },
  { k: "ccCoulActuel", label: "Coût copie couleur actuel (€)", t: NUM },
  { k: "passActuel", label: "Pass (€/trim)", t: NUM },
  { k: "emaintActuel", label: "E-maintenance (€/trim)", t: NUM },
];
const SA_ADV = [
  { k: "forfaitNB", label: "Forfait N&B (pages)", t: NUM },
  { k: "depassNB", label: "Dépassement N&B (pages)", t: NUM },
  { k: "forfaitCoul", label: "Forfait couleur (pages)", t: NUM },
  { k: "depassCoul", label: "Dépassement couleur (pages)", t: NUM },
  { k: "tasActuel", label: "TAS (€/trim)", t: NUM },
  { k: "scanMailActuel", label: "Scan to mail (€/trim)", t: NUM },
  { k: "recyclageActuel", label: "Recyclage (€/trim)", t: NUM },
  { k: "forfaitEurNBactuel", label: "Forfait N&B fixe (€/trim)", t: NUM },
  { k: "forfaitEurCoulActuel", label: "Forfait couleur fixe (€/trim)", t: NUM },
];
const SP_FIELDS = [
  { k: "proposedModel", label: "Modèle proposé", t: TXT },
  { k: "prixMachine", label: "Prix machine (€)", t: NUM },
  { k: "cadeaux", label: "Cadeaux / remises (€, ex. -2850)", t: NUM },
  { k: "livraison", label: "Livraison / retrait (€)", t: NUM },
  { k: "installation", label: "Installation (€)", t: NUM },
  { k: "marge", label: "Marge commerciale (€)", t: NUM },
  { k: "ccNBpropose", label: "Coût copie N&B proposé (€)", t: NUM },
  { k: "ccCoulPropose", label: "Coût copie couleur proposé (€)", t: NUM },
  { k: "passPropose", label: "Pass proposé (€/trim)", t: NUM },
  { k: "emaintPropose", label: "E-maintenance proposée (€/trim)", t: NUM },
];
const SP_ADV = [
  { k: "tasPropose", label: "TAS (€/trim)", t: NUM },
  { k: "scanMailPropose", label: "Scan to mail (€/trim)", t: NUM },
  { k: "recyclagePropose", label: "Recyclage (€/trim)", t: NUM },
  { k: "forfaitEurNBpropose", label: "Forfait N&B fixe (€/trim)", t: NUM },
  { k: "forfaitEurCoulPropose", label: "Forfait couleur fixe (€/trim)", t: NUM },
];

/* -------------------- Helpers rendu -------------------- */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function fieldHtml(scope, id, f) {
  const path = `${scope}.${f.k}`;
  const val = id ? STATE.machines.find((m) => m.id === id)[f.k] : getPath(STATE, path);
  if (f.t === CHK) {
    return `<label class="fld chk"><input type="checkbox" data-mid="${id || ""}" data-key="${f.k}" data-scope="${scope}" ${val ? "checked" : ""}><span>${f.label}</span></label>`;
  }
  const type = f.t === NUM ? 'type="number" step="any" inputmode="decimal"' : 'type="text"';
  return `<label class="fld"><span>${f.label}</span>
    <input ${type} data-mid="${id || ""}" data-key="${f.k}" data-scope="${scope}" value="${esc(val)}"></label>`;
}
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}
function setPath(obj, path, v) {
  const parts = path.split("."); const last = parts.pop();
  const t = parts.reduce((o, k) => o[k], obj); t[last] = v;
}

/* -------------------- Rendu principal -------------------- */
function renderApp() {
  const s = STATE;
  document.getElementById("screen").innerHTML = `
    <section class="card">
      <h2>Client</h2>
      <div class="grid">
        ${fieldHtml("client", "", { k: "name", label: "Nom du client / société", t: TXT })}
        ${fieldHtml("client", "", { k: "contact", label: "Contact (ex. Monsieur Dupont)", t: TXT })}
        ${fieldHtml("client", "", { k: "addr1", label: "Adresse", t: TXT })}
        ${fieldHtml("client", "", { k: "addr2", label: "Code postal & ville", t: TXT })}
        ${fieldHtml("client", "", { k: "date", label: "Date", t: TXT }).replace('type="text"', 'type="date"')}
      </div>
    </section>

    <section class="card">
      <h2>Commercial</h2>
      <div class="grid">
        ${fieldHtml("company", "", { k: "repName", label: "Nom", t: TXT })}
        ${fieldHtml("company", "", { k: "repTitle", label: "Fonction", t: TXT })}
        ${fieldHtml("company", "", { k: "repEmail", label: "Email", t: TXT })}
        ${fieldHtml("company", "", { k: "repPhone", label: "Téléphone", t: TXT })}
      </div>
    </section>

    <section class="card">
      <h2>Paramètres du leasing</h2>
      <div class="grid">
        <label class="fld"><span>Durée</span>
          <select data-scope="root" data-key="durationYears">
            ${[3, 4, 5].map((y) => `<option value="${y}" ${s.durationYears == y ? "selected" : ""}>${y} ans</option>`).join("")}
          </select></label>
        <div class="fld"><span>Coefficient appliqué</span>
          <div class="coeff-show" id="coeff-show">${frNum(coeffFor(s), 2)}</div></div>
      </div>
      <div id="admin-panel"></div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>Machines</h2>
        <button class="btn" data-action="add-machine">＋ Ajouter une machine</button>
      </div>
      <div id="machines"></div>
    </section>

    <section class="card results" id="results"></section>

    <section class="card actions">
      <button class="btn primary" data-action="export-xlsx">⬇︎ Excel SA/SP</button>
      <button class="btn primary" data-action="export-pptx">⬇︎ PowerPoint</button>
      <button class="btn ghost" data-action="reset">Réinitialiser</button>
      <span id="status" class="status"></span>
    </section>`;

  renderMachines();
  renderAdmin();
  renderResults();
}

function renderMachines() {
  const box = document.getElementById("machines");
  box.innerHTML = STATE.machines.map((m, i) => machineCard(m, i)).join("");
}

function machineCard(m, i) {
  return `<div class="machine" data-mid="${m.id}">
    <div class="machine-head">
      <strong>Machine ${i + 1}${m.currentModel || m.proposedModel ? " — " + esc(m.proposedModel || m.currentModel) : ""}</strong>
      <div class="machine-actions">
        <button class="btn small" data-action="dup-machine" data-mid="${m.id}">Dupliquer</button>
        <button class="btn small danger" data-action="del-machine" data-mid="${m.id}" ${STATE.machines.length <= 1 ? "disabled" : ""}>Supprimer</button>
      </div>
    </div>
    <div class="machine-cols">
      <div class="col">
        <h3>Situation actuelle</h3>
        <div class="grid">${SA_FIELDS.map((f) => fieldHtml("machine", m.id, f)).join("")}</div>
        <details><summary>Options avancées</summary>
          <div class="grid">${SA_ADV.map((f) => fieldHtml("machine", m.id, f)).join("")}</div>
        </details>
      </div>
      <div class="col">
        <h3>Solution proposée</h3>
        <div class="grid">${SP_FIELDS.map((f) => fieldHtml("machine", m.id, f)).join("")}</div>
        <details><summary>Options avancées</summary>
          <div class="grid">${SP_ADV.map((f) => fieldHtml("machine", m.id, f)).join("")}</div>
        </details>
      </div>
    </div>
    <div class="machine-sum" id="msum-${m.id}"></div>
  </div>`;
}

function renderAdmin() {
  const panel = document.getElementById("admin-panel");
  if (!panel) return;
  if (!ADMIN) {
    panel.innerHTML = `<button class="btn ghost small" data-action="admin-unlock">🔒 Accès admin (coefficients)</button>`;
    return;
  }
  panel.innerHTML = `
    <div class="admin">
      <div class="admin-head">🔓 Mode admin — coefficients de leasing
        <button class="btn ghost small" data-action="admin-lock">Verrouiller</button></div>
      <div class="grid">
        ${[3, 4, 5].map((y) => `<label class="fld"><span>${y} ans</span>
          <input type="number" step="any" inputmode="decimal" data-scope="coeff" data-key="${y}" value="${esc(STATE.coeffs[y])}"></label>`).join("")}
      </div>
      <div class="admin-actions">
        <button class="btn ghost small" data-action="admin-reset-coeffs">Valeurs commerciales par défaut</button>
        <button class="btn ghost small" data-action="admin-passwd">Changer le mot de passe</button>
      </div>
    </div>`;
}

function renderResults() {
  const c = computeAll(STATE);
  // récap par machine
  STATE.machines.forEach((m) => {
    const el = document.getElementById("msum-" + m.id);
    if (!el) return;
    const r = computeMachine(m, STATE);
    const diff = r.sa.total - r.sp.total;
    el.innerHTML = `
      <span>SA : <b>${eur(r.sa.total)}</b>/trim</span>
      <span>SP : <b>${eur(r.sp.total)}</b>/trim</span>
      <span class="${diff >= 0 ? "pos" : "neg"}">${diff >= 0 ? "Économie" : "Surcoût"} : <b>${eur(Math.abs(diff))}</b>/trim</span>
      <span class="muted">Loyer proposé : ${eur(r.sp.loyer)} · Invest. ${eur(r.invest)}</span>`;
  });
  const res = document.getElementById("results");
  if (!res) return;
  const eco = c.savingYear;
  res.innerHTML = `
    <h2>Synthèse</h2>
    <div class="totals">
      <div class="tot"><span>Situation actuelle</span><b>${eur(c.saTotal)}</b><small>/ trimestre</small></div>
      <div class="tot"><span>Solution proposée</span><b>${eur(c.spTotal)}</b><small>/ trimestre</small></div>
      <div class="tot big ${eco >= 0 ? "pos" : "neg"}">
        <span>${eco >= 0 ? "Économie" : "Surcoût"} annuel</span>
        <b>${eur(Math.abs(eco))}</b><small>${frNum(Math.abs(c.savingQuarter))} € / trimestre</small></div>
    </div>
    <p class="muted small">Loyer proposé total : ${eur(c.spLoyerTotal)}/trim · Valeur mensuelle ${eur(c.spLoyerTotal / 3)} · Durée ${c.durationTrim} trimestres · Coefficient ${frNum(coeffFor(STATE), 2)}</p>`;
  const cs = document.getElementById("coeff-show");
  if (cs) cs.textContent = frNum(coeffFor(STATE), 2);
}

/* -------------------- Événements -------------------- */
function commit() { saveState(STATE); renderResults(); }

document.addEventListener("input", (e) => {
  const t = e.target;
  if (!t.dataset || !t.dataset.scope) return;
  const scope = t.dataset.scope, key = t.dataset.key;
  let v;
  if (t.type === "checkbox") v = t.checked;
  else if (t.type === "number") v = t.value === "" ? 0 : num(t.value);
  else v = t.value;

  if (scope === "machine") {
    const m = STATE.machines.find((x) => x.id === t.dataset.mid);
    if (m) m[key] = v;
  } else if (scope === "coeff") {
    STATE.coeffs[key] = num(t.value);
  } else if (scope === "root") {
    STATE[key] = key === "durationYears" ? parseInt(t.value, 10) : v;
  } else {
    setPath(STATE, `${scope}.${key}`, v);
  }
  commit();
});
// select (durée) déclenche 'change'
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.tagName === "SELECT" && t.dataset.key === "durationYears") {
    STATE.durationYears = parseInt(t.value, 10);
    commit();
  }
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const a = btn.dataset.action, mid = btn.dataset.mid;
  switch (a) {
    case "add-machine":
      STATE.machines.push(defaultMachine()); saveState(STATE); renderMachines(); renderResults(); break;
    case "dup-machine": {
      const src = STATE.machines.find((x) => x.id === mid);
      const copy = { ...src, id: cryptoId() };
      const idx = STATE.machines.indexOf(src);
      STATE.machines.splice(idx + 1, 0, copy);
      saveState(STATE); renderMachines(); renderResults(); break;
    }
    case "del-machine":
      if (STATE.machines.length <= 1) break;
      STATE.machines = STATE.machines.filter((x) => x.id !== mid);
      saveState(STATE); renderMachines(); renderResults(); break;
    case "reset":
      if (confirm("Réinitialiser toute la saisie ?")) { STATE = defaultState(); saveState(STATE); renderApp(); }
      break;
    case "export-xlsx":
      try { exportExcel(STATE, computeAll(STATE)); flash("Excel généré."); }
      catch (err) { flash("Erreur Excel : " + err.message, true); }
      break;
    case "export-pptx":
      flash("Génération du PowerPoint…");
      try { await exportPptx(STATE, computeAll(STATE)); flash("PowerPoint généré."); }
      catch (err) { flash("Erreur PowerPoint : " + err.message, true); }
      break;
    case "admin-unlock": {
      const pw = prompt("Mot de passe admin :");
      if (pw == null) break;
      if (await checkPassword(pw)) { ADMIN = true; renderAdmin(); }
      else flash("Mot de passe incorrect.", true);
      break;
    }
    case "admin-lock": ADMIN = false; renderAdmin(); break;
    case "admin-reset-coeffs":
      STATE.coeffs = { ...DEFAULT_COEFFS }; saveState(STATE); renderAdmin(); renderResults(); break;
    case "admin-passwd": {
      const np = prompt("Nouveau mot de passe admin :");
      if (np) { await setPassword(np); flash("Mot de passe modifié."); }
      break;
    }
  }
});

function flash(msg, err) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = msg;
  el.className = "status" + (err ? " err" : " ok");
  clearTimeout(flash._t);
  flash._t = setTimeout(() => { el.textContent = ""; el.className = "status"; }, 4000);
}

/* -------------------- Admin : mot de passe (SHA-256) -------------------- */
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function checkPassword(pw) {
  const stored = localStorage.getItem(ADMIN_KEY);
  if (!stored) return pw === DEFAULT_ADMIN_PASSWORD;
  return (await sha256(pw)) === stored;
}
async function setPassword(pw) {
  localStorage.setItem(ADMIN_KEY, await sha256(pw));
}

/* -------------------- Thème -------------------- */
(function theme() {
  const saved = localStorage.getItem("levad_theme");
  if (saved) document.documentElement.dataset.theme = saved;
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#theme-toggle")) return;
    const cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = cur;
    localStorage.setItem("levad_theme", cur);
  });
})();

renderApp();
