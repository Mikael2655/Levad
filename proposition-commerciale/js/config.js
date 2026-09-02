/* ============================================================
   Configuration & valeurs par défaut
   ------------------------------------------------------------
   Tout est stocké côté navigateur (localStorage). Rien n'est
   envoyé sur un serveur. Les coefficients de leasing (le
   « markup » commercial) ne sont modifiables qu'en mode admin.
   ============================================================ */

const STORE_KEY = "levad_proposition_v1";
const ADMIN_KEY = "levad_proposition_admin_v1";

/* Coefficients de leasing par durée (en années).
   Le loyer proposé = (rachat + cadeaux + prix machine + livraison
   + installation + marge) × coefficient ÷ 100, par trimestre.
   Valeurs « commerciales » par défaut ; l'admin peut les régler
   (ex. 5 ans à 5,75 pour le « vrai taux »). */
const DEFAULT_COEFFS = { 3: 9.7, 4: 7.5, 5: 6.05 };

/* Mot de passe admin par défaut (modifiable une fois déverrouillé).
   ⚠️ Sécurité « de confort » : le gabarit reste côté client, ceci
   empêche seulement une modification accidentelle des coefficients. */
const DEFAULT_ADMIN_PASSWORD = "levad";

/* Coordonnées commerciales / société par défaut. */
const DEFAULT_COMPANY = {
  repName: "Betty Diop",
  repTitle: "Ingénieure Commerciale",
  repEmail: "bdiop@levad.fr",
  repPhone: "01.70.72.19.40",
};

/* Valeurs par défaut d'une machine (une ligne = un remplacement :
   une machine actuelle -> une machine proposée). */
function defaultMachine() {
  return {
    id: cryptoId(),
    // --- Situation actuelle ---
    currentModel: "",
    prospect: false,        // true = prospect (pas de contrat à racheter)
    loyerActuel: 0,         // loyer trimestriel actuel (€)
    maintMoyenne: 0,        // maintenance moyenne trimestrielle (€)
    trimRestants: 0,        // trimestres restants sur le contrat actuel
    // volumes & coûts actuels
    forfaitNB: 0,           // forfait volume N&B (pages/trim)
    depassNB: 0,            // dépassement N&B (pages)
    volNBreel: 0,           // volume N&B réel (pages/trim)
    ccNBactuel: 0,          // coût copie N&B actuel (€)
    forfaitCoul: 0,
    depassCoul: 0,
    volCoulReel: 0,
    ccCoulActuel: 0,
    // services actuels (€ / trim)
    passActuel: 0,
    tasActuel: 0,
    emaintActuel: 0,
    scanMailActuel: 0,
    recyclageActuel: 0,
    forfaitEurNBactuel: 0,  // forfait fixe N&B en € (souvent 0)
    forfaitEurCoulActuel: 0,
    // --- Solution proposée ---
    proposedModel: "",
    cadeaux: 0,             // remises/cadeaux (€, valeur négative en déduction)
    prixMachine: 0,
    livraison: 0,
    installation: 0,
    marge: 0,               // marge commerciale (€)
    ccNBpropose: 0,         // nouveau coût copie N&B (€)
    ccCoulPropose: 0,
    passPropose: 0,
    tasPropose: 0,
    emaintPropose: 0,
    scanMailPropose: 0,
    recyclagePropose: 0,
    forfaitEurNBpropose: 0,
    forfaitEurCoulPropose: 0,
  };
}

function defaultState() {
  return {
    client: {
      name: "",
      contact: "",
      addr1: "",
      addr2: "",
      date: todayISO(),
    },
    company: { ...DEFAULT_COMPANY },
    durationYears: 5,
    coeffs: { ...DEFAULT_COEFFS },
    machines: [defaultMachine()],
  };
}

function cryptoId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "m" + Math.random().toString(36).slice(2, 10);
}

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
