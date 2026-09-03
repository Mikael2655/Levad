/* Utilitaires partagés : téléchargement, nom de fichier, stockage. */

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function slugify(s) {
  return (s || "client").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "client";
}

function fileName(state, ext) {
  const d = (state.client.date || todayISO()).replace(/-/g, "");
  return `Proposition_${slugify(state.client.name)}_${d}.${ext}`;
}

/* --- Persistance locale --- */
function saveState(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}
/* Fusion défensive d'un état chargé avec les valeurs par défaut (schéma évolutif). */
function normalizeState(s) {
  const base = defaultState();
  return {
    ...base, ...s,
    client: { ...base.client, ...(s.client || {}) },
    company: { ...base.company, ...(s.company || {}) },
    machines: Array.isArray(s.machines) && s.machines.length
      ? s.machines.map((m) => {
          const mm = { ...defaultMachine(), ...m };
          if (!Array.isArray(mm.services) || !mm.services.length) mm.services = defaultServices();
          return mm;
        })
      : base.machines,
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch (e) { return defaultState(); }
}

/* ------ Simulations enregistrées (nommées) ------ */
const SAVES_KEY = "levad_saved_sims_v1";
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY)) || []; } catch (e) { return []; }
}
function writeSaved(list) {
  try { localStorage.setItem(SAVES_KEY, JSON.stringify(list)); } catch (e) {}
}
