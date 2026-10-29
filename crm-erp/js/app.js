/* ============================================================
   Interface — Levad Gestion.
   ============================================================ */

const esc = escXml;
let UI = { view: "dashboard", crmFilter: "client", crmSearch: "", invFrom: "", invTo: "", invStatus: "" };
let draft = null;

async function boot() {
  const saved = localStorage.getItem("levad_gestion_theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  await Store.init();
  await initAuth();
  Store.onUpdate = render;
  render();
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", cur);
  localStorage.setItem("levad_gestion_theme", cur);
}

function setView(v, extra) { closeModal(); UI.view = v; Object.assign(UI, extra || {}); render(); }

/* --- Modal --- */
function openModal(title, bodyHtml, footerHtml) {
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="row between"><h2 style="margin:0">${esc(title)}</h2><button class="icon-btn modal-close" onclick="closeModal()">✕</button></div>
        <div id="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="row" style="margin-top:14px;justify-content:flex-end">${footerHtml}</div>` : ""}
      </div>
    </div>`;
}
function closeModal() { document.getElementById("modal-root").innerHTML = ""; draft = null; }
function modalBody(html) { document.getElementById("modal-body").innerHTML = html; }

function notify(msg, kind) {
  const el = document.createElement("div");
  el.className = "banner " + (kind || "warn");
  el.style.cssText = "position:fixed;top:70px;right:16px;z-index:50;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,.2)";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}
async function guard(fn) {
  try { await fn(); } catch (e) { notify(e.message || String(e), "error"); }
}

/* --- Shell --- */
function render() {
  const user = getCurrentUser();
  if (!user) return renderLogin();
  const active = document.activeElement;
  const activeId = active && active.id;
  const selStart = active && "selectionStart" in active ? active.selectionStart : null;
  const selEnd = active && "selectionEnd" in active ? active.selectionEnd : null;

  document.getElementById("app").innerHTML = shellHtml(user) + `<main id="main"></main>`;
  document.getElementById("main").innerHTML = renderView(user);

  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
      if (selStart != null && el.setSelectionRange) { try { el.setSelectionRange(selStart, selEnd); } catch (e) {} }
    }
  }
}

function navItems(user) {
  const items = [{ id: "dashboard", label: "Tableau de bord" }, { id: "crm", label: "CRM" }];
  if (isCompta(user)) {
    items.push(
      { id: "machines", label: "Machines" },
      { id: "meters", label: "Compteurs" },
      { id: "billing", label: "Facturation" },
      { id: "invoices", label: "Factures" },
      { id: "sepa", label: "Prélèvements SEPA" },
      { id: "exports", label: "Exports compta" },
    );
  }
  if (isAdmin(user)) items.push({ id: "users", label: "Utilisateurs" });
  if (isCompta(user)) items.push({ id: "settings", label: "Paramètres" });
  return items;
}

function shellHtml(user) {
  const items = navItems(user);
  return `
    <div class="topbar">
      <div class="row">
        <div class="logo">Levad <small>Gestion</small></div>
        <div class="nav">
          ${items.map((i) => `<button class="${UI.view === i.id ? "active" : ""}" onclick="setView('${i.id}')">${i.label}</button>`).join("")}
        </div>
      </div>
      <div class="top-right">
        <span class="user-chip">${esc(user.name)} · ${esc(ROLE_LABELS[user.role] || user.role)}</span>
        <button class="icon-btn" title="Thème" onclick="toggleTheme()">🌓</button>
        <button class="btn small" onclick="guard(async()=>{logout();render();})">Déconnexion</button>
      </div>
    </div>`;
}

function renderView(user) {
  try {
    switch (UI.view) {
      case "dashboard": return viewDashboard(user);
      case "crm": return viewCRM(user);
      case "client": return viewClient(user, UI.clientId);
      case "contract": return viewContract(user, UI.contractId);
      case "machines": return isCompta(user) ? viewMachines(user) : accessDenied();
      case "machine": return isCompta(user) ? viewMachine(user, UI.machineId) : accessDenied();
      case "meters": return isCompta(user) ? viewMeters(user) : accessDenied();
      case "billing": return isCompta(user) ? viewBilling(user) : accessDenied();
      case "invoices": return isCompta(user) ? viewInvoices(user) : accessDenied();
      case "invoice": return isCompta(user) ? viewInvoice(user, UI.invoiceId) : accessDenied();
      case "sepa": return isCompta(user) ? viewSepa(user) : accessDenied();
      case "exports": return isCompta(user) ? viewExports(user) : accessDenied();
      case "users": return isAdmin(user) ? viewUsers(user) : accessDenied();
      case "settings": return isCompta(user) ? viewSettings(user) : accessDenied();
      default: return viewDashboard(user);
    }
  } catch (e) {
    console.error(e);
    return `<div class="card"><p class="muted">Erreur d'affichage : ${esc(e.message)}</p></div>`;
  }
}
function accessDenied() { return `<div class="card"><p class="muted">Accès non autorisé pour votre rôle.</p></div>`; }

/* ============================================================
   Connexion
   ============================================================ */
function renderLogin() {
  document.getElementById("app").innerHTML = `
    <main><div class="card login-card">
      <h2>Levad — Gestion</h2>
      <p class="muted small">Connexion (Store : ${esc(Store.mode)}${Store.lastError ? " — " + esc(Store.lastError) : ""})</p>
      <form onsubmit="return doLogin(event)">
        <div class="grid" style="grid-template-columns:1fr">
          <label class="fld"><span>Identifiant</span><input name="username" required autofocus /></label>
          <label class="fld"><span>Mot de passe</span><input name="password" type="password" required /></label>
        </div>
        <div class="row" style="margin-top:12px"><button class="btn primary" type="submit">Se connecter</button></div>
        <p class="small muted" style="margin-top:10px">Premier accès : identifiant <b>admin</b> / mot de passe <b>${esc(DEFAULT_ADMIN_PASSWORD)}</b> (à changer dans Utilisateurs).</p>
      </form>
    </div></main>`;
}
async function doLogin(ev) {
  ev.preventDefault();
  const f = ev.target;
  const u = await tryLogin(f.username.value, f.password.value);
  if (!u) notify("Identifiant ou mot de passe incorrect.", "error");
  else render();
  return false;
}

/* ============================================================
   Tableau de bord
   ============================================================ */
function viewDashboard(user) {
  const myClients = visibleClients(user);
  const clients = myClients.filter((c) => c.kind === "client").length;
  const prospects = myClients.filter((c) => c.kind === "prospect").length;
  let extra = "";
  if (isCompta(user)) {
    const activeContracts = Store.contracts.filter((c) => c.status === "active").length;
    const unpaid = Store.invoices.filter((i) => i.status === "unpaid");
    const dueThisMonth = contractsDueForRun(endOfMonth(todayISO())).length;
    extra = `
      <div class="stat"><span class="muted small">Contrats actifs</span><b>${activeContracts}</b></div>
      <div class="stat"><span class="muted small">Échéances ce mois-ci</span><b>${dueThisMonth}</b></div>
      <div class="stat"><span class="muted small">Factures non soldées</span><b>${unpaid.length}</b></div>
      <div class="stat"><span class="muted small">Montant impayé</span><b>${fmtMoney(unpaid.reduce((s, i) => s + i.totalTTC, 0))}</b></div>`;
  }
  return `
    <div class="card">
      <h2>Bonjour ${esc(user.name)}</h2>
      <div class="stats-grid">
        <div class="stat"><span class="muted small">${isCompta(user) ? "Clients" : "Mes clients"}</span><b>${clients}</b></div>
        <div class="stat"><span class="muted small">Prospects</span><b>${prospects}</b></div>
        ${extra}
      </div>
    </div>
    <div class="card">
      <div class="row"><button class="btn primary" onclick="setView('crm')">Ouvrir le CRM</button>
      ${isCompta(user) ? `<button class="btn" onclick="setView('billing')">Facturation du mois</button>` : ""}
      </div>
    </div>`;
}

/* ============================================================
   CRM — liste clients / prospects
   ============================================================ */
function viewCRM(user) {
  let list = visibleClients(user);
  if (UI.crmFilter !== "all") list = list.filter((c) => c.kind === UI.crmFilter);
  if (UI.crmSearch) { const q = normStr(UI.crmSearch); list = list.filter((c) => normStr(c.name).includes(q) || normStr(c.siret).includes(q)); }
  list = list.slice().sort((a, b) => a.name.localeCompare(b.name));

  const rows = list.map((c) => {
    const unpaid = Store.invoices.filter((i) => i.clientId === c.id && i.status === "unpaid");
    const com = getUserById(c.commercialId);
    return `<tr class="clickable" onclick="setView('client',{clientId:'${c.id}'})">
      <td><span class="badge ${c.kind}">${c.kind === "client" ? "Client" : "Prospect"}</span></td>
      <td><b>${esc(c.name)}</b></td>
      <td>${esc(c.address.city || "")}</td>
      <td>${esc(com ? com.name : "—")}</td>
      <td>${unpaid.length ? `<span class="badge unpaid">${unpaid.length} impayée(s)</span>` : ""}</td>
    </tr>`;
  }).join("");

  return `
    <div class="card">
      <div class="card-head">
        <h2>CRM</h2>
        <div class="row">
          <input id="crm-search" placeholder="Rechercher…" value="${esc(UI.crmSearch)}" oninput="UI.crmSearch=this.value;render()" style="padding:7px 9px;border-radius:9px;border:1px solid var(--line);background:var(--field);color:var(--ink)" />
          ${canCreateProspect(user) ? `<button class="btn" onclick="openClientModal(null,'prospect')">+ Prospect</button>` : ""}
          ${canCreateClient(user) ? `<button class="btn primary" onclick="openClientModal(null,'client')">+ Client</button>` : ""}
        </div>
      </div>
      <div class="tabs">
        ${["client", "prospect", "all"].map((k) => `<button class="${UI.crmFilter === k ? "active" : ""}" onclick="UI.crmFilter='${k}';render()">${k === "client" ? "Clients" : k === "prospect" ? "Prospects" : "Tous"}</button>`).join("")}
      </div>
      <table><thead><tr><th></th><th>Nom</th><th>Ville</th><th>Commercial</th><th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5" class="muted">Aucun résultat.</td></tr>`}</tbody></table>
    </div>`;
}

function openClientModal(clientId, kind) {
  const c = clientId ? clone(Store.clients.find((x) => x.id === clientId)) : defaultClient();
  if (kind) c.kind = kind;
  const user = getCurrentUser();
  if (!clientId && isCommercial(user)) c.commercialId = user.id;
  draft = c;
  const commercials = Store.users.filter((u) => u.role === ROLES.COMMERCIAL || u.role === ROLES.ADMIN);
  openModal(clientId ? "Modifier la fiche" : (kind === "client" ? "Nouveau client" : "Nouveau prospect"), `
    <div class="grid">
      <label class="fld"><span>Nom / Raison sociale</span><input value="${esc(c.name)}" oninput="draft.name=this.value" required /></label>
      <label class="fld"><span>SIRET</span><input value="${esc(c.siret)}" oninput="draft.siret=this.value" /></label>
      <label class="fld"><span>Adresse</span><input value="${esc(c.address.line1)}" oninput="draft.address.line1=this.value" /></label>
      <label class="fld"><span>Complément</span><input value="${esc(c.address.line2)}" oninput="draft.address.line2=this.value" /></label>
      <label class="fld"><span>Code postal</span><input value="${esc(c.address.zip)}" oninput="draft.address.zip=this.value" /></label>
      <label class="fld"><span>Ville</span><input value="${esc(c.address.city)}" oninput="draft.address.city=this.value" /></label>
      ${isCompta(user) ? `
      <label class="fld"><span>Commercial attitré</span>
        <select oninput="draft.commercialId=this.value">
          <option value="">—</option>
          ${commercials.map((u) => `<option value="${u.id}" ${c.commercialId === u.id ? "selected" : ""}>${esc(u.name)}</option>`).join("")}
        </select>
      </label>` : `<div class="fld"><span>Commercial attitré</span><div>${esc(user.name)}</div></div>`}
      ${isCompta(user) ? `
      <label class="fld chk"><input type="checkbox" ${c.chorusPro ? "checked" : ""} onchange="draft.chorusPro=this.checked" /><span>Administration (dépôt Chorus Pro)</span></label>
      <label class="fld"><span>Code service Chorus Pro</span><input value="${esc(c.chorusProCode)}" oninput="draft.chorusProCode=this.value" /></label>
      <label class="fld"><span>IBAN (prélèvement)</span><input value="${esc(c.iban)}" oninput="draft.iban=this.value" /></label>
      <label class="fld"><span>BIC</span><input value="${esc(c.bic)}" oninput="draft.bic=this.value" /></label>
      <label class="fld"><span>Référence mandat SEPA</span><input value="${esc(c.mandateRef)}" oninput="draft.mandateRef=this.value" /></label>
      <label class="fld"><span>Date de signature du mandat</span><input type="date" value="${esc(c.mandateDate)}" oninput="draft.mandateDate=this.value" /></label>` : ""}
      <label class="fld" style="grid-column:1/-1"><span>Notes</span><textarea rows="2" oninput="draft.notes=this.value">${esc(c.notes)}</textarea></label>
    </div>
    <h3>Contacts</h3>
    <div id="contacts-editor">${contactsEditorHtml(c.contacts)}</div>
    <button class="btn small" onclick="draft.contacts.push(defaultContact());document.getElementById('contacts-editor').innerHTML=contactsEditorHtml(draft.contacts)">+ Contact</button>
  `, `<button class="btn" onclick="closeModal()">Annuler</button><button class="btn primary" onclick="guard(saveClientDraft)">Enregistrer</button>`);
}
function contactsEditorHtml(contacts) {
  return contacts.map((ct, i) => `
    <div class="line-row" style="display:grid;grid-template-columns:1.2fr 1fr 1fr 1.2fr auto;gap:6px;margin-bottom:6px">
      <input placeholder="Nom" value="${esc(ct.name)}" oninput="draft.contacts[${i}].name=this.value" />
      <input placeholder="Fonction" value="${esc(ct.role)}" oninput="draft.contacts[${i}].role=this.value" />
      <input placeholder="Téléphone" value="${esc(ct.phone)}" oninput="draft.contacts[${i}].phone=this.value" />
      <input placeholder="Email" value="${esc(ct.email)}" oninput="draft.contacts[${i}].email=this.value" />
      <button class="btn small danger" onclick="draft.contacts.splice(${i},1);document.getElementById('contacts-editor').innerHTML=contactsEditorHtml(draft.contacts)">✕</button>
    </div>`).join("") || `<p class="muted small">Aucun contact.</p>`;
}
async function convertToClient(clientId) {
  const c = Store.clients.find((x) => x.id === clientId);
  c.kind = "client";
  c.convertedAt = todayISO();
  await Store.put("clients", c);
  render();
}
async function saveClientDraft() {
  if (!draft.name.trim()) throw new Error("Le nom est obligatoire.");
  const isNew = !Store.clients.some((x) => x.id === draft.id);
  if (isNew) { draft.createdAt = todayISO(); draft.createdBy = getCurrentUser().id; }
  await Store.put("clients", draft);
  const id = draft.id;
  closeModal(); setView("client", { clientId: id });
}

/* ============================================================
   Fiche client
   ============================================================ */
function viewClient(user, clientId) {
  const c = Store.clients.find((x) => x.id === clientId);
  if (!c) return `<div class="card">Client introuvable. <button class="btn" onclick="setView('crm')">Retour</button></div>`;
  const canSee = isCompta(user) || c.commercialId === user.id;
  if (!canSee) return accessDenied();

  const contracts = Store.contracts.filter((k) => k.clientId === c.id);
  const invoices = Store.invoices.filter((i) => i.clientId === c.id).slice().sort((a, b) => b.date.localeCompare(a.date));
  const unpaid = invoices.filter((i) => i.status === "unpaid");
  const com = getUserById(c.commercialId);

  return `
    <div class="card">
      <div class="card-head">
        <div class="row">
          <button class="icon-btn" onclick="setView('crm')">←</button>
          <h2 style="margin:0">${esc(c.name)} <span class="badge ${c.kind}">${c.kind === "client" ? "Client" : "Prospect"}</span></h2>
          ${unpaid.length ? `<span class="badge unpaid">${unpaid.length} facture(s) non soldée(s) — ${fmtMoney(unpaid.reduce((s, i) => s + i.totalTTC, 0))}</span>` : ""}
        </div>
        <div class="row">
          ${(isCompta(user) || c.commercialId === user.id) ? `<button class="btn" onclick="openClientModal('${c.id}')">Modifier</button>` : ""}
          ${canConvertProspect(user) && c.kind === "prospect" ? `<button class="btn primary" onclick="guard(()=>convertToClient('${c.id}'))">Convertir en client</button>` : ""}
        </div>
      </div>
      <div class="grid">
        <div><span class="muted small">Adresse</span><br>${esc(c.address.line1)} ${esc(c.address.line2)}<br>${esc(c.address.zip)} ${esc(c.address.city)}</div>
        <div><span class="muted small">SIRET</span><br>${esc(c.siret) || "—"}</div>
        <div><span class="muted small">Commercial</span><br>${esc(com ? com.name : "—")}</div>
        <div><span class="muted small">Chorus Pro</span><br>${c.chorusPro ? "Oui (" + esc(c.chorusProCode) + ")" : "Non"}</div>
      </div>
      ${c.notes ? `<p class="small muted" style="white-space:pre-wrap;margin-top:10px">${esc(c.notes)}</p>` : ""}
      <h3>Contacts</h3>
      <table><thead><tr><th>Nom</th><th>Fonction</th><th>Téléphone</th><th>Email</th></tr></thead>
      <tbody>${c.contacts.map((ct) => `<tr><td>${esc(ct.name)}</td><td>${esc(ct.role)}</td><td>${esc(ct.phone)}</td><td>${esc(ct.email)}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">Aucun contact.</td></tr>`}</tbody></table>
    </div>

    <div class="card">
      <div class="card-head"><h2>Contrats</h2>
        ${canManageBusinessData(user) && c.kind === "client" ? `<button class="btn primary" onclick="openContractModal(null,'${c.id}')">+ Contrat</button>` : ""}
      </div>
      <table><thead><tr><th>Activité</th><th>Libellé</th><th>Statut</th><th>Début</th><th>Prochaine échéance</th><th></th></tr></thead>
      <tbody>${contracts.map((k) => `<tr class="clickable" onclick="setView('contract',{contractId:'${k.id}'})">
        <td>${esc(ACTIVITIES[k.activity] || k.activity)}</td><td>${esc(k.label)}</td>
        <td><span class="badge ${k.status}">${CONTRACT_STATUS[k.status]}</span></td>
        <td>${fmtDate(k.startDate)}</td><td>${k.status === "active" ? fmtDate(k.nextBillingDate) : "—"}</td><td>→</td>
      </tr>`).join("") || `<tr><td colspan="6" class="muted">Aucun contrat.</td></tr>`}</tbody></table>
    </div>

    <div class="card">
      <h2>Factures</h2>
      <table><thead><tr><th>Numéro</th><th>Date</th><th>Type</th><th class="num">Total TTC</th><th>Statut</th><th></th></tr></thead>
      <tbody>${invoices.map((i) => `<tr class="clickable" onclick="setView('invoice',{invoiceId:'${i.id}'})">
        <td>${esc(i.number)}</td><td>${fmtDate(i.date)}</td><td>${invoiceTypeLabel(i.type)}</td>
        <td class="num">${fmtMoney(i.totalTTC)}</td><td><span class="badge ${i.status}">${INVOICE_STATUS[i.status]}</span></td><td>→</td>
      </tr>`).join("") || `<tr><td colspan="6" class="muted">Aucune facture.</td></tr>`}</tbody></table>
    </div>`;
}

/* ============================================================
   Contrat — création / édition / détail
   ============================================================ */
function openContractModal(contractId, clientId, prefill) {
  const k = contractId ? clone(Store.contracts.find((x) => x.id === contractId)) : defaultContract();
  if (clientId) k.clientId = clientId;
  if (!contractId && prefill) { Object.assign(k, prefill); k.nextBillingDate = k.startDate; }
  draft = k;
  openModal(contractId ? "Modifier le contrat" : "Nouveau contrat", contractModalBody(k), `
    <button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn primary" onclick="guard(saveContractDraft)">Enregistrer</button>`);
}
function contractModalBody(k) {
  return `
    <div class="grid">
      <label class="fld"><span>Activité</span>
        <select onchange="draft.activity=this.value">
          ${Object.entries(ACTIVITIES).map(([v, l]) => `<option value="${v}" ${k.activity === v ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </label>
      <label class="fld"><span>Libellé</span><input value="${esc(k.label)}" oninput="draft.label=this.value" placeholder="ex. Photocopieur accueil" /></label>
      <label class="fld"><span>Date de début</span><input type="date" value="${esc(k.startDate)}" oninput="draft.startDate=this.value;draft.nextBillingDate=this.value" /></label>
      <label class="fld"><span>Durée d'engagement (mois)</span><input type="number" value="${k.durationMonths}" oninput="draft.durationMonths=Number(this.value)" /></label>
      <label class="fld"><span>Fréquence de facturation</span>
        <select onchange="draft.billingFrequency=this.value">
          ${Object.entries(BILLING_FREQUENCIES).map(([v, l]) => `<option value="${v}" ${k.billingFrequency === v ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </label>
      <label class="fld"><span>Indexation annuelle (anniversaire du contrat)</span>
        <select onchange="draft.indexationMode=this.value;reRenderIndexationRate()">
          ${Object.entries(INDEXATION_MODES).map(([v, l]) => `<option value="${v}" ${k.indexationMode === v ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </label>
      <div id="indexation-rate-fld">${indexationRateFieldHtml(k)}</div>
    </div>
    <h3>Lignes de facturation</h3>
    <div id="lines-editor">${linesEditorHtml(k.lines)}</div>
    <div class="row" style="margin-top:8px">
      <button class="btn small" onclick="draft.lines.push(defaultFixedLine());reRenderLines()">+ Ligne fixe</button>
      <button class="btn small" onclick="draft.lines.push(defaultMeteredLine());reRenderLines()">+ Ligne compteur</button>
      ${!k.id || !Store.contracts.some(c=>c.id===k.id) ? `<button class="btn small" onclick="draft.lines=photocopieurLineTemplate();reRenderLines()">Modèle photocopieur standard</button>` : ""}
    </div>`;
}
function reRenderLines() { document.getElementById("lines-editor").innerHTML = linesEditorHtml(draft.lines); }
function indexationRateFieldHtml(k) {
  if (k.indexationMode !== "custom") return "";
  return `<label class="fld"><span>Taux personnalisé (% / an)</span><input type="number" step="0.1" value="${k.indexationRate}" oninput="draft.indexationRate=Number(this.value)" /></label>`;
}
function reRenderIndexationRate() { document.getElementById("indexation-rate-fld").innerHTML = indexationRateFieldHtml(draft); }
function linesEditorHtml(lines) {
  return `<div class="lines-editor">` + lines.map((l, i) => {
    if (l.type === "fixed") {
      return `<div class="line-row">
        <input placeholder="Libellé" value="${esc(l.label)}" oninput="draft.lines[${i}].label=this.value" />
        <div class="money-wrap"><input type="number" step="0.01" value="${l.amountHT}" oninput="draft.lines[${i}].amountHT=Number(this.value)" /></div>
        <input placeholder="TVA %" type="number" value="${l.vatRate}" oninput="draft.lines[${i}].vatRate=Number(this.value)" />
        <span class="muted small">Fixe / échoir</span>
        <button class="btn small danger" onclick="draft.lines.splice(${i},1);reRenderLines()">✕</button>
      </div>`;
    }
    return `<div class="line-row metered">
      <input placeholder="Libellé" value="${esc(l.label)}" oninput="draft.lines[${i}].label=this.value" />
      <select onchange="draft.lines[${i}].counterType=this.value">
        <option value="bw" ${l.counterType === "bw" ? "selected" : ""}>N&B</option>
        <option value="color" ${l.counterType === "color" ? "selected" : ""}>Couleur</option>
      </select>
      <input placeholder="Inclus (qté)" type="number" value="${l.includedQty}" oninput="draft.lines[${i}].includedQty=Number(this.value)" />
      <input placeholder="Prix dépass. HT" type="number" step="0.001" value="${l.overageUnitPrice}" oninput="draft.lines[${i}].overageUnitPrice=Number(this.value)" />
      <input placeholder="TVA %" type="number" value="${l.vatRate}" oninput="draft.lines[${i}].vatRate=Number(this.value)" />
      <button class="btn small danger" onclick="draft.lines.splice(${i},1);reRenderLines()">✕</button>
    </div>`;
  }).join("") + `</div>` + (lines.length ? "" : `<p class="muted small">Aucune ligne. Ajoutez un forfait fixe et/ou une ligne compteur.</p>`);
}
async function saveContractDraft() {
  if (!draft.clientId) throw new Error("Client manquant.");
  if (!draft.label.trim()) draft.label = ACTIVITIES[draft.activity];
  const isNew = !Store.contracts.some((x) => x.id === draft.id);
  if (isNew) { draft.createdAt = todayISO(); draft.nextBillingDate = draft.startDate; draft.lastBilledCounters = {}; }
  await Store.put("contracts", draft);
  if (isNew && draft.replacesContractId) {
    const old = Store.contracts.find((c) => c.id === draft.replacesContractId);
    if (old) { old.replacedByContractId = draft.id; await Store.put("contracts", old); }
  }
  const id = draft.id;
  closeModal(); setView("contract", { contractId: id });
}

function viewContract(user, contractId) {
  const k = Store.contracts.find((x) => x.id === contractId);
  if (!k) return `<div class="card">Contrat introuvable.</div>`;
  const client = Store.clients.find((c) => c.id === k.clientId);
  const canSee = isCompta(user) || (client && client.commercialId === user.id);
  if (!canSee) return accessDenied();
  const machines = k.machineIds.map((id) => Store.machines.find((m) => m.id === id)).filter(Boolean);
  const invoices = Store.invoices.filter((i) => i.contractId === k.id).slice().sort((a, b) => b.date.localeCompare(a.date));
  const endDate = addMonths(k.startDate, k.durationMonths);
  const editable = canManageBusinessData(user);

  return `
    <div class="card">
      <div class="card-head">
        <div class="row"><button class="icon-btn" onclick="setView('client',{clientId:'${k.clientId}'})">←</button>
          <h2 style="margin:0">${esc(k.label)} <span class="badge ${k.status}">${CONTRACT_STATUS[k.status]}</span></h2></div>
        ${editable && k.status === "active" ? `<div class="row"><button class="btn" onclick="openContractModal('${k.id}')">Modifier</button>
          <button class="btn" onclick="openRenewModal('${k.id}')">Renouveler / remplacer</button>
          <button class="btn danger" onclick="openTerminateModal('${k.id}')">Résilier</button></div>` : ""}
      </div>
      <div class="grid">
        <div><span class="muted small">Client</span><br>${esc(client ? client.name : "—")}</div>
        <div><span class="muted small">Activité</span><br>${esc(ACTIVITIES[k.activity] || k.activity)}</div>
        <div><span class="muted small">Début</span><br>${fmtDate(k.startDate)}</div>
        <div><span class="muted small">Durée / échéance</span><br>${k.durationMonths} mois (fin ${fmtDate(endDate)})</div>
        <div><span class="muted small">Fréquence</span><br>${BILLING_FREQUENCIES[k.billingFrequency]}</div>
        <div><span class="muted small">Prochaine facturation</span><br>${k.status === "active" ? fmtDate(k.nextBillingDate) : "—"}</div>
        <div><span class="muted small">Indexation</span><br>${esc(INDEXATION_MODES[k.indexationMode] || k.indexationMode)}${k.indexationMode === "custom" ? ` (${k.indexationRate}%/an)` : ""}${k.lastIndexationAt ? ` — dernière application ${fmtDate(k.lastIndexationAt)}` : ""}</div>
        ${k.replacesContractId ? `<div><span class="muted small">Remplace</span><br><a href="#" onclick="setView('contract',{contractId:'${k.replacesContractId}'});return false">contrat précédent</a></div>` : ""}
        ${k.replacedByContractId ? `<div><span class="muted small">Remplacé par</span><br><a href="#" onclick="setView('contract',{contractId:'${k.replacedByContractId}'});return false">nouveau contrat</a></div>` : ""}
      </div>
      <h3>Lignes</h3>
      <table><thead><tr><th>Libellé</th><th>Type</th><th class="num">Montant / inclus</th><th class="num">Dépass.</th></tr></thead>
      <tbody>${k.lines.map((l) => l.type === "fixed"
        ? `<tr><td>${esc(l.label)}</td><td>Forfait fixe</td><td class="num">${fmtMoney(l.amountHT)} HT</td><td class="num">—</td></tr>`
        : `<tr><td>${esc(l.label)}</td><td>Compteur ${l.counterType === "bw" ? "N&B" : "Couleur"}</td><td class="num">${l.includedQty} inclus</td><td class="num">${l.overageUnitPrice} € HT/u.</td></tr>`
      ).join("")}</tbody></table>

      <h3>Machines liées</h3>
      <table><thead><tr><th>Référence</th><th>N° série</th><th></th></tr></thead>
      <tbody>${machines.map((m) => `<tr><td>${esc(m.reference)}</td><td>${esc(m.serialNumber)}</td>
        <td>${editable && k.status === "active" ? `<button class="btn small danger" onclick="openDetachModal('${m.id}')">Détacher</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">Aucune machine liée.</td></tr>`}</tbody></table>
      ${editable && k.status === "active" ? `<button class="btn small" onclick="openAttachModal('${k.id}')">+ Lier une machine</button>` : ""}

      ${k.status === "terminated" || k.status === "replaced" ? `<p class="small muted" style="margin-top:10px">${k.status === "replaced" ? "Remplacé" : "Résilié"} le ${fmtDate(k.terminatedAt)}${k.terminationReason ? " — " + esc(k.terminationReason) : ""}
        ${k.terminationInvoiceId ? ` — <a href="#" onclick="setView('invoice',{invoiceId:'${k.terminationInvoiceId}'});return false">${k.status === "replaced" ? "avoir" : "facture de résiliation"}</a>` : ""}</p>` : ""}
    </div>
    <div class="card">
      <h2>Factures du contrat</h2>
      <table><thead><tr><th>Numéro</th><th>Date</th><th>Période</th><th class="num">Total TTC</th><th>Statut</th></tr></thead>
      <tbody>${invoices.map((i) => `<tr class="clickable" onclick="setView('invoice',{invoiceId:'${i.id}'})">
        <td>${esc(i.number)}</td><td>${fmtDate(i.date)}</td><td>${i.periodStart ? fmtDate(i.periodStart) + " → " + fmtDate(i.periodEnd) : "—"}</td>
        <td class="num">${fmtMoney(i.totalTTC)}</td><td><span class="badge ${i.status}">${INVOICE_STATUS[i.status]}</span></td></tr>`).join("") || `<tr><td colspan="5" class="muted">Aucune facture.</td></tr>`}</tbody></table>
    </div>`;
}

function openAttachModal(contractId) {
  const k = Store.contracts.find((x) => x.id === contractId);
  const free = Store.machines.filter((m) => !m.currentContractId && m.activity === k.activity);
  openModal("Lier une machine", `
    <label class="fld"><span>Machine disponible</span>
      <select id="attach-machine-select">
        <option value="">— Choisir —</option>
        ${free.map((m) => `<option value="${m.id}">${esc(m.reference)} — n° série ${esc(m.serialNumber)}</option>`).join("")}
      </select>
    </label>
    <label class="fld"><span>Date d'installation</span><input id="attach-date" type="date" value="${todayISO()}" /></label>
    <p class="small muted">Aucune machine libre pour cette activité ? <a href="#" onclick="closeModal();openMachineModal(null,'${k.activity}');return false">Créer une nouvelle machine</a>, puis revenez la lier ici.</p>
  `, `<button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn primary" onclick="guard(async()=>{
      const mid=document.getElementById('attach-machine-select').value;
      const date=document.getElementById('attach-date').value;
      if(!mid) throw new Error('Choisissez une machine.');
      const m=Store.machines.find(x=>x.id===mid);
      await attachMachineToContract(m,Store.contracts.find(c=>c.id==='${k.id}'),date);
      closeModal(); setView('contract',{contractId:'${k.id}'});
    })">Lier</button>`);
}
function openDetachModal(machineId) {
  const m = Store.machines.find((x) => x.id === machineId);
  openModal("Retirer la machine", `
    <label class="fld"><span>Date de retrait</span><input id="detach-date" type="date" value="${todayISO()}" /></label>
    <label class="fld"><span>Devenir de la machine</span>
      <select id="detach-exit">${Object.entries(MACHINE_EXIT).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
    </label>
    <p class="small muted">Si la machine est reprise pour être revendue, créez ensuite le contrat du nouveau client puis liez-la : les derniers relevés serviront de base au nouveau contrat (historique conservé).</p>
  `, `<button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn danger" onclick="guard(async()=>{
      const date=document.getElementById('detach-date').value;
      const exit=document.getElementById('detach-exit').value;
      const contractId='${m.currentContractId}';
      await detachMachine(Store.machines.find(x=>x.id==='${m.id}'), date, exit);
      const k=Store.contracts.find(c=>c.id===contractId);
      if(k){ k.machineIds=k.machineIds.filter(id=>id!=='${m.id}'); await Store.put('contracts',k); }
      closeModal(); render();
    })">Retirer</button>`);
}

function openTerminateModal(contractId) {
  const k = Store.contracts.find((x) => x.id === contractId);
  const date = todayISO();
  const calc = computeTerminationInvoice(k, date);
  openModal("Résilier le contrat", terminateModalBody(k, date, calc), `
    <button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn danger" onclick="guard(async()=>{
      const date=document.getElementById('term-date').value;
      const reason=document.getElementById('term-reason').value;
      const inv=document.getElementById('term-invoice').checked;
      const invId=await terminateContract(Store.contracts.find(c=>c.id==='${k.id}'), date, reason, inv);
      closeModal();
      if(invId) setView('invoice',{invoiceId:invId}); else setView('contract',{contractId:'${k.id}'});
    })">Confirmer la résiliation</button>`);
}
function terminateModalBody(k, date, calc) {
  return `
    <label class="fld"><span>Date de résiliation</span><input id="term-date" type="date" value="${date}" onchange="updateTerminatePreview('${k.id}')" /></label>
    <label class="fld"><span>Motif</span><textarea id="term-reason" rows="2"></textarea></label>
    <label class="fld chk"><input id="term-invoice" type="checkbox" checked /><span>Générer la facture de résiliation</span></label>
    <div id="term-preview">${terminatePreviewHtml(calc)}</div>`;
}
function terminatePreviewHtml(calc) {
  return `<div class="banner warn" style="margin-top:10px">
    Trimestres restants : <b>${calc.remainingQuarters}</b> (jusqu'au ${fmtDate(calc.endDate)})<br>
    Solde des forfaits : ${calc.remainingQuarters} × ${fmtMoney(calc.quarterlyPackage)} = <b>${fmtMoney(calc.fixedPart)}</b><br>
    Moyenne trimestrielle dépassements (12 mois : ${fmtMoney(calc.avgQ12)} / 6 mois : ${fmtMoney(calc.avgQ6)}) → retenue <b>${fmtMoney(calc.avgOverageQuarterly)}</b> × ${calc.remainingQuarters} = <b>${fmtMoney(calc.variablePart)}</b><br>
    <b>Total facture de résiliation : ${fmtMoney(calc.total)} HT</b>
  </div>`;
}
function updateTerminatePreview(contractId) {
  const k = Store.contracts.find((x) => x.id === contractId);
  const date = document.getElementById("term-date").value;
  document.getElementById("term-preview").innerHTML = terminatePreviewHtml(computeTerminationInvoice(k, date));
}

/* ============================================================
   Renouvellement / remplacement de contrat
   ============================================================ */
function openRenewModal(contractId) {
  const k = Store.contracts.find((x) => x.id === contractId);
  const date = todayISO();
  openModal("Renouveler / remplacer le contrat", renewModalBody(k, date), `
    <button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn primary" onclick="guard(async()=>{
      const date=document.getElementById('renew-date').value;
      const clientId='${k.clientId}';
      const res=await renewContract(Store.contracts.find(c=>c.id==='${k.id}'), date);
      closeModal();
      if(res.avoirInvoiceId){ setView('invoice',{invoiceId:res.avoirInvoiceId}); notify('Avoir généré. Créez maintenant le nouveau contrat.','warn'); }
      openContractModal(null, clientId, { replacesContractId: '${k.id}', startDate: date, activity: '${k.activity}' });
    })">Confirmer et créer le nouveau contrat</button>`);
}
function renewModalBody(k, date) {
  const calc = computeRenewalSettlement(k, date);
  return `
    <label class="fld"><span>Date de bascule (fin de l'ancien contrat / début du nouveau)</span>
      <input id="renew-date" type="date" value="${date}" onchange="updateRenewPreview('${k.id}')" /></label>
    <div id="renew-preview">${renewPreviewHtml(calc)}</div>
    <p class="small muted">Assurez-vous d'avoir saisi un relevé de compteur à jour avant de confirmer (bouton « Compteurs » dans le menu) pour que le complément de dépassement soit exact.</p>`;
}
function renewPreviewHtml(calc) {
  const missing = calc.missingMeters.length ? `<div class="banner error">Relevé manquant pour : ${calc.missingMeters.map((m) => esc(m.line)).join(", ")} — le dépassement ne pourra pas être calculé tant que le relevé n'est pas saisi.</div>` : "";
  if (!calc.lines.length) return missing + `<div class="banner warn">Aucun avoir ni complément à facturer (rien de prépayé au-delà de cette date, aucun dépassement en attente).</div>`;
  return missing + `<div class="banner warn" style="margin-top:10px">
    ${calc.referenceInvoice ? `Jours non consommés sur la facture ${esc(calc.referenceInvoice.number)} : ${calc.unusedDays}/${calc.totalDays}j<br>` : ""}
    ${calc.creditLines.map((l) => `${esc(l.label)} : <b>${fmtMoney(l.amountHT)}</b>`).join("<br>")}
    ${calc.overageLines.length ? "<br>" + calc.overageLines.map((l) => `${esc(l.label)} : <b>${fmtMoney(l.amountHT)}</b>`).join("<br>") : ""}
    <br><b>Solde de l'avoir : ${fmtMoney(calc.totalHT)} HT</b>
  </div>`;
}
function updateRenewPreview(contractId) {
  const k = Store.contracts.find((x) => x.id === contractId);
  const date = document.getElementById("renew-date").value;
  document.getElementById("renew-preview").innerHTML = renewPreviewHtml(computeRenewalSettlement(k, date));
}

/* ============================================================
   Machines
   ============================================================ */
function viewMachines(user) {
  const rows = Store.machines.map((m) => {
    const client = Store.clients.find((c) => c.id === m.currentClientId);
    return `<tr class="clickable" onclick="setView('machine',{machineId:'${m.id}'})">
      <td>${esc(m.reference)}</td><td>${esc(m.serialNumber)}</td><td>${esc(ACTIVITIES[m.activity] || m.activity)}</td>
      <td>${esc(client ? client.name : "—")}</td><td>${m.currentContractId ? "Affectée" : "Libre"}</td></tr>`;
  }).join("");
  return `<div class="card">
    <div class="card-head"><h2>Machines</h2><button class="btn primary" onclick="openMachineModal(null)">+ Machine</button></div>
    <table><thead><tr><th>Référence</th><th>N° série</th><th>Activité</th><th>Client actuel</th><th>Statut</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="muted">Aucune machine.</td></tr>`}</tbody></table>
  </div>`;
}
function openMachineModal(machineId, activity) {
  const m = machineId ? clone(Store.machines.find((x) => x.id === machineId)) : defaultMachine();
  if (activity) m.activity = activity;
  draft = m;
  openModal(machineId ? "Modifier la machine" : "Nouvelle machine", `
    <div class="grid">
      <label class="fld"><span>Référence (modèle)</span><input value="${esc(m.reference)}" oninput="draft.reference=this.value" /></label>
      <label class="fld"><span>Numéro de série</span><input value="${esc(m.serialNumber)}" oninput="draft.serialNumber=this.value" /></label>
      <label class="fld"><span>Activité</span><select onchange="draft.activity=this.value">${Object.entries(ACTIVITIES).map(([v, l]) => `<option value="${v}" ${m.activity === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="fld"><span>Acquisition</span><select onchange="draft.acquisition=this.value">${Object.entries(MACHINE_ACQUISITION).map(([v, l]) => `<option value="${v}" ${m.acquisition === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="fld"><span>Organisme de financement</span><input value="${esc(m.financeOrg)}" oninput="draft.financeOrg=this.value" /></label>
    </div>`, `<button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn primary" onclick="guard(async()=>{ if(!draft.serialNumber.trim()) throw new Error('Numéro de série obligatoire.'); await Store.put('machines',draft); closeModal(); render(); })">Enregistrer</button>`);
}
function viewMachine(user, machineId) {
  const m = Store.machines.find((x) => x.id === machineId);
  if (!m) return `<div class="card">Machine introuvable.</div>`;
  const readings = Store.meterReadings.filter((r) => r.machineId === m.id).slice().sort((a, b) => b.date.localeCompare(a.date));
  return `
    <div class="card">
      <div class="card-head"><div class="row"><button class="icon-btn" onclick="setView('machines')">←</button>
        <h2 style="margin:0">${esc(m.reference)} — ${esc(m.serialNumber)}</h2></div>
        <button class="btn" onclick="openMachineModal('${m.id}')">Modifier</button></div>
      <div class="grid">
        <div><span class="muted small">Activité</span><br>${esc(ACTIVITIES[m.activity] || m.activity)}</div>
        <div><span class="muted small">Acquisition</span><br>${esc(MACHINE_ACQUISITION[m.acquisition] || "")}</div>
        <div><span class="muted small">Client actuel</span><br>${(() => { const c = Store.clients.find((x) => x.id === m.currentClientId); return esc(c ? c.name : "— libre —"); })()}</div>
      </div>
      <h3>Historique</h3>
      <table><thead><tr><th>Client</th><th>Du</th><th>Au</th><th>Événement</th></tr></thead>
      <tbody>${(m.history || []).slice().reverse().map((h) => {
        const c = Store.clients.find((x) => x.id === h.clientId);
        return `<tr><td>${esc(c ? c.name : "—")}</td><td>${fmtDate(h.from)}</td><td>${h.to ? fmtDate(h.to) : "en cours"}</td><td>${esc(MACHINE_EXIT[h.event] || h.event)}</td></tr>`;
      }).join("") || `<tr><td colspan="4" class="muted">Aucun historique.</td></tr>`}</tbody></table>
      <h3>Derniers relevés</h3>
      <table><thead><tr><th>Date</th><th class="num">N&B</th><th class="num">Couleur</th><th>Source</th></tr></thead>
      <tbody>${readings.slice(0, 10).map((r) => `<tr><td>${fmtDate(r.date)}</td><td class="num">${r.bw ?? "—"}</td><td class="num">${r.color ?? "—"}</td><td>${r.source}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">Aucun relevé.</td></tr>`}</tbody></table>
      <button class="btn small" onclick="setView('meters',{meterMachineId:'${m.id}'})">Saisir un relevé</button>
    </div>`;
}

/* ============================================================
   Compteurs — saisie manuelle & import Excel
   ============================================================ */
function viewMeters(user) {
  const machines = Store.machines.slice().sort((a, b) => a.reference.localeCompare(b.reference));
  const selected = UI.meterMachineId || (machines[0] && machines[0].id) || "";
  const readings = Store.meterReadings.filter((r) => r.machineId === selected).slice().sort((a, b) => b.date.localeCompare(a.date));
  return `
    <div class="card">
      <h2>Saisie manuelle</h2>
      <form onsubmit="return submitMeterReading(event)">
        <div class="grid">
          <label class="fld"><span>Machine</span>
            <select name="machineId" onchange="UI.meterMachineId=this.value;render()">
              ${machines.map((m) => `<option value="${m.id}" ${selected === m.id ? "selected" : ""}>${esc(m.reference)} — ${esc(m.serialNumber)}</option>`).join("")}
            </select>
          </label>
          <label class="fld"><span>Date du relevé</span><input type="date" name="date" value="${todayISO()}" required /></label>
          <label class="fld"><span>Compteur N&B</span><input type="number" name="bw" step="1" /></label>
          <label class="fld"><span>Compteur couleur</span><input type="number" name="color" step="1" /></label>
        </div>
        <div class="row" style="margin-top:10px"><button class="btn primary" type="submit">Enregistrer le relevé</button></div>
      </form>
      <h3>Historique de la machine sélectionnée</h3>
      <table><thead><tr><th>Date</th><th class="num">N&B</th><th class="num">Couleur</th><th>Source</th></tr></thead>
      <tbody>${readings.map((r) => `<tr><td>${fmtDate(r.date)}</td><td class="num">${r.bw ?? "—"}</td><td class="num">${r.color ?? "—"}</td><td>${r.source}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">Aucun relevé.</td></tr>`}</tbody></table>
    </div>
    <div class="card">
      <h2>Import Excel</h2>
      <p class="small muted">Colonnes attendues (ordre libre) : numéro de série (ou référence), date, compteur N&B, compteur couleur.</p>
      <input type="file" id="meter-file" accept=".xlsx" onchange="handleMeterFile(this)" />
      <div id="meter-import-preview"></div>
    </div>`;
}
async function submitMeterReading(ev) {
  ev.preventDefault();
  const f = ev.target;
  await guard(async () => {
    await saveMeterReading(f.machineId.value, f.date.value, f.bw.value, f.color.value, "manual", getCurrentUser().id);
    UI.meterMachineId = f.machineId.value;
    notify("Relevé enregistré.", "warn");
    render();
  });
  return false;
}
async function handleMeterFile(input) {
  if (!input.files[0]) return;
  await guard(async () => {
    const rows = await parseMetersExcel(input.files[0]);
    window.__meterImportRows = rows;
    document.getElementById("meter-import-preview").innerHTML = meterImportPreviewHtml(rows);
  });
}
function meterImportPreviewHtml(rows) {
  const okCount = rows.filter((r) => r.status === "ok").length;
  return `
    <table><thead><tr><th>Ligne</th><th>Machine</th><th>Date</th><th class="num">N&B</th><th class="num">Couleur</th><th>Statut</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${r.row}</td><td>${esc(r.serial || r.ref)}</td><td>${fmtDate(r.date)}</td>
      <td class="num">${r.bw ?? "—"}</td><td class="num">${r.color ?? "—"}</td>
      <td>${r.status === "ok" ? `<span class="badge active">OK</span>` : `<span class="badge unpaid" title="${esc(r.error)}">${esc(r.error)}</span>`}</td></tr>`).join("")}</tbody></table>
    <button class="btn primary" style="margin-top:8px" onclick="guard(async()=>{
      const res=await commitImportedMeters(window.__meterImportRows, getCurrentUser().id);
      notify(res.ok+' relevé(s) importé(s), '+res.failed+' rejeté(s).','warn');
      document.getElementById('meter-import-preview').innerHTML=meterImportPreviewHtml(window.__meterImportRows);
    })">Confirmer l'import (${okCount} ligne(s) valide(s))</button>`;
}

/* ============================================================
   Facturation — liste des clients à facturer à la date choisie
   ============================================================ */
function viewBilling(user) {
  const date = UI.billingDate || lastBusinessDayOfMonth(todayISO());
  const due = contractsDueForRun(date);
  const rows = due.map((k) => {
    const client = Store.clients.find((c) => c.id === k.clientId);
    const p = previewContractInvoiceForDisplay(k, date);
    return { k, client, p };
  });
  const total = rows.reduce((s, r) => s + r.p.totalTTC, 0);
  return `
    <div class="card">
      <div class="card-head"><h2>Clients à facturer</h2>
        <div class="row"><label class="fld" style="flex-direction:row;align-items:center;gap:6px"><span>Date de facturation</span>
          <input type="date" value="${date}" onchange="UI.billingDate=this.value;render()" /></label></div>
      </div>
      <p class="muted small">Contrats dont l'échéance est arrivée au ${fmtDate(date)} (forfait de la période à venir + dépassement de la période précédente, calculé à partir des relevés saisis). La première facture d'un contrat inclut automatiquement le prorata d'installation.</p>
      <table><thead><tr><th><input type="checkbox" onchange="document.querySelectorAll('.bill-chk').forEach(c=>c.checked=this.checked)" /></th>
        <th>Client</th><th>Contrat</th><th>Période</th><th class="num">Total TTC</th><th>Compteurs</th></tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td><input type="checkbox" class="bill-chk" value="${r.k.id}" checked /></td>
        <td>${esc(r.client ? r.client.name : "—")}</td><td>${esc(r.k.label)} ${r.p.indexationDue ? `<span class="badge active" title="Augmentation annuelle appliquée à cette facturation">🔺 indexé</span>` : ""}</td>
        <td>${fmtDate(r.p.periodStart)} → ${fmtDate(r.p.periodEnd)}</td>
        <td class="num">${fmtMoney(r.p.totalTTC)}</td>
        <td>${r.p.missingMeters.length ? `<span class="badge unpaid" title="Relevé manquant">⚠ manquant</span>` : `<span class="badge active">OK</span>`}</td>
      </tr>`).join("") || `<tr><td colspan="6" class="muted">Aucune échéance à cette date.</td></tr>`}</tbody></table>
      ${rows.length ? `<div class="row between" style="margin-top:12px">
        <b>Total estimé : ${fmtMoney(total)}</b>
        <button class="btn primary" onclick="guard(()=>runBilling('${date}'))">Générer les factures cochées</button>
      </div>` : ""}
    </div>`;
}
async function runBilling(date) {
  const ids = [...document.querySelectorAll(".bill-chk:checked")].map((c) => c.value);
  let ok = 0;
  for (const id of ids) {
    const k = Store.contracts.find((x) => x.id === id);
    if (k) { await generateContractInvoice(k, date, getCurrentUser().id); ok++; }
  }
  notify(`${ok} facture(s) générée(s).`, "warn");
  setView("invoices", { invFrom: date, invTo: date });
}

/* ============================================================
   Factures
   ============================================================ */
function viewInvoices(user) {
  let list = Store.invoices.slice();
  if (UI.invFrom) list = list.filter((i) => i.date >= UI.invFrom);
  if (UI.invTo) list = list.filter((i) => i.date <= UI.invTo);
  if (UI.invStatus) list = list.filter((i) => i.status === UI.invStatus);
  list.sort((a, b) => b.date.localeCompare(a.date));
  return `
    <div class="card">
      <div class="card-head"><h2>Factures</h2>
        <div class="row">
          <input type="date" value="${UI.invFrom}" onchange="UI.invFrom=this.value;render()" />
          <input type="date" value="${UI.invTo}" onchange="UI.invTo=this.value;render()" />
          <select onchange="UI.invStatus=this.value;render()">
            <option value="">Tous statuts</option>
            ${Object.entries(INVOICE_STATUS).map(([v, l]) => `<option value="${v}" ${UI.invStatus === v ? "selected" : ""}>${l}</option>`).join("")}
          </select>
        </div>
      </div>
      <table><thead><tr><th>Numéro</th><th>Date</th><th>Client</th><th class="num">Total TTC</th><th>Statut</th></tr></thead>
      <tbody>${list.map((i) => { const c = Store.clients.find((x) => x.id === i.clientId); return `<tr class="clickable" onclick="setView('invoice',{invoiceId:'${i.id}'})">
        <td>${esc(i.number)}</td><td>${fmtDate(i.date)}</td><td>${esc(c ? c.name : "—")}</td>
        <td class="num">${fmtMoney(i.totalTTC)}</td><td><span class="badge ${i.status}">${INVOICE_STATUS[i.status]}</span></td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">Aucune facture.</td></tr>`}</tbody></table>
    </div>`;
}
function viewInvoice(user, invoiceId) {
  const i = Store.invoices.find((x) => x.id === invoiceId);
  if (!i) return `<div class="card">Facture introuvable.</div>`;
  const client = Store.clients.find((c) => c.id === i.clientId);
  const contract = Store.contracts.find((c) => c.id === i.contractId);
  return `
    <div class="card">
      <div class="card-head"><div class="row"><button class="icon-btn" onclick="setView('invoices')">←</button>
        <h2 style="margin:0">${esc(i.number)} <span class="badge ${i.status}">${INVOICE_STATUS[i.status]}</span>${i.type !== "period" ? ` <span class="badge draft">${invoiceTypeLabel(i.type)}</span>` : ""}</h2></div>
        <button class="btn" onclick="printInvoice('${i.id}')">Imprimer / PDF</button></div>
      <div class="grid">
        <div><span class="muted small">Client</span><br><a href="#" onclick="setView('client',{clientId:'${i.clientId}'});return false">${esc(client ? client.name : "—")}</a></div>
        <div><span class="muted small">Contrat</span><br>${contract ? `<a href="#" onclick="setView('contract',{contractId:'${contract.id}'});return false">${esc(contract.label)}</a>` : "—"}</div>
        <div><span class="muted small">Date</span><br>${fmtDate(i.date)}</div>
        <div><span class="muted small">Période</span><br>${i.periodStart ? fmtDate(i.periodStart) + " → " + fmtDate(i.periodEnd) : "—"}</div>
      </div>
      <table style="margin-top:10px"><thead><tr><th>Libellé</th><th class="num">Qté</th><th class="num">PU HT</th><th class="num">Montant HT</th><th class="num">TVA</th></tr></thead>
      <tbody>${i.lines.map((l) => `<tr><td>${esc(l.label)}</td><td class="num">${l.qty}</td><td class="num">${l.unitPrice}</td><td class="num">${fmtMoney(l.amountHT)}</td><td class="num">${l.vatRate}%</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="3"></td><td class="num"><b>${fmtMoney(i.totalHT)}</b></td><td class="num">${fmtMoney(i.totalVAT)}</td></tr>
      <tr><td colspan="3"></td><td colspan="2" class="num"><b>Total TTC : ${fmtMoney(i.totalTTC)}</b></td></tr></tfoot></table>

      <h3>Statut & envoi</h3>
      <div class="row">
        <button class="btn" onclick="guard(()=>markInvoice('${i.id}','sent','email'))">Marquer envoyée par email</button>
        ${client && client.email ? "" : ""}
        ${client && client.chorusPro ? `<button class="btn" onclick="guard(()=>markInvoice('${i.id}','chorus','chorus_pro'))">Marquer déposée sur Chorus Pro</button>` : ""}
        <button class="btn" onclick="guard(()=>markInvoice('${i.id}','paid'))">Marquer soldée</button>
        <button class="btn danger" onclick="guard(()=>markInvoice('${i.id}','unpaid'))">Marquer non soldée (impayé)</button>
      </div>
      ${i.status === "unpaid" ? `
      <h3>Relances</h3>
      <div class="row">
        ${[1, 2, 3].map((lvl) => `<button class="btn small ${i.dunningLevel === lvl ? "primary" : ""}" onclick="guard(()=>doDunning('${i.id}',${lvl}))">Relance ${lvl}</button>`).join("")}
      </div>
      <ul class="small muted">${(i.dunningHistory || []).map((h) => `<li>Relance ${h.level} le ${fmtDate(h.date)}</li>`).join("")}</ul>` : ""}
      <p class="small muted" style="margin-top:10px">L'envoi par email ouvre votre messagerie avec le message pré-rempli ; joignez le PDF généré via « Imprimer / PDF ». Le dépôt Chorus Pro reste à faire manuellement sur le portail (marquage ici pour le suivi).</p>
    </div>`;
}
async function doDunning(invoiceId, level) {
  const i = Store.invoices.find((x) => x.id === invoiceId);
  await recordDunning(i, level, getCurrentUser().id);
  render();
}
async function markInvoice(invoiceId, status, sentMethod) {
  const i = Store.invoices.find((x) => x.id === invoiceId);
  i.status = status;
  if (sentMethod) { i.sentMethod = sentMethod; i.sentAt = todayISO(); }
  await Store.put("invoices", i);
  if (sentMethod === "email") {
    const client = Store.clients.find((c) => c.id === i.clientId);
    const email = client && client.contacts.find((c) => c.email)?.email;
    if (email) window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Facture " + i.number + " — Levad")}&body=${encodeURIComponent("Bonjour,\n\nVeuillez trouver ci-joint votre facture " + i.number + " d'un montant de " + i.totalTTC.toFixed(2) + " € TTC.\n\nCordialement,\nLevad")}`;
  }
  render();
}
function printInvoice(invoiceId) {
  const i = Store.invoices.find((x) => x.id === invoiceId);
  const client = Store.clients.find((c) => c.id === i.clientId);
  const company = Store.companySettings();
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>${esc(i.number)}</title><style>
    body{font:14px/1.5 system-ui,sans-serif;color:#111;padding:30px} table{width:100%;border-collapse:collapse;margin-top:14px}
    th,td{border-bottom:1px solid #ccc;padding:6px 8px;text-align:left} th.num,td.num{text-align:right}
    h1{font-size:20px} .muted{color:#666}</style></head><body>
    <h1>${esc(company.name)}</h1>
    <p class="muted">${esc(company.address.line1)} ${esc(company.address.zip)} ${esc(company.address.city)}${company.siret ? " — SIRET " + esc(company.siret) : ""}</p>
    <h2>Facture ${esc(i.number)} — ${fmtDate(i.date)}</h2>
    <p><b>${esc(client ? client.name : "")}</b><br>${esc(client ? client.address.line1 : "")}<br>${esc(client ? client.address.zip : "")} ${esc(client ? client.address.city : "")}</p>
    <table><thead><tr><th>Libellé</th><th class="num">Qté</th><th class="num">PU HT</th><th class="num">Montant HT</th><th class="num">TVA</th></tr></thead>
    <tbody>${i.lines.map((l) => `<tr><td>${esc(l.label)}</td><td class="num">${l.qty}</td><td class="num">${l.unitPrice}</td><td class="num">${l.amountHT.toFixed(2)} €</td><td class="num">${l.vatRate}%</td></tr>`).join("")}</tbody></table>
    <p style="text-align:right;margin-top:10px">Total HT : ${i.totalHT.toFixed(2)} € — TVA : ${i.totalVAT.toFixed(2)} € <br><b>Total TTC : ${i.totalTTC.toFixed(2)} €</b></p>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}

/* ============================================================
   Prélèvements SEPA
   ============================================================ */
function viewSepa(user) {
  const eligible = Store.invoices.filter((i) => !i.sepaBatchId && (i.status === "sent" || i.status === "unpaid") && i.paymentMethod === "sepa" && i.type !== "avoir" && i.totalTTC > 0);
  const rows = sepaEligibleInvoices(eligible.map((i) => i.id));
  return `
    <div class="card">
      <div class="card-head"><h2>Créer une remise de prélèvement</h2>
        <label class="fld" style="flex-direction:row;align-items:center;gap:6px"><span>Date de prélèvement</span><input id="sepa-date" type="date" value="${addDays(todayISO(), 5)}" /></label>
      </div>
      <table><thead><tr><th><input type="checkbox" onchange="document.querySelectorAll('.sepa-chk').forEach(c=>{if(!c.disabled)c.checked=this.checked})" /></th>
        <th>Facture</th><th>Client</th><th class="num">Montant</th><th>Statut</th></tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td><input type="checkbox" class="sepa-chk" value="${r.invoice.id}" ${r.problems.length ? "disabled" : "checked"} /></td>
        <td>${esc(r.invoice.number)}</td><td>${esc(r.client ? r.client.name : "—")}</td>
        <td class="num">${fmtMoney(r.invoice.totalTTC)}</td>
        <td>${r.problems.length ? `<span class="badge unpaid">${esc(r.problems.join(", "))}</span>` : `<span class="badge active">Prêt</span>`}</td>
      </tr>`).join("") || `<tr><td colspan="5" class="muted">Aucune facture en attente de prélèvement.</td></tr>`}</tbody></table>
      ${rows.length ? `<button class="btn primary" style="margin-top:10px" onclick="guard(createBatchFromSelection)">Créer la remise</button>` : ""}
    </div>
    <div class="card">
      <h2>Remises effectuées</h2>
      <table><thead><tr><th>N° remise</th><th>Date</th><th>Nb factures</th><th class="num">Montant</th><th></th></tr></thead>
      <tbody>${Store.sepaBatches.slice().sort((a, b) => b.numeroRemise - a.numeroRemise).map((b) => `<tr>
        <td>${b.numeroRemise}</td><td>${fmtDate(b.date)}</td><td>${b.invoiceIds.length}</td><td class="num">${fmtMoney(b.totalAmount)}</td>
        <td><button class="btn small" onclick="downloadSepaXml(Store.sepaBatches.find(x=>x.id==='${b.id}'))">Télécharger XML</button></td>
      </tr>`).join("") || `<tr><td colspan="5" class="muted">Aucune remise.</td></tr>`}</tbody></table>
    </div>`;
}
async function createBatchFromSelection() {
  const date = document.getElementById("sepa-date").value;
  const ids = [...document.querySelectorAll(".sepa-chk:checked")].map((c) => c.value);
  if (!ids.length) throw new Error("Sélectionnez au moins une facture.");
  const batch = await createSepaBatch(date, ids);
  notify(`Remise n°${batch.numeroRemise} créée (${fmtMoney(batch.totalAmount)}).`, "warn");
  downloadSepaXml(batch);
  render();
}

/* ============================================================
   Exports comptables
   ============================================================ */
function viewExports(user) {
  return `<div class="card">
    <h2>Exports pour la comptabilité</h2>
    <div class="row"><button class="btn" onclick="exportClientsCsv()">Exporter la liste des clients (CSV)</button></div>
    <h3>Factures</h3>
    <div class="row">
      <input type="date" id="exp-from" /> <input type="date" id="exp-to" />
      <button class="btn" onclick="exportInvoicesCsv(document.getElementById('exp-from').value, document.getElementById('exp-to').value)">Exporter les factures (CSV)</button>
    </div>
    <h3>Prélèvements SEPA</h3>
    <div class="row"><button class="btn" onclick="exportSepaBatchesCsv()">Exporter les remises (CSV)</button></div>
  </div>`;
}

/* ============================================================
   Utilisateurs (admin)
   ============================================================ */
function viewUsers(user) {
  return `<div class="card">
    <div class="card-head"><h2>Utilisateurs</h2><button class="btn primary" onclick="openUserModal(null)">+ Utilisateur</button></div>
    <table><thead><tr><th>Nom</th><th>Identifiant</th><th>Rôle</th><th></th></tr></thead>
    <tbody>${Store.users.map((u) => `<tr>
      <td>${esc(u.name)}</td><td>${esc(u.username)}</td><td>${esc(ROLE_LABELS[u.role] || u.role)}</td>
      <td class="row"><button class="btn small" onclick="openUserModal('${u.id}')">Modifier</button>
      <button class="btn small" onclick="guard(async()=>{const pw=prompt('Nouveau mot de passe :');if(pw){await resetUserPassword('${u.id}',pw);notify('Mot de passe réinitialisé.','warn');}})">Réinit. mdp</button>
      ${u.id !== getCurrentUser().id ? `<button class="btn small danger" onclick="guard(async()=>{if(confirm('Supprimer '+${JSON.stringify(u.name)}+' ?')){await deleteUser('${u.id}');render();}})">Supprimer</button>` : ""}
      </td></tr>`).join("")}</tbody></table>
  </div>`;
}
function openUserModal(userId) {
  const u = userId ? clone(Store.users.find((x) => x.id === userId)) : { username: "", name: "", role: ROLES.COMMERCIAL, phone: "", email: "", password: "" };
  draft = u;
  openModal(userId ? "Modifier l'utilisateur" : "Nouvel utilisateur", `
    <div class="grid">
      <label class="fld"><span>Identifiant</span><input value="${esc(u.username)}" oninput="draft.username=this.value" ${userId ? "disabled" : ""} /></label>
      <label class="fld"><span>Nom</span><input value="${esc(u.name)}" oninput="draft.name=this.value" /></label>
      <label class="fld"><span>Rôle</span><select onchange="draft.role=this.value">${Object.entries(ROLE_LABELS).map(([v, l]) => `<option value="${v}" ${u.role === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="fld"><span>Téléphone</span><input value="${esc(u.phone)}" oninput="draft.phone=this.value" /></label>
      <label class="fld"><span>Email</span><input value="${esc(u.email)}" oninput="draft.email=this.value" /></label>
      ${!userId ? `<label class="fld"><span>Mot de passe initial</span><input type="text" oninput="draft.password=this.value" /></label>` : ""}
    </div>`, `<button class="btn" onclick="closeModal()">Annuler</button>
    <button class="btn primary" onclick="guard(async()=>{
      if('${userId || ""}') await updateUserProfile('${userId}',{name:draft.name,role:draft.role,phone:draft.phone,email:draft.email});
      else await createUser(draft);
      closeModal(); render();
    })">Enregistrer</button>`);
}

/* ============================================================
   Paramètres société
   ============================================================ */
function viewSettings(user) {
  if (!draft || draft.id !== "company") draft = clone(Store.companySettings());
  const s = draft;
  return `<div class="card">
    <h2>Paramètres société</h2>
    <div class="grid">
      <label class="fld"><span>Nom</span><input value="${esc(s.name)}" oninput="draft.name=this.value" /></label>
      <label class="fld"><span>SIRET</span><input value="${esc(s.siret)}" oninput="draft.siret=this.value" /></label>
      <label class="fld"><span>Adresse</span><input value="${esc(s.address.line1)}" oninput="draft.address.line1=this.value" /></label>
      <label class="fld"><span>Code postal</span><input value="${esc(s.address.zip)}" oninput="draft.address.zip=this.value" /></label>
      <label class="fld"><span>Ville</span><input value="${esc(s.address.city)}" oninput="draft.address.city=this.value" /></label>
      <label class="fld"><span>Préfixe n° de facture</span><input value="${esc(s.invoicePrefix)}" oninput="draft.invoicePrefix=this.value" /></label>
      <label class="fld"><span>ICS (identifiant créancier SEPA)</span><input value="${esc(s.ics)}" oninput="draft.ics=this.value" /></label>
      <label class="fld"><span>IBAN société</span><input value="${esc(s.iban)}" oninput="draft.iban=this.value" /></label>
      <label class="fld"><span>BIC société</span><input value="${esc(s.bic)}" oninput="draft.bic=this.value" /></label>
      <label class="fld"><span>Indexation annuelle par défaut (% / an)</span><input type="number" step="0.1" value="${s.defaultIndexationRate}" oninput="draft.defaultIndexationRate=Number(this.value)" /></label>
    </div>
    <p class="small muted">S'applique à tous les contrats à leur date anniversaire, sauf ceux réglés en « jamais » ou en taux personnalisé sur leur fiche.</p>
    <button class="btn primary" style="margin-top:10px" onclick="guard(async()=>{await Store.put('settings',draft);notify('Paramètres enregistrés.','warn');render();})">Enregistrer</button>
  </div>`;
}

boot();
