/* ============================================================
   Application — saisie, calcul en direct, exports Excel & PPTX.
   Tout reste dans le navigateur.
   ============================================================ */

let STATE = loadState();
let ADMIN = false;

const NUM = "num", TXT = "txt";

/* Champs SA (situation actuelle) hors services — ordre demandé. */
const SA_MAIN = [
  { k: "currentModel", label: "Machine actuelle", t: TXT, wide: true },
  { k: "loyerActuel", label: "Loyer actuel / trim (€)", t: NUM },
  { k: "trimRestants", label: "Trimestres restants", t: NUM },
];
const SA_NB = [
  { k: "forfaitNB", label: "Forfait pages N&B engagé", t: NUM },
  { k: "depassNB", label: "Dépassement N&B (pages)", t: NUM },
  { k: "volNBreel", label: "Volume réel N&B (pages)", t: NUM },
  { k: "ccNBactuel", label: "Coût page N&B (€)", t: NUM },
];
const SA_COUL = [
  { k: "forfaitCoul", label: "Forfait pages couleur engagé", t: NUM },
  { k: "depassCoul", label: "Dépassement couleur (pages)", t: NUM },
  { k: "volCoulReel", label: "Volume réel couleur (pages)", t: NUM },
  { k: "ccCoulActuel", label: "Coût page couleur (€)", t: NUM },
];
/* Champs SP (solution proposée) — ordre de la maquette. */
const SP_MAIN = [
  { k: "proposedModel", label: "Machine proposée", t: TXT, wide: true },
  { k: "prixMachine", label: "Prix machine (€)", t: NUM },
  { k: "installation", label: "Installation (€)", t: NUM },
  { k: "livraison", label: "Livraison (dont portage) (€)", t: NUM },
  { k: "retrait", label: "Retrait (dont portage) (€)", t: NUM },
];
const SP_CC = [
  { k: "ccNBpropose", label: "Coût page N&B proposé (€)", t: NUM },
  { k: "ccCoulPropose", label: "Coût page couleur proposé (€)", t: NUM },
];

/* -------------------- Helpers -------------------- */
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function mById(id) { return STATE.machines.find((m) => m.id === id); }
function getPath(o, p) { return p.split(".").reduce((a, k) => (a ? a[k] : undefined), o); }
function setPath(o, p, v) { const a = p.split("."); const l = a.pop(); a.reduce((x, k) => x[k], o)[l] = v; }

function mField(id, f) {
  const m = mById(id), val = m[f.k];
  const cls = "fld" + (f.wide ? " wide" : "");
  if (f.t === TXT) {
    return `<label class="${cls}"><span>${f.label}</span>
      <input type="text" data-scope="machine" data-mid="${id}" data-key="${f.k}" value="${esc(val)}"></label>`;
  }
  return `<label class="${cls}"><span>${f.label}</span>
    <input type="number" step="any" inputmode="decimal" data-scope="machine" data-mid="${id}" data-key="${f.k}" value="${esc(val)}"></label>`;
}
function topField(scope, k, label, type, extra) {
  const val = getPath(STATE, `${scope}.${k}`);
  const t = type === NUM ? 'type="number" step="any" inputmode="decimal"' : (type || 'type="text"');
  return `<label class="fld${extra ? " " + extra : ""}"><span>${label}</span>
    <input ${t} data-scope="${scope}" data-key="${k}" value="${esc(val)}"></label>`;
}

/* -------------------- Rendu principal -------------------- */
function renderApp() {
  const s = STATE;
  document.getElementById("screen").innerHTML = `
    <section class="card">
      <h2>Client</h2>
      <div class="grid">
        ${topField("client", "name", "Nom du client / société", TXT)}
        ${topField("client", "contact", "Contact (ex. Monsieur Dupont)", TXT)}
        ${topField("client", "addr1", "Adresse", TXT)}
        ${topField("client", "addr2", "Code postal & ville", TXT)}
        ${topField("client", "date", "Date", 'type="date"')}
      </div>
    </section>

    <section class="card">
      <h2>Commercial</h2>
      <div class="grid">
        ${topField("company", "repName", "Nom (Prénom Nom)", TXT)}
        ${topField("company", "repTitle", "Fonction", TXT)}
        ${topField("company", "repPhone", "Téléphone fixe", TXT)}
        ${topField("company", "repMobile", "Portable (optionnel)", TXT)}
        <label class="fld"><span>Email ${s.company.repEmailManual ? "(manuel)" : "(auto)"}</span>
          <input type="text" id="rep-email" data-scope="company" data-key="repEmail"
            value="${esc(repEmail(s.company))}"></label>
      </div>
    </section>

    <section class="card">
      <h2>Financement</h2>
      <div class="grid">
        <label class="fld"><span>Leaser</span>
          <select data-scope="root" data-key="leaser">
            ${LEASERS.map((l) => `<option value="${l}" ${s.leaser === l ? "selected" : ""}>${l}</option>`).join("")}
          </select></label>
        <label class="fld"><span>Durée</span>
          <select data-scope="root" data-key="durationTrim">
            ${DURATIONS.map((d) => `<option value="${d.trim}" ${s.durationTrim == d.trim ? "selected" : ""}>${d.trim} trimestres (${d.mois} mois)</option>`).join("")}
          </select></label>
        <label class="fld"><span>Périodicité</span>
          <select data-scope="root" data-key="periodicite">
            <option value="T" ${s.periodicite === "T" ? "selected" : ""}>Trimestrielle</option>
            <option value="M" ${s.periodicite === "M" ? "selected" : ""}>Mensuelle</option>
          </select></label>
      </div>
      <div id="admin-panel"></div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Machines</h2>
        <button class="btn" data-action="add-machine">＋ Ajouter une machine</button></div>
      <div id="machines"></div>
    </section>

    <section class="card results" id="results"></section>

    <section class="card actions">
      <button class="btn primary" data-action="export-xlsx">⬇︎ Excel SA/SP</button>
      <button class="btn primary" data-action="export-pptx">⬇︎ PowerPoint</button>
      <button class="btn ghost" data-action="reset">Réinitialiser</button>
      <span id="status" class="status"></span>
    </section>`;
  renderMachines(); renderAdmin(); renderResults();
}

function renderMachines() {
  document.getElementById("machines").innerHTML = STATE.machines.map((m, i) => machineCard(m, i)).join("");
}

/* Services & abonnements — un bloc par côté. Le libellé est éditable des 2
   côtés (partagé) ; `side` = "sa" ou "sp" pour la valeur affichée. */
function svcRowsSide(m, side) {
  return m.services.map((sv, idx) => `
    <div class="svc-row2">
      <input class="svc-label" type="text" placeholder="${idx < 4 ? "Libellé" : "Autre (à préciser)"}"
        data-scope="svc" data-mid="${m.id}" data-idx="${idx}" data-field="label" value="${esc(sv.label)}">
      <input type="number" step="any" inputmode="decimal" placeholder="€"
        data-scope="svc" data-mid="${m.id}" data-idx="${idx}" data-field="${side}" value="${esc(sv[side])}">
    </div>`).join("");
}

function machineCard(m, i) {
  const name = m.proposedModel || m.currentModel;
  return `<div class="machine" data-mid="${m.id}">
    <div class="machine-head">
      <strong>Machine ${i + 1}${name ? " — " + esc(name) : ""}</strong>
      <div class="machine-actions">
        <button class="btn small" data-action="dup-machine" data-mid="${m.id}">Dupliquer</button>
        <button class="btn small danger" data-action="del-machine" data-mid="${m.id}" ${STATE.machines.length <= 1 ? "disabled" : ""}>Supprimer</button>
      </div>
    </div>
    <div class="machine-cols">
      <div class="col">
        <h3>Situation actuelle</h3>
        <div class="grid">${SA_MAIN.map((f) => mField(m.id, f)).join("")}</div>
        <label class="fld chk"><input type="checkbox" data-scope="machine" data-mid="${m.id}" data-key="prospect" ${m.prospect ? "checked" : ""}>
          <span>Prospect (chez un concurrent) — sinon client Levad</span></label>
        <div class="subgrid"><h4>N&B</h4><div class="grid">${SA_NB.map((f) => mField(m.id, f)).join("")}</div></div>
        <div class="subgrid"><h4>Couleur</h4><div class="grid">${SA_COUL.map((f) => mField(m.id, f)).join("")}</div></div>
        <div class="subgrid"><h4>Service &amp; abonnements <small>(actuel)</small></h4>
          ${svcRowsSide(m, "sa")}
        </div>
      </div>
      <div class="col">
        <h3>Solution proposée</h3>
        <div class="grid">${SP_MAIN.map((f) => mField(m.id, f)).join("")}</div>
        <div class="subgrid"><h4>Volumes proposés <small>(calcul auto · modifiables)</small></h4>
          <div class="grid">
            <label class="fld"><span>Volume N&B proposé (pages)</span>
              <input type="number" step="any" inputmode="decimal" data-scope="spvol" data-mid="${m.id}" data-key="spVolNB" id="spvol-nb-${m.id}" value="${esc(m.spVolNB)}"></label>
            <label class="fld"><span>Volume couleur proposé (pages)</span>
              <input type="number" step="any" inputmode="decimal" data-scope="spvol" data-mid="${m.id}" data-key="spVolCoul" id="spvol-coul-${m.id}" value="${esc(m.spVolCoul)}"></label>
          </div>
        </div>
        <div class="subgrid"><h4>Coûts page proposés</h4>
          <div class="grid">${SP_CC.map((f) => mField(m.id, f)).join("")}</div></div>
        <div class="subgrid"><h4>Rachat, cadeau &amp; marge</h4>
          <div class="grid">
            <div class="fld"><span>Rachat (calculé)</span><div class="ro" id="ro-rachat-${m.id}"></div></div>
            <label class="fld"><span>Cadeau / autre (€)</span>
              <input type="number" step="any" inputmode="decimal" data-scope="machine" data-mid="${m.id}" data-key="cadeaux" value="${esc(m.cadeaux)}"></label>
            <label class="fld wide"><span>Descriptif cadeau / autre</span>
              <input type="text" data-scope="machine" data-mid="${m.id}" data-key="cadeauxLabel" value="${esc(m.cadeauxLabel)}"></label>
            <label class="fld"><span>Mode de calcul</span>
              <select data-scope="machine-sel" data-mid="${m.id}" data-key="margeMode">
                <option value="marge" ${m.margeMode !== "loyer" ? "selected" : ""}>Marge → loyer</option>
                <option value="loyer" ${m.margeMode === "loyer" ? "selected" : ""}>Loyer → marge</option>
              </select></label>
            ${m.margeMode === "loyer"
              ? `<label class="fld"><span>Loyer proposé ${perShort(STATE)} (€)</span>
                   <input type="number" step="any" inputmode="decimal" data-scope="machine" data-mid="${m.id}" data-key="loyerCible" value="${esc(m.loyerCible)}"></label>
                 <div class="fld"><span>Marge (calculée)</span><div class="ro" id="ro-calc-${m.id}"></div></div>`
              : `<label class="fld"><span>Marge commerciale (€)</span>
                   <input type="number" step="any" inputmode="decimal" data-scope="machine" data-mid="${m.id}" data-key="marge" value="${esc(m.marge)}"></label>
                 <div class="fld"><span>Loyer proposé (calculé) ${perShort(STATE)}</span><div class="ro" id="ro-calc-${m.id}"></div></div>`}
          </div>
        </div>
        <div class="subgrid"><h4>Service &amp; abonnements <small>(proposé)</small></h4>
          ${svcRowsSide(m, "sp")}
        </div>
      </div>
    </div>
    <div class="machine-sum" id="msum-${m.id}"></div>
  </div>`;
}

function renderAdmin() {
  const panel = document.getElementById("admin-panel");
  if (!panel) return;
  if (!ADMIN) {
    panel.innerHTML = `<button class="btn ghost small" data-action="admin-unlock">🔒 Accès admin</button>`;
    return;
  }
  panel.innerHTML = `
    <div class="admin">
      <div class="admin-head">🔓 Mode admin
        <button class="btn ghost small" data-action="admin-lock">Verrouiller</button></div>
      <div class="grid">
        <label class="fld"><span>Valeur libre (laisser vide = barème ${esc(STATE.leaser)})</span>
          <input type="number" step="any" inputmode="decimal" data-scope="root" data-key="coeffOverride"
            value="${esc(STATE.coeffOverride)}" placeholder="barème automatique"></label>
      </div>
      <div class="admin-actions">
        <button class="btn ghost small" data-action="admin-clear-override">Revenir au barème</button>
        <button class="btn ghost small" data-action="admin-passwd">Changer le mot de passe</button>
      </div>
    </div>`;
}

function renderResults() {
  STATE.machines.forEach((m) => {
    const el = document.getElementById("msum-" + m.id); if (!el) return;
    const r = computeMachine(m, STATE), div = perDivisor(STATE);
    const roR = document.getElementById("ro-rachat-" + m.id);
    if (roR) roR.textContent = eur(r.rachat);
    const roC = document.getElementById("ro-calc-" + m.id);
    if (roC) roC.textContent = m.margeMode === "loyer" ? eur(r.marge) : eur(r.spLoyerT / div);
    // volumes proposés auto : reflète la valeur calculée tant qu'il n'y a pas d'override
    const nbEl = document.getElementById("spvol-nb-" + m.id);
    if (nbEl && (m.spVolNB === "" || m.spVolNB == null) && document.activeElement !== nbEl) nbEl.value = Math.round(r.sp.volNB);
    const coulEl = document.getElementById("spvol-coul-" + m.id);
    if (coulEl && (m.spVolCoul === "" || m.spVolCoul == null) && document.activeElement !== coulEl) coulEl.value = Math.round(r.sp.volCoul);
    // ligne récap : rachat, prix machine, logistique, cadeau, marge
    const logistique = num(m.livraison) + num(m.retrait) + num(m.installation) + num(m.portageLivraison) + num(m.portageRetrait);
    el.innerHTML = `
      <span>Rachat total : <b>${eur(r.rachat)}</b></span>
      <span>Prix machine : <b>${eur(num(m.prixMachine))}</b></span>
      <span>Livraison + retrait + installation : <b>${eur(logistique)}</b></span>
      <span>Cadeau / autre : <b>${eur(r.cadeaux)}</b></span>
      <span>Marge : <b class="${r.marge < 0 ? "neg" : ""}">${eur(r.marge)}</b></span>`;
  });
  const res = document.getElementById("results"); if (!res) return;
  const c = computeAll(STATE), div = c.divisor, eco = c.savingYear;
  res.innerHTML = `
    <h2>Synthèse (${perAdj(STATE)})</h2>
    <div class="totals">
      <div class="tot"><span>Situation actuelle</span><b>${eur(c.saTotal / div)}</b><small>${perShort(STATE)}</small></div>
      <div class="tot"><span>Solution proposée</span><b>${eur(c.spTotal / div)}</b><small>${perShort(STATE)}</small></div>
      <div class="tot big ${eco >= 0 ? "pos" : "neg"}"><span>${eco >= 0 ? "Économie" : "Surcoût"} annuel</span>
        <b>${eur(Math.abs(eco))}</b><small>${eur(Math.abs(c.savingQuarter) / div)} ${perShort(STATE)}</small></div>
    </div>
    <p class="muted small">Loyer proposé total : ${eur(c.spLoyerTotal / div)} ${perShort(STATE)} · Rachat total : ${eur(c.rachatTotal)} · ${c.durationTrim} trimestres · ${esc(STATE.leaser)}${ADMIN ? " · coeff " + frNum(baseCoeff(STATE, c.rows[0] ? c.rows[0].financed : 0), 3) : ""}</p>`;
}

/* -------------------- Événements -------------------- */
function commit() { saveState(STATE); renderResults(); }

document.addEventListener("input", (e) => {
  const t = e.target; if (!t.dataset || !t.dataset.scope) return;
  const scope = t.dataset.scope, key = t.dataset.key;
  const val = t.type === "checkbox" ? t.checked : (t.type === "number" ? (t.value === "" ? 0 : num(t.value)) : t.value);
  if (scope === "machine") {
    const m = mById(t.dataset.mid); if (m) m[key] = val;
    if (key === "currentModel" || key === "proposedModel") updateMachineTitle(t.dataset.mid);
  } else if (scope === "svc") {
    const m = mById(t.dataset.mid); const sv = m.services[+t.dataset.idx];
    sv[t.dataset.field] = t.dataset.field === "label" ? t.value : (t.value === "" ? 0 : num(t.value));
    if (t.dataset.field === "label") { // libellé partagé : synchronise les 2 blocs
      document.querySelectorAll(`input.svc-label[data-mid="${t.dataset.mid}"][data-idx="${t.dataset.idx}"]`)
        .forEach((el) => { if (el !== t) el.value = t.value; });
    }
  } else if (scope === "spvol") {
    const m = mById(t.dataset.mid); if (m) m[t.dataset.key] = t.value; // "" = auto
  } else if (scope === "root") {
    STATE[key] = (key === "durationTrim") ? parseInt(t.value, 10) : t.value;
  } else if (scope === "company") {
    STATE.company[key] = val;
    if (key === "repName" && !STATE.company.repEmailManual) {
      const em = document.getElementById("rep-email"); if (em) em.value = repEmail(STATE.company);
    }
    if (key === "repEmail") STATE.company.repEmailManual = true;
  } else {
    setPath(STATE, `${scope}.${key}`, val);
  }
  commit();
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.tagName !== "SELECT") return;
  if (t.dataset.scope === "root") {
    STATE[t.dataset.key] = t.dataset.key === "durationTrim" ? parseInt(t.value, 10) : t.value;
    saveState(STATE);
    if (t.dataset.key === "leaser") renderAdmin();
    renderMachines(); renderResults(); // périodicité/leaser : rafraîchit les libellés
  } else if (t.dataset.scope === "machine-sel") {
    const m = mById(t.dataset.mid); if (m) m[t.dataset.key] = t.value;
    saveState(STATE); renderMachines(); renderResults(); // bascule marge/loyer
  }
});

function updateMachineTitle(id) {
  const m = mById(id); const el = document.querySelector(`.machine[data-mid="${id}"] .machine-head strong`);
  if (el) { const n = m.proposedModel || m.currentModel; const i = STATE.machines.indexOf(m) + 1;
    el.textContent = `Machine ${i}${n ? " — " + n : ""}`; }
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]"); if (!btn) return;
  const a = btn.dataset.action, mid = btn.dataset.mid;
  switch (a) {
    case "add-machine": STATE.machines.push(defaultMachine()); saveState(STATE); renderMachines(); renderResults(); break;
    case "dup-machine": {
      const src = mById(mid); const copy = JSON.parse(JSON.stringify(src)); copy.id = cryptoId();
      STATE.machines.splice(STATE.machines.indexOf(src) + 1, 0, copy);
      saveState(STATE); renderMachines(); renderResults(); break;
    }
    case "del-machine":
      if (STATE.machines.length <= 1) break;
      STATE.machines = STATE.machines.filter((x) => x.id !== mid);
      saveState(STATE); renderMachines(); renderResults(); break;
    case "reset":
      if (confirm("Réinitialiser toute la saisie ?")) { STATE = defaultState(); saveState(STATE); renderApp(); } break;
    case "export-xlsx":
      try { await exportExcel(STATE, computeAll(STATE)); flash("Excel généré."); }
      catch (err) { flash("Erreur Excel : " + err.message, true); console.error(err); } break;
    case "export-pptx":
      flash("Génération du PowerPoint…");
      try { await exportPptx(STATE, computeAll(STATE)); flash("PowerPoint généré."); }
      catch (err) { flash("Erreur PowerPoint : " + err.message, true); console.error(err); } break;
    case "admin-unlock": {
      const pw = prompt("Mot de passe admin :"); if (pw == null) break;
      if (await checkPassword(pw)) { ADMIN = true; renderAdmin(); renderResults(); } else flash("Mot de passe incorrect.", true); break;
    }
    case "admin-lock": ADMIN = false; renderAdmin(); renderResults(); break;
    case "admin-clear-override": STATE.coeffOverride = ""; saveState(STATE); renderAdmin(); renderResults(); break;
    case "admin-passwd": { const np = prompt("Nouveau mot de passe admin :"); if (np) { await setPassword(np); flash("Mot de passe modifié."); } break; }
  }
});

function flash(msg, err) {
  const el = document.getElementById("status"); if (!el) return;
  el.textContent = msg; el.className = "status" + (err ? " err" : " ok");
  clearTimeout(flash._t); flash._t = setTimeout(() => { el.textContent = ""; el.className = "status"; }, 4000);
}

/* -------------------- Admin : mot de passe (SHA-256) -------------------- */
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function checkPassword(pw) {
  const stored = localStorage.getItem(ADMIN_KEY);
  return stored ? (await sha256(pw)) === stored : pw === DEFAULT_ADMIN_PASSWORD;
}
async function setPassword(pw) { localStorage.setItem(ADMIN_KEY, await sha256(pw)); }

/* -------------------- Thème -------------------- */
(function theme() {
  const saved = localStorage.getItem("levad_theme");
  if (saved) document.documentElement.dataset.theme = saved;
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#theme-toggle")) return;
    const cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = cur; localStorage.setItem("levad_theme", cur);
  });
})();

renderApp();
