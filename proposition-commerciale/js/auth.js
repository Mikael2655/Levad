/* ============================================================
   Comptes utilisateurs & simulations (stockage local).
   ⚠️ Séparation « de confort » : les données restent dans le
   navigateur de chaque poste (pas de serveur). Pour un partage
   entre appareils, il faudrait un back-end.
   ============================================================ */

const USERS_KEY = "levad_users_v1";
const CURRENT_KEY = "levad_current_user_v1";
const SIMS_KEY = "levad_sims_v1";

async function sha256(str) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function loadUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; } }
function writeUsers(u) { try { localStorage.setItem(USERS_KEY, JSON.stringify(u)); } catch (e) {} }
function findUserByName(username) {
  const u = String(username || "").trim().toLowerCase();
  return loadUsers().find((x) => x.username.toLowerCase() === u);
}
function getUserById(id) { return loadUsers().find((x) => x.id === id); }

/* Crée l'administrateur (Mikael) au premier lancement. */
async function initAuth() {
  if (loadUsers().length) return;
  writeUsers([{
    id: cryptoId(), username: "Mikael", name: "Mikael", title: "",
    phone: "01 70 72 19 40", mobile: "", email: "", isAdmin: true,
    passHash: await sha256("231912"),
  }]);
}

function currentUserId() { return localStorage.getItem(CURRENT_KEY) || ""; }
function setCurrentUserId(id) { if (id) localStorage.setItem(CURRENT_KEY, id); else localStorage.removeItem(CURRENT_KEY); }
function getCurrentUser() { const id = currentUserId(); return id ? getUserById(id) : null; }

async function tryLogin(username, password) {
  const u = findUserByName(username); if (!u) return null;
  if ((await sha256(password || "")) !== u.passHash) return null;
  setCurrentUserId(u.id); return u;
}
function logout() { setCurrentUserId(""); }

/* --- Administration des comptes (réservé à l'admin) --- */
async function createUser(d) {
  if (!d.username || !d.username.trim()) throw new Error("Identifiant obligatoire.");
  if (findUserByName(d.username)) throw new Error("Cet identifiant existe déjà.");
  const users = loadUsers();
  users.push({
    id: cryptoId(), username: d.username.trim(), name: d.name || d.username.trim(),
    title: d.title || "", phone: d.phone || "", mobile: d.mobile || "", email: d.email || "",
    isAdmin: !!d.isAdmin, passHash: await sha256(d.password || "levad"),
  });
  writeUsers(users);
}
function deleteUser(id) { writeUsers(loadUsers().filter((u) => u.id !== id)); }
async function resetUserPassword(id, pw) {
  const users = loadUsers(); const u = users.find((x) => x.id === id);
  if (u) { u.passHash = await sha256(pw || ""); writeUsers(users); }
}
function updateUserProfile(id, patch) {
  const users = loadUsers(); const u = users.find((x) => x.id === id);
  if (u) { Object.assign(u, patch); writeUsers(users); }
}

/* --- Simulations enregistrées --- */
function loadSims() { try { return JSON.parse(localStorage.getItem(SIMS_KEY)) || []; } catch (e) { return []; } }
function writeSims(l) { try { localStorage.setItem(SIMS_KEY, JSON.stringify(l)); } catch (e) {} }

/* --- Brouillon en cours (par utilisateur) --- */
function draftKey(uid) { return "levad_draft_" + uid; }
