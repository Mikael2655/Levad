/* ============================================================
   Comptes utilisateurs, connexion, permissions par rôle.
   ============================================================ */

const CURRENT_KEY = "levad_gestion_current_user_v1";

function findUserByName(username) {
  const u = normStr(username);
  return Store.users.find((x) => normStr(x.username) === u);
}
function getUserById(id) { return Store.users.find((x) => x.id === id); }

async function initAuth() {
  if (Store.users.length) return;
  const admin = defaultUser();
  admin.username = "admin"; admin.name = "Administrateur";
  admin.role = ROLES.ADMIN;
  admin.passHash = await sha256(DEFAULT_ADMIN_PASSWORD);
  await Store.put("users", admin);
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

async function createUser(d) {
  if (!d.username || !d.username.trim()) throw new Error("Identifiant obligatoire.");
  if (findUserByName(d.username)) throw new Error("Cet identifiant existe déjà.");
  const u = defaultUser();
  Object.assign(u, {
    username: d.username.trim(), name: d.name || d.username.trim(), role: d.role || ROLES.COMMERCIAL,
    phone: d.phone || "", email: d.email || "",
  });
  u.passHash = await sha256(d.password || "levad");
  await Store.put("users", u);
  return u;
}
async function deleteUser(id) { await Store.remove("users", id); }
async function resetUserPassword(id, pw) {
  const u = getUserById(id); if (!u) return;
  u.passHash = await sha256(pw || ""); await Store.put("users", u);
}
async function updateUserProfile(id, patch) {
  const u = getUserById(id); if (!u) return;
  Object.assign(u, patch); await Store.put("users", u);
}

/* --- Permissions --- */
function isAdmin(u) { return u && u.role === ROLES.ADMIN; }
function isCompta(u) { return u && (u.role === ROLES.COMPTA || u.role === ROLES.ADMIN); }
function isCommercial(u) { return u && u.role === ROLES.COMMERCIAL; }

/* L'administratif/comptable gère tout le métier sauf les comptes utilisateurs.
   Le commercial est en lecture sur SA base clients (client + prospects dont il
   est l'attitré), peut créer des prospects, mais jamais de client ni de contrat. */
function canManageUsers(u) { return isAdmin(u); }
function canManageBusinessData(u) { return isCompta(u); }  // clients, contrats, compteurs, factures, résiliations, prélèvements
function canCreateProspect(u) { return isCompta(u) || isCommercial(u); }
function canCreateClient(u) { return isCompta(u); }
function canConvertProspect(u) { return isCompta(u); }

/* Clients visibles par l'utilisateur courant. */
function visibleClients(u) {
  if (!u) return [];
  if (isCompta(u)) return Store.clients;
  return Store.clients.filter((c) => c.commercialId === u.id);
}
