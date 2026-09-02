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
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    // fusion défensive avec les valeurs par défaut (schéma évolutif)
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
  } catch (e) { return defaultState(); }
}
