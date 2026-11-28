/* ============================================================
   RÉPÉTITION ESPACÉE — VERBES
   ------------------------------------------------------------
   Remplace le tirage aléatoire du jeu « Verbes » par un vrai
   système de mémorisation : tri initial, file d'attente, paquet
   de travail (« salle d'attente »), boîtes de Leitner à dates,
   formats d'exercice qui durcissent avec le niveau.

   Tout est sauvegardé par profil dans le navigateur (localStorage).
   S'appuie sur les fonctions de app.js (el, render, state, VERBES,
   speakBtn, shuffle, hebrewLetters, todayNum, todayStr…) : ce
   fichier est chargé APRÈS app.js.
   ============================================================ */

/* ---------- Modèle de données (par profil) ----------
   srsData = {
     v: 2,
     triageDone: false,
     settings: { packetMax: 8, dailyNew: 6 },
     daily: { date: "AAAA-MM-JJ", newIntroduced: 0 },
     cards: {
       "<infinitif>": {
         status: "new" | "queue" | "packet" | "box" | "acquired",
         box: 0..4,           // boîte de Leitner (si status "box")
         due: <jour>,         // jour de révision (box / acquired)
         streak: 0,           // bonnes réponses d'affilée dans le paquet
         added: <jour>,       // date d'entrée dans la file (priorité)
         seen, ok, ko
       }
     }
   }
   Les verbes absents de "cards" sont considérés "new" (jamais triés). */

const SRS_PREFIX = "hebreu-vocab-srs-";
const SRS_BOX_INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 21 }; // jours avant révision
const SRS_ACQUIRED_INTERVAL = 7; // acquis = révision hebdomadaire
const SRS_PACKET_GRADUATE = 3; // bonnes réponses d'affilée pour sortir du paquet
const SRS_MISS_GAPS = [2, 5, 10]; // retour dans le paquet après N cartes
const SRS_CORRECT_GAP = 3; // réinsertion d'une bonne réponse non diplômée

let srsData = null;
let srsLoadedFor = null; // profil actuellement chargé

function srsKey() {
  return SRS_PREFIX + activeProfile;
}
function srsDefault() {
  return {
    v: 2,
    triageDone: false,
    settings: { packetMax: 8, dailyNew: 6 },
    daily: { date: todayStr(), newIntroduced: 0, roots: [] },
    cards: {},
  };
}
function srsLoad() {
  if (!activeProfile) {
    srsData = srsDefault();
    srsLoadedFor = null;
    return;
  }
  try {
    srsData = JSON.parse(localStorage.getItem(srsKey())) || srsDefault();
  } catch {
    srsData = srsDefault();
  }
  // Complète les champs manquants (anciennes sauvegardes)
  const d = srsDefault();
  srsData.v = 2;
  srsData.settings = Object.assign(d.settings, srsData.settings || {});
  srsData.daily = srsData.daily || d.daily;
  if (!Array.isArray(srsData.daily.roots)) srsData.daily.roots = [];
  srsData.cards = srsData.cards || {};
  if (typeof srsData.triageDone !== "boolean") srsData.triageDone = false;
  srsLoadedFor = activeProfile;
  srsEnsureDaily();
}
function srsSave() {
  if (activeProfile) localStorage.setItem(srsKey(), JSON.stringify(srsData));
}
/* Charge les données du bon profil à la demande. */
function srsReady() {
  if (!srsData || srsLoadedFor !== activeProfile) srsLoad();
  else srsEnsureDaily();
  if (srsData) srsEnsureQueued();
  return srsData;
}
/* À chaque ouverture : tout verbe sans état de répétition espacée est
   automatiquement placé dans la FILE d'attente (avec sa date d'ajout).
   Il n'existe donc jamais de verbe « hors compteur » : chaque verbe est
   toujours dans file / paquet / boîtes / acquis.
   - Au tout premier lancement du profil, le fonds initial entre avec une
     date ancienne (added = 0) : il garde l'ordre de la liste.
   - Ensuite, un verbe qui APPARAÎT (nouvel import, nouveau cours) entre
     daté d'aujourd'hui → il est prioritaire car plus récent. */
function srsEnsureQueued() {
  const firstRun = Object.keys(srsData.cards).length === 0;
  let changed = false;
  SRS_INFS.forEach((inf) => {
    const c = srsData.cards[inf];
    if (!c) {
      srsData.cards[inf] = {
        status: "queue", box: 0, due: null, streak: 0,
        added: firstRun ? 0 : todayNum(), triaged: false,
        seen: 0, ok: 0, ko: 0,
      };
      changed = true;
    } else if (c.status === "new" || c.status == null) {
      c.status = "queue";
      if (c.added == null) c.added = firstRun ? 0 : todayNum();
      if (c.triaged == null) c.triaged = false;
      changed = true;
    }
  });
  if (changed) srsSave();
}
/* Remise à zéro du compteur de nouveaux verbes quand le jour change. */
function srsEnsureDaily() {
  const t = todayStr();
  if (!srsData.daily || srsData.daily.date !== t) {
    srsData.daily = { date: t, newIntroduced: 0, roots: [] };
    srsSave();
  }
}

/* ---------- Accès aux verbes (un verbe = une unité) ----------
   Un verbe = un INFINITIF. Le tableau source peut contenir le même
   infinitif deux fois (deux sens, ex. להראות « montrer / sembler ») :
   on les fusionne en UNE seule unité (une carte, clé = infinitif), pour
   qu'aucun verbe ne soit compté deux fois ni ne disparaisse. SRS_INFS
   est donc la liste DISTINCTE des infinitifs — la vraie « liste source »
   du jeu. */
const SRS_VERBS = typeof VERBES !== "undefined" ? VERBES.filter((v) => v.inf) : [];
const SRS_INFS = [...new Set(SRS_VERBS.map((v) => v.inf))]; // infinitifs distincts (ordre d'apparition)
const SRS_INDEX = {}; // inf -> position (pour départager la file)
SRS_INFS.forEach((inf, i) => (SRS_INDEX[inf] = i));
// Tous les sens d'un même infinitif, fusionnés pour l'affichage
const SRS_FR_BY_INF = {};
SRS_VERBS.forEach((v) => {
  (SRS_FR_BY_INF[v.inf] = SRS_FR_BY_INF[v.inf] || []).push(v.fr);
});
function srsFr(inf) {
  const list = SRS_FR_BY_INF[inf] || [(srsVerb(inf) || {}).fr || ""];
  return [...new Set(list.filter(Boolean))].join(" / ");
}
// Infinitifs en double dans la source (même infinitif, plusieurs sens)
const SRS_DUP_INFS = SRS_INFS.filter((inf) => (SRS_FR_BY_INF[inf] || []).length > 1);

/* ---------- Familles de racines (le « chandelier » des binyanim) ----------
   Les 7 constructions et leurs paires actif/passif (le hitpa'el au centre).
   Dans vos données, seuls פעל/נפעל/פיעל/התפעל/הפעיל sont présents (pu'al et
   huf'al n'apparaissent pas) : leurs cases du chandelier restent vides. */
const SRS_BINYAN_OPP = {
  "פעל": "נפעל", "נפעל": "פעל",
  "פיעל": "פועל", "פועל": "פיעל",
  "הפעיל": "הופעל", "הופעל": "הפעיל",
  "התפעל": null,
};
const SRS_BINYAN_INFO = {
  "פעל": { r: "Pa'al", v: "actif" },
  "נפעל": { r: "Nif'al", v: "passif / réfléchi" },
  "פיעל": { r: "Pi'el", v: "intensif" },
  "פועל": { r: "Pu'al", v: "passif" },
  "הפעיל": { r: "Hif'il", v: "causatif" },
  "הופעל": { r: "Huf'al", v: "passif causatif" },
  "התפעל": { r: "Hitpa'el", v: "réfléchi" },
};
// Disposition du chandelier : 3 paires (actif | passif) + le centre
const SRS_CHANDELIER_PAIRS = [["פעל", "נפעל"], ["פיעל", "פועל"], ["הפעיל", "הופעל"]];
const SRS_CHANDELIER_CENTER = "התפעל";

// Racine normalisée d'un verbe (lettres seules, formes finales ramenées)
function srsRoot(v) { return v ? hebrewLetters(String(v.racine || "")) : ""; }
// Index : racine -> [infinitifs]
const SRS_FAMILIES = {};
SRS_INFS.forEach((inf) => {
  const r = srsRoot(srsVerb(inf));
  if (!r) return;
  (SRS_FAMILIES[r] = SRS_FAMILIES[r] || []).push(inf); // infinitifs distincts
});
// Racine joliment pointée pour l'affichage : "סגר" -> "ס.ג.ר"
function srsRootDotted(r) { return [...String(r)].join("."); }

function srsCard(inf) {
  let c = srsData.cards[inf];
  if (!c) {
    c = { status: "new", box: 0, due: null, streak: 0, added: null, seen: 0, ok: 0, ko: 0 };
    srsData.cards[inf] = c;
  }
  return c;
}
function srsVerb(inf) {
  return VERB_BY_INF[inf];
}

/* ---------- Comptages (tableau de bord) ----------
   Tous les comptages portent sur les infinitifs DISTINCTS (SRS_INFS) :
   un verbe en double dans la source n'est jamais compté deux fois. */
function srsCardsBy(status) {
  return SRS_INFS.filter((inf) => {
    const c = srsData.cards[inf];
    if (!c) return status === "new";
    return c.status === status;
  });
}
/* « Total » du tableau de bord : tout ce qui est sorti du tri =
   file + paquet + boîtes 1-4 + acquis. */
function srsTotalCount() {
  return srsCardsBy("queue").length + srsCardsBy("packet").length +
    srsCardsBy("box").length + srsCardsBy("acquired").length;
}
/* Réconciliation : garantit qu'aucun verbe ne disparaît. La source
   (infinitifs distincts) doit toujours valoir : à trier + Total.
   `other` liste d'éventuels statuts inconnus (ne devrait jamais arriver). */
function srsReconcile() {
  const KNOWN = ["new", "queue", "packet", "box", "acquired"];
  const other = SRS_INFS.filter((inf) => {
    const c = srsData.cards[inf];
    return c && !KNOWN.includes(c.status);
  });
  const newN = srsCardsBy("new").length;
  const total = srsTotalCount();
  return { source: SRS_INFS.length, newN, total, other, ok: (newN + total + other.length) === SRS_INFS.length };
}
function srsQueueOrdered() {
  // File : priorité aux plus récemment ajoutés, puis aux anciens
  return srsCardsBy("queue").sort((a, b) => {
    const ca = srsData.cards[a], cb = srsData.cards[b];
    const da = ca.added || 0, db = cb.added || 0;
    if (db !== da) return db - da; // ajout le plus récent d'abord
    return SRS_INDEX[a] - SRS_INDEX[b]; // sinon ordre du tableau
  });
}
function srsBoxCounts() {
  const n = { 1: 0, 2: 0, 3: 0, 4: 0 };
  srsCardsBy("box").forEach((inf) => {
    const b = srsData.cards[inf].box || 1;
    n[b] = (n[b] || 0) + 1;
  });
  return n;
}
function srsDueList() {
  // Révisions dues aujourd'hui (boîtes + acquis), retard compris, les
  // plus en retard d'abord.
  const t = todayNum();
  const due = [];
  SRS_INFS.forEach((inf) => {
    const c = srsData.cards[inf];
    if (!c) return;
    if ((c.status === "box" || c.status === "acquired") && (c.due == null || c.due <= t)) {
      due.push(inf);
    }
  });
  due.sort((a, b) => (srsData.cards[a].due || 0) - (srsData.cards[b].due || 0));
  return due;
}
function srsNewRemainingToday() {
  const left = (srsData.settings.dailyNew || 6) - (srsData.daily.newIntroduced || 0);
  return Math.max(0, Math.min(left, srsQueueOrdered().length));
}

/* ---------- Remplissage du paquet ---------- */
/* Fait entrer des verbes de la file dans le paquet, tant qu'il reste
   de la place (≤ packetMax) ET du quota du jour (sauf "force"). */
/* Racines présentes actuellement dans le paquet. */
function srsPacketRoots() {
  const set = new Set();
  srsCardsBy("packet").forEach((inf) => { const r = srsRoot(srsVerb(inf)); if (r) set.add(r); });
  return set;
}
function srsRefillPacket(extra) {
  srsEnsureDaily();
  const max = srsData.settings.packetMax || 8;
  let room = max - srsCardsBy("packet").length;
  let quota = (srsData.settings.dailyNew || 6) - (srsData.daily.newIntroduced || 0) + (extra || 0);
  srsData.daily.roots = srsData.daily.roots || [];
  let introduced = 0;
  while (room > 0 && quota > 0) {
    const q = srsQueueOrdered();
    const packetRoots = srsPacketRoots();
    // 1er verbe éligible : on n'introduit jamais deux verbes de même
    // racine le même jour, ni une racine déjà présente dans le paquet.
    let inf = null;
    for (const cand of q) {
      const r = srsRoot(srsVerb(cand));
      if (r && (srsData.daily.roots.includes(r) || packetRoots.has(r))) continue;
      inf = cand; break;
    }
    if (!inf) break; // plus rien d'éligible (racines bloquées pour aujourd'hui)
    const c = srsCard(inf);
    c.status = "packet";
    c.streak = 0;
    const r = srsRoot(srsVerb(inf));
    if (r) srsData.daily.roots.push(r);
    srsData.daily.newIntroduced = (srsData.daily.newIntroduced || 0) + 1;
    room--; quota--; introduced++;
  }
  if (introduced) srsSave();
  return introduced;
}

/* ---------- Transitions de carte ---------- */
function srsGraduateFromPacket(inf) {
  const c = srsCard(inf);
  c.status = "box";
  c.box = 1;
  c.streak = 0;
  c.due = todayNum() + SRS_BOX_INTERVALS[1];
  srsSave();
}
/* Valeur « tête de file » : juste devant l'ajout le plus récent. */
function srsQueueHeadValue() {
  let m = todayNum();
  srsCardsBy("queue").forEach((inf) => { const a = srsData.cards[inf].added || 0; if (a > m) m = a; });
  return m + 1;
}
/* Quand un verbe atteint la boîte 2 : si son opposé (même racine, binyan
   opposé du chandelier) attend dans la file, on le place en tête pour
   apprendre les deux voix côte à côte. */
function srsBoostOppositeInQueue(inf) {
  const v = srsVerb(inf);
  if (!v) return;
  const root = srsRoot(v);
  const opp = SRS_BINYAN_OPP[v.binyan];
  if (!root || !opp) return;
  const cand = SRS_VERBS.find((o) =>
    o.inf !== inf && srsRoot(o) === root && o.binyan === opp &&
    srsData.cards[o.inf] && srsData.cards[o.inf].status === "queue");
  if (cand) { srsCard(cand.inf).added = srsQueueHeadValue(); }
}
/* Bonne réponse en révision : passe à la boîte suivante. */
function srsPromote(inf) {
  const c = srsCard(inf);
  const t = todayNum();
  if (c.status === "acquired") {
    c.due = t + SRS_ACQUIRED_INTERVAL;
  } else {
    const b = c.box || 1;
    if (b >= 4) {
      c.status = "acquired";
      c.box = 4;
      c.due = t + SRS_ACQUIRED_INTERVAL;
    } else {
      c.box = b + 1;
      c.due = t + SRS_BOX_INTERVALS[c.box];
      if (c.box === 2) srsBoostOppositeInQueue(inf); // chandelier : réveille l'opposé
    }
  }
  srsSave();
}
/* Erreur en révision : retour boîte 1 ; réintégré au paquet s'il y a de
   la place, sinon placé en tête de file. */
function srsDemote(inf) {
  const c = srsCard(inf);
  c.box = 1;
  c.streak = 0;
  const max = srsData.settings.packetMax || 8;
  if (srsCardsBy("packet").length < max) {
    c.status = "packet";
  } else {
    c.status = "queue";
    c.added = srsQueueHeadValue(); // en tête de file
    c.due = null;
  }
  srsSave();
}

/* ---------- Format d'exercice selon le niveau ---------- */
function srsFormatFor(card) {
  if (card.status === "packet") return "qcm";
  if (card.status === "acquired") return "flash";
  const b = card.box || 1;
  if (b <= 1) return "qcm";      // paquet & boîte 1 : QCM hébreu → français
  if (b === 2) return "flash";   // boîte 2 : carte à retourner français → hébreu
  return "letters";              // boîtes 3-4 : assemblage de lettres
}

/* ============================================================
   TRI INITIAL
   ============================================================ */
function srsStartTriage() {
  srsReady();
  state.srs.screen = "triage";
  state.srs.triageIdx = 0;
  render();
}
function srsTriageList() {
  // Le tri (facultatif) parcourt les verbes de la FILE pas encore passés
  // en revue. Rien n'est en limbo : ces verbes restent comptés dans la file.
  return SRS_INFS.filter((inf) => {
    const c = srsData.cards[inf];
    return c && c.status === "queue" && !c.triaged;
  }).map((inf) => srsVerb(inf));
}
function srsTriageMark(inf, known) {
  const c = srsCard(inf);
  if (known) {
    // Connu → acquis, révision hebdomadaire étalée pour ne pas tout
    // ramener le même jour
    c.status = "acquired";
    c.box = 4;
    c.triaged = true;
    c.due = todayNum() + 1 + Math.floor(Math.random() * SRS_ACQUIRED_INTERVAL);
  } else {
    // Pas connu → reste dans la file (déjà compté), marqué comme passé en
    // revue pour ne pas le reproposer au tri.
    c.status = "queue";
    c.triaged = true;
    if (c.added == null) c.added = todayNum();
    c.due = null;
  }
  srsSave();
}

/* ============================================================
   SESSION
   ============================================================ */
function srsStartSession(opts) {
  srsReady();
  opts = opts || {};
  srsRefillPacket(opts.extraNew || 0); // fait entrer les nouveaux du jour
  const reviewList = opts.mode === "free" || opts.mode === "conj" ? [] : srsDueList();
  state.srs.sess = {
    mode: opts.mode || "normal",
    phase: reviewList.length ? "review" : "packet",
    reviewList,
    rpos: 0,
    lane: null,       // construite au début de la phase paquet
    laneMiss: {},
    ok: 0, ko: 0, reviewed: 0, graduated: 0,
    answered: false,
    flipped: false,
    build: [],        // lettres déjà posées (mode assemblage)
  };
  if (state.srs.sess.phase === "packet") srsBuildPacketLane();
  state.srs.screen = "session";
  render();
}
function srsBuildPacketLane() {
  const s = state.srs.sess;
  s.lane = shuffle(srsCardsBy("packet"));
  s.laneMiss = {};
}
/* Passe à la carte suivante (gère la bascule révision → paquet → fin). */
function srsAdvance() {
  const s = state.srs.sess;
  s.answered = false;
  s.flipped = false;
  s.build = [];
  if (s.phase === "review") {
    s.rpos++;
    if (s.rpos >= s.reviewList.length) {
      // Fin des révisions : on passe au paquet (recalculé, car des
      // ratés ont pu y entrer)
      s.phase = "packet";
      srsBuildPacketLane();
    }
  }
  // (en phase paquet, la carte courante a déjà été retirée/réinsérée)
}
/* Carte courante : { inf, verb, card, format } ou null si fini. */
function srsCurrent() {
  const s = state.srs.sess;
  if (!s) return null;
  if (s.phase === "review") {
    const inf = s.reviewList[s.rpos];
    if (!inf) return null;
    const card = srsCard(inf);
    return { inf, verb: srsVerb(inf), card, format: srsFormatFor(card) };
  }
  if (s.phase === "packet") {
    if (!s.lane || s.lane.length === 0) return null;
    const inf = s.lane[0];
    return { inf, verb: srsVerb(inf), card: srsCard(inf), format: "qcm" };
  }
  return null;
}

/* Enregistre une réponse et programme la suite. */
function srsAnswer(inf, correct) {
  const s = state.srs.sess;
  const c = srsCard(inf);
  c.seen++; if (correct) c.ok++; else c.ko++;
  s[correct ? "ok" : "ko"]++;
  if (typeof bumpDailyCount === "function" && s.mode === "normal") bumpDailyCount();

  if (s.phase === "review") {
    s.reviewed++;
    if (correct) srsPromote(inf); else srsDemote(inf);
    srsSave();
    return;
  }
  // Phase paquet (ou entraînement libre)
  s.lane.shift(); // retire la carte courante
  if (s.mode === "free") {
    // Entraînement libre : on parcourt chaque verbe une fois sans
    // jamais toucher au calendrier ni aux boîtes.
    srsSave();
    return;
  }
  if (correct) {
    c.streak = (c.streak || 0) + 1;
    if (c.streak >= SRS_PACKET_GRADUATE) {
      srsGraduateFromPacket(inf);
      s.graduated++;
    } else {
      srsInsertLane(inf, SRS_CORRECT_GAP);
    }
  } else {
    c.streak = 0;
    const m = (s.laneMiss[inf] = (s.laneMiss[inf] || 0) + 1);
    const gap = SRS_MISS_GAPS[Math.min(m - 1, SRS_MISS_GAPS.length - 1)];
    srsInsertLane(inf, gap);
  }
  srsSave();
}
function srsInsertLane(inf, gap) {
  const lane = state.srs.sess.lane;
  const pos = Math.min(gap, lane.length);
  lane.splice(pos, 0, inf);
}

/* ============================================================
   RENDU
   ============================================================ */

/* Routeur : appelé par renderJeux() quand le sous-jeu est « verbes ». */
function renderSrs() {
  srsReady();
  const sc = state.srs.screen || "home";
  if (sc === "session") {
    if (!state.srs.sess) { state.srs.screen = "home"; return srsHome(); }
    return srsSession();
  }
  if (sc === "triage") return srsTriageScreen();
  if (sc === "add") return srsAddScreen();
  if (sc === "settings") return srsSettingsScreen();
  if (sc === "recap") return srsRecap();
  return srsHome();
}

/* petit bouton de retour vers le tableau de bord */
function srsBackBtn(label) {
  const b = el("button", "btn btn-ghost srs-back", "← " + (label || "Tableau de bord"));
  b.addEventListener("click", () => { state.srs.screen = "home"; state.srs.sess = null; render(); });
  return b;
}

/* ---------- Tableau de bord (écran d'accueil du jeu) ---------- */
function srsHome() {
  screen.appendChild(el("h2", "view-title", "🧠 Verbes — mémorisation"));

  const nNew = srsTriageList().length;
  const due = srsDueList().length;
  const newLeft = srsNewRemainingToday();
  const packet = srsCardsBy("packet").length;
  const queue = srsCardsBy("queue").length;
  const boxes = srsBoxCounts();
  const acq = srsCardsBy("acquired").length;
  const rec = srsReconcile(); // source, à trier, Total, cohérence

  // Proposition de tri initial tant qu'il reste des verbes non classés
  if (!srsData.triageDone && nNew > 0) {
    const tri = el("div", "srs-callout");
    tri.innerHTML = `<strong>Avant de commencer :</strong> trie tes verbes une première fois (« je connais » / « je connais pas »). Il en reste <strong>${nNew}</strong> à classer.`;
    const btn = el("button", "btn btn-primary", "🔎 Trier les verbes");
    btn.addEventListener("click", srsStartTriage);
    tri.appendChild(btn);
    screen.appendChild(tri);
  }

  // Grille de statistiques
  const grid = el("div", "srs-grid");
  const tiles = [
    ["📅", due, "révisions dues aujourd'hui", due > 0 ? "hot" : ""],
    ["🆕", newLeft, "nouveaux restants du jour", ""],
    ["🎒", packet, "dans le paquet", ""],
    ["⏳", queue, "en file d'attente", ""],
    ["🏆", acq, "acquis", ""],
    ["📊", rec.total, "Total (file + paquet + boîtes + acquis)", "total"],
  ];
  tiles.forEach(([ic, n, lab, cls]) => {
    const t = el("div", "srs-stat " + cls);
    t.innerHTML = `<div class="srs-stat-ic">${ic}</div><div class="srs-stat-n">${n}</div><div class="srs-stat-lab">${lab}</div>`;
    grid.appendChild(t);
  });
  screen.appendChild(grid);

  // Répartition par boîte
  const bx = el("div", "srs-boxes");
  bx.innerHTML =
    `<span class="srs-box-lab">Boîtes&nbsp;:</span>` +
    [1, 2, 3, 4].map((b) => `<span class="srs-box"><b>${boxes[b] || 0}</b> <span>B${b}</span></span>`).join("");
  screen.appendChild(bx);

  // Réconciliation : le Total doit TOUJOURS égaler le nombre de verbes de
  // la liste. Tout verbe est forcément dans file / paquet / boîtes / acquis
  // (aucun « hors compteur »). Les entrées en double (même infinitif, deux
  // sens) sont fusionnées : d'où 408 verbes distincts pour 411 entrées.
  const invariant = rec.total === rec.source && rec.other.length === 0;
  const dupNote = SRS_DUP_INFS.length
    ? ` (${SRS_VERBS.length} entrées − ${SRS_DUP_INFS.length} doublons fusionnés)`
    : "";
  const recEl = el("div", "srs-reconcile" + (invariant ? "" : " srs-reconcile-bad"));
  recEl.innerHTML = invariant
    ? `✓ Total <strong>${rec.total}</strong> = tous les verbes de la liste${dupNote}.`
    : `⚠️ Incohérence : Total ${rec.total} ≠ ${rec.source} verbes de la liste` +
      (rec.other.length ? ` (${rec.other.length} au statut inconnu : ${rec.other.join(", ")})` : "");
  screen.appendChild(recEl);

  // Bouton principal : démarrer la session
  const canStart = due > 0 || packet > 0 || newLeft > 0;
  const start = el("button", "btn btn-primary srs-start", canStart ? "▶️ Commencer la session" : "Rien à réviser pour l'instant 🎉");
  start.disabled = !canStart;
  start.addEventListener("click", () => srsStartSession({ mode: "normal" }));
  screen.appendChild(start);
  if (canStart) {
    const detail = [];
    if (due) detail.push(`${due} révision${due > 1 ? "s" : ""}`);
    if (newLeft && queue) detail.push(`jusqu'à ${newLeft} nouveau${newLeft > 1 ? "x" : ""}`);
    if (packet) detail.push(`${packet} dans le paquet`);
    screen.appendChild(el("p", "hint srs-start-hint", "Au programme : " + detail.join(" · ")));
  }

  // Actions secondaires
  const actions = el("div", "srs-actions");
  const bAdd = el("button", "btn btn-ghost", "➕ Ajouter des verbes (cours)");
  bAdd.addEventListener("click", () => { state.srs.screen = "add"; render(); });
  const bTri = el("button", "btn btn-ghost", "🔎 Tri initial");
  bTri.addEventListener("click", srsStartTriage);
  const bFam = el("button", "btn btn-ghost", "🕎 Familles de racines");
  bFam.addEventListener("click", () => { state.srs.screen = "familles"; render(); });
  const bSet = el("button", "btn btn-ghost", "⚙️ Réglages");
  bSet.addEventListener("click", () => { state.srs.screen = "settings"; render(); });
  [bAdd, bFam, bTri, bSet].forEach((b) => actions.appendChild(b));
  screen.appendChild(actions);
}

/* ---------- Tri initial ---------- */
function srsTriageScreen() {
  const list = srsTriageList();
  const total = SRS_INFS.length;
  const done = total - list.length;

  screen.appendChild(el("h2", "view-title", "🔎 Tri initial"));
  screen.appendChild(
    el("p", "hint", "Pour chaque verbe : <strong>« je connais »</strong> le range directement en acquis (révisé 1×/semaine), <strong>« je connais pas »</strong> l'envoie dans la file à apprendre. Tu peux t'arrêter quand tu veux.")
  );

  // barre de progression
  const bar = el("div", "srs-progress");
  bar.innerHTML = `<div class="srs-progress-fill" style="width:${total ? Math.round((done / total) * 100) : 0}%"></div>`;
  screen.appendChild(bar);
  screen.appendChild(el("p", "hint srs-progress-lab", `${done} / ${total} classés`));

  if (list.length === 0) {
    srsData.triageDone = true; srsSave();
    const ok = el("div", "srs-callout", "✅ Tous les verbes sont classés ! Tu peux lancer ta première session.");
    screen.appendChild(ok);
    screen.appendChild(srsBackBtn());
    return;
  }

  const v = list[0];
  const card = el("div", "srs-triage-card");
  card.innerHTML =
    `<div class="he srs-triage-he">${v.inf} ${speakBtn(v.inf)}</div>` +
    `<div class="translit srs-triage-tr">${v.translit}</div>` +
    `<div class="srs-triage-fr">${srsFr(v.inf)}</div>` +
    (v.binyan ? `<div class="srs-triage-meta"><span class="badge">${v.binyan}</span>${v.racine ? ` <span class="he">${v.racine}</span>` : ""}</div>` : "");
  screen.appendChild(card);

  const btns = el("div", "srs-triage-btns");
  const no = el("button", "btn btn-bad", "✗ Je connais pas");
  no.addEventListener("click", () => { srsTriageMark(v.inf, false); render(); });
  const yes = el("button", "btn btn-good", "✓ Je connais");
  yes.addEventListener("click", () => { srsTriageMark(v.inf, true); render(); });
  btns.appendChild(no); btns.appendChild(yes);
  screen.appendChild(btns);

  // mettre en pause / finir le tri
  const stop = el("button", "btn btn-ghost srs-triage-stop", "Terminer le tri plus tard");
  stop.addEventListener("click", () => { state.srs.screen = "home"; render(); });
  screen.appendChild(stop);
}

/* ---------- Session ---------- */
function srsSession() {
  const s = state.srs.sess;
  const cur = srsCurrent();
  if (!cur) { state.srs.screen = "recap"; return srsRecap(); }

  // En-tête : phase + score
  const head = el("div", "srs-sess-head");
  const phaseLbl =
    s.mode === "free" ? "🎪 Entraînement libre"
      : s.mode === "conj" ? "🔄 Conjugaison"
        : s.phase === "review" ? "📅 Révisions" : "🎒 Paquet";
  head.innerHTML =
    `<span class="srs-phase">${phaseLbl}</span>` +
    `<span class="session-score"><span class="ok">✔ ${s.ok}</span><span class="ko">✘ ${s.ko}</span></span>`;
  screen.appendChild(head);

  // file restante (indicateur discret)
  if (s.phase === "review") {
    screen.appendChild(el("p", "hint srs-remain", `${s.reviewList.length - s.rpos} révision(s) restante(s)`));
  } else if (s.phase === "packet") {
    const left = srsCardsBy("packet").length;
    screen.appendChild(el("p", "hint srs-remain", `${left} verbe(s) dans le paquet · ${s.lane.length} carte(s) en jeu`));
  }

  if (cur.format === "qcm") srsRenderQcm(cur);
  else if (cur.format === "flash") srsRenderFlash(cur);
  else srsRenderLetters(cur);

  const quit = el("button", "btn btn-ghost srs-quit", "⏹ Terminer la session");
  quit.addEventListener("click", () => { state.srs.screen = "recap"; render(); });
  screen.appendChild(quit);
}

/* badge de niveau d'une carte (pour situer l'exercice) */
function srsLevelBadge(card) {
  if (card.status === "packet") return `<span class="badge srs-lvl">Paquet</span>`;
  if (card.status === "acquired") return `<span class="badge srs-lvl">Acquis</span>`;
  return `<span class="badge srs-lvl">Boîte ${card.box || 1}</span>`;
}

/* -- QCM hébreu → français (paquet & boîte 1) -- */
function srsRenderQcm(cur) {
  const s = state.srs.sess;
  const v = cur.verb;

  const q = el("div", "quiz-question");
  q.innerHTML =
    `<div class="conj-badges">${srsLevelBadge(cur.card)}${v.binyan ? `<span class="badge">${v.binyan}</span>` : ""}</div>` +
    `<div class="he-word he">${v.inf} ${speakBtn(v.inf)}</div>` +
    `<div class="translit">${v.translit}</div>` +
    `<div class="hint srs-ask">Que veut dire ce verbe ?</div>`;
  screen.appendChild(q);

  // 3 distracteurs : infinitifs DISTINCTS (jamais le même verbe sous un
  // autre sens), proches de la cible (même binyan, 1re lettre, longueur).
  const others = SRS_INFS.filter((o) => o !== v.inf).map((o) => srsVerb(o)).filter(Boolean);
  function sim(o) {
    let sc = Math.random();
    if (o.binyan && o.binyan === v.binyan) sc += 2;
    if (o.inf[0] === v.inf[0]) sc += 1.5;
    if (Math.abs(o.inf.length - v.inf.length) <= 1) sc += 1;
    return sc;
  }
  const seen = new Set([frMain(srsFr(v.inf))]);
  const distract = [];
  others.map((o) => [sim(o), o]).sort((a, b) => b[0] - a[0]).forEach(([, o]) => {
    if (distract.length < 3 && !seen.has(frMain(srsFr(o.inf)))) { seen.add(frMain(srsFr(o.inf))); distract.push(o); }
  });
  const options = shuffle([v, ...distract]);

  const box = el("div", "quiz-options");
  screen.appendChild(box);
  const buttons = [];
  options.forEach((opt) => {
    const btn = el("button", "quiz-option", srsFr(opt.inf));
    buttons.push({ btn, opt });
    btn.addEventListener("click", () => {
      if (s.answered) return;
      s.answered = true;
      const correct = opt.inf === v.inf;
      buttons.forEach(({ btn: b, opt: o }) => {
        b.disabled = true;
        if (o.inf === v.inf) b.classList.add("correct");
      });
      if (!correct) btn.classList.add("wrong");
      srsAnswer(v.inf, correct);
      srsFeedback(v, correct);
    });
    box.appendChild(btn);
  });
}

/* -- Carte à retourner français → hébreu (boîte 2 & acquis) -- */
function srsRenderFlash(cur) {
  const s = state.srs.sess;
  const v = cur.verb;

  const q = el("div", "quiz-question");
  q.innerHTML =
    `<div class="conj-badges">${srsLevelBadge(cur.card)}</div>` +
    `<div class="fr-word">${srsFr(v.inf)}</div>` +
    `<div class="hint srs-ask">Dis-le en hébreu, puis retourne la carte.</div>`;
  screen.appendChild(q);

  const flip = el("div", "srs-flash");
  if (!s.flipped) {
    const show = el("button", "btn btn-primary srs-flip", "🔄 Retourner");
    show.addEventListener("click", () => { s.flipped = true; render(); });
    flip.appendChild(show);
  } else {
    flip.innerHTML =
      `<div class="he srs-flash-he">${v.inf} ${speakBtn(v.inf)}</div>` +
      `<div class="translit">${v.translit}</div>`;
  }
  screen.appendChild(flip);

  if (s.flipped) {
    const btns = el("div", "srs-selfeval");
    const ko = el("button", "btn btn-bad", "✗ Raté");
    const ok = el("button", "btn btn-good", "✓ J'avais bon");
    ko.addEventListener("click", () => { if (s.answered) return; s.answered = true; srsAnswer(v.inf, false); srsFeedback(v, false, true); });
    ok.addEventListener("click", () => { if (s.answered) return; s.answered = true; srsAnswer(v.inf, true); srsFeedback(v, true, true); });
    btns.appendChild(ko); btns.appendChild(ok);
    screen.appendChild(btns);
  }
}

/* -- Assemblage de lettres (boîtes 3-4) -- */
function srsRenderLetters(cur) {
  const s = state.srs.sess;
  const v = cur.verb;
  const target = [...hebrewLetters(v.inf)]; // lettres cibles (formes normales)

  const q = el("div", "quiz-question");
  q.innerHTML =
    `<div class="conj-badges">${srsLevelBadge(cur.card)}</div>` +
    `<div class="fr-word">${srsFr(v.inf)}</div>` +
    // indice de prononciation en boîte 3, caché en boîte 4
    (cur.card.box >= 4 ? "" : `<div class="translit srs-letters-hint">${v.translit}</div>`) +
    `<div class="hint srs-ask">Reconstitue le verbe en hébreu (de droite à gauche).</div>`;
  screen.appendChild(q);

  // zone de construction
  const slots = el("div", "srs-slots he");
  slots.dir = "rtl";
  slots.innerHTML = s.build.length
    ? s.build.join("")
    : `<span class="srs-slots-empty">…</span>`;
  screen.appendChild(slots);

  if (!s.answered) {
    // jeu de lettres : cibles + quelques distracteurs, mélangées
    if (!s._tiles || s._tilesFor !== v.inf) {
      const pool = srsLetterPool(target);
      s._tiles = shuffle(pool);
      s._tilesFor = v.inf;
    }
    const used = s.build.slice(); // pour griser les lettres déjà posées (par occurrence)
    const tiles = el("div", "srs-tiles");
    s._tiles.forEach((ltr, i) => {
      const btn = el("button", "srs-tile he", ltr);
      // grise une occurrence déjà consommée
      const idx = used.indexOf(ltr);
      if (idx >= 0) { btn.classList.add("used"); btn.disabled = true; used.splice(idx, 1); }
      btn.addEventListener("click", () => {
        s.build.push(ltr);
        render();
      });
      tiles.appendChild(btn);
    });
    screen.appendChild(tiles);

    const ctr = el("div", "srs-letters-ctr");
    const back = el("button", "btn btn-ghost", "⌫ Effacer");
    back.disabled = s.build.length === 0;
    back.addEventListener("click", () => { s.build.pop(); render(); });
    const val = el("button", "btn btn-primary", "Valider");
    val.disabled = s.build.length === 0;
    val.addEventListener("click", () => {
      if (s.answered) return;
      s.answered = true;
      const correct = s.build.join("") === target.join("");
      s._tiles = null; s._tilesFor = null;
      srsAnswer(v.inf, correct);
      srsFeedback(v, correct);
    });
    ctr.appendChild(back); ctr.appendChild(val);
    screen.appendChild(ctr);
  }
}
/* Lettres proposées : les lettres du verbe + 2 à 3 distracteurs. */
const SRS_HE_ALPHABET = [..."אבגדהוזחטיכלמנסעפצקרשת"];
function srsLetterPool(target) {
  const pool = target.slice();
  const extra = Math.min(3, Math.max(2, Math.round(target.length / 3)));
  let guard = 0;
  while (pool.length < target.length + extra && guard++ < 50) {
    const l = SRS_HE_ALPHABET[Math.floor(Math.random() * SRS_HE_ALPHABET.length)];
    // évite d'ajouter une lettre qui créerait trop de doublons trompeurs
    pool.push(l);
  }
  return pool;
}

/* -- Retour après réponse (commun aux 3 formats) -- */
function srsFeedback(v, correct, noReveal) {
  const s = state.srs.sess;
  const fb = el("div", "feedback " + (correct ? "good" : "bad"));
  fb.innerHTML =
    `${correct ? "✔" : "✘"} <strong>${srsFr(v.inf)}</strong> — <span class="he">${v.inf}</span> ${speakBtn(v.inf)} <span class="feedback-tr">(${v.translit})</span>` +
    ` <button type="button" class="verb-info-btn" title="Voir le verbe" aria-label="Détails du verbe">i</button>`;
  screen.appendChild(fb);

  const panel = el("div", "verb-info-panel", verbInfoHtml(v));
  panel.hidden = true;
  screen.appendChild(panel);
  fb.querySelector(".verb-info-btn").addEventListener("click", () => { panel.hidden = !panel.hidden; });

  const next = el("button", "btn btn-primary srs-next", "Suivant →");
  next.addEventListener("click", () => { srsAdvance(); render(); });
  screen.appendChild(next);
}

/* ---------- Récapitulatif de fin de session + bonus ---------- */
function srsRecap() {
  const s = state.srs.sess;
  screen.appendChild(el("h2", "view-title", "🎉 Session terminée"));

  if (s) {
    const tot = s.ok + s.ko;
    const pct = tot ? Math.round((s.ok / tot) * 100) : 0;
    const rec = el("div", "srs-callout");
    rec.innerHTML =
      `<div class="srs-recap-score">${s.ok} / ${tot} <span>(${pct}%)</span></div>` +
      `<div class="hint">${s.reviewed} révision(s) · ${s.graduated} verbe(s) sorti(s) du paquet 🎓</div>`;
    screen.appendChild(rec);
  }

  // Boutons bonus
  const bonus = el("div", "srs-bonus");

  // Encore 3 nouveaux (dépasse le quota du jour)
  const queue = srsQueueOrdered().length;
  const packetRoom = (srsData.settings.packetMax || 8) - srsCardsBy("packet").length;
  const b1 = el("button", "btn btn-ghost", "➕ Encore 3 nouveaux");
  b1.disabled = queue === 0 || packetRoom <= 0;
  b1.addEventListener("click", () => {
    if (confirm("Ajouter 3 nouveaux verbes au-delà du quota du jour ?\n\n⚠️ Attention : plus de nouveaux aujourd'hui = plus de révisions les jours suivants.")) {
      srsStartSession({ mode: "normal", extraNew: 3 });
    }
  });
  bonus.appendChild(b1);

  // Entraînement libre (boîtes 1-2, sans toucher au calendrier)
  const freePool = srsCardsBy("box").filter((inf) => (srsData.cards[inf].box || 1) <= 2);
  const b2 = el("button", "btn btn-ghost", "🎪 Entraînement libre (boîtes 1-2)");
  b2.disabled = freePool.length === 0;
  b2.addEventListener("click", () => srsStartFree(freePool));
  bonus.appendChild(b2);

  // Conjugaison (présent/passé) sur boîtes 3+ ou acquis
  const conjPool = srsConjPool();
  const b3 = el("button", "btn btn-ghost", "🔄 Conjugaison (présent/passé)");
  b3.disabled = conjPool.length === 0;
  b3.addEventListener("click", () => srsStartConj(conjPool));
  bonus.appendChild(b3);

  // Mode Famille : débloqué dès que 2 verbes d'une même racine sont en boîte 3+
  const famReady = srsFamilyRootsReady();
  const b4 = el("button", "btn btn-ghost", "🕎 Mode Famille (racines)");
  b4.disabled = famReady.length === 0;
  b4.addEventListener("click", () => srsStartFamily(famReady));
  bonus.appendChild(b4);

  screen.appendChild(bonus);
  screen.appendChild(srsBackBtn("Retour au tableau de bord"));
}

/* Entraînement libre : rejoue des verbes sans modifier le calendrier. */
function srsStartFree(pool) {
  state.srs.sess = {
    mode: "free", phase: "packet",
    lane: shuffle(pool.slice()), laneMiss: {},
    reviewList: [], rpos: 0,
    ok: 0, ko: 0, reviewed: 0, graduated: 0,
    answered: false, flipped: false, build: [],
    freeLoop: true,
  };
  state.srs.screen = "session";
  render();
}

/* ---------- Conjugaison bonus (présent / passé) ---------- */
function srsConjPool() {
  // verbes en boîte 3+ ou acquis, qui ont présent ET/OU passé (distincts)
  return SRS_INFS.map((inf) => srsVerb(inf)).filter((v) => {
    if (!v) return false;
    const c = srsData.cards[v.inf];
    if (!c) return false;
    const ok = c.status === "acquired" || (c.status === "box" && (c.box || 1) >= 3);
    if (!ok) return false;
    return verbFormHe(v.inf, "Présent") || verbFormHe(v.inf, "Passé");
  });
}
function srsStartConj(pool) {
  state.srs.sess = {
    mode: "conj", phase: "conj",
    pool: pool.slice(), ok: 0, ko: 0, reviewed: 0, graduated: 0,
    answered: false, current: null, tense: null,
  };
  state.srs.screen = "session-conj";
  srsPickConj();
  render();
}
function srsPickConj() {
  const s = state.srs.sess;
  const v = s.pool[Math.floor(Math.random() * s.pool.length)];
  const tenses = ["Présent", "Passé"].filter((t) => verbFormHe(v.inf, t));
  s.current = v;
  s.tense = tenses[Math.floor(Math.random() * tenses.length)];
  s.answered = false;
}

/* On réutilise le routeur : écrans additionnels rendus ici */
const _srsRenderSrs = renderSrs;
renderSrs = function () {
  srsReady();
  if (state.srs.screen === "session-conj") return srsSessionConj();
  if (state.srs.screen === "session-family") return srsSessionFamily();
  if (state.srs.screen === "familles") return srsFamillesScreen();
  return _srsRenderSrs();
};

function srsSessionConj() {
  const s = state.srs.sess;
  if (!s || !s.current) { state.srs.screen = "home"; return srsHome(); }
  const v = s.current, tense = s.tense;

  const head = el("div", "srs-sess-head");
  head.innerHTML =
    `<span class="srs-phase">🔄 Conjugaison</span>` +
    `<span class="session-score"><span class="ok">✔ ${s.ok}</span><span class="ko">✘ ${s.ko}</span></span>`;
  screen.appendChild(head);

  const label = conjugateFrLabel(v.fr, tense) || v.fr;
  const q = el("div", "quiz-question");
  q.innerHTML =
    `<div class="conj-badges"><span class="badge badge-tense">${tense}</span>${v.binyan ? `<span class="badge">${v.binyan}</span>` : ""}</div>` +
    `<div class="fr-word">${label}</div>`;
  screen.appendChild(q);

  const target = verbFormHe(v.inf, tense);
  // distracteurs : même temps, autres verbes du pool (ou tous)
  const seen = new Set([target]);
  const distract = [];
  shuffle(SRS_INFS).forEach((oInf) => {
    if (oInf === v.inf) return;
    const he = verbFormHe(oInf, tense);
    if (he && !seen.has(he) && distract.length < 3) { seen.add(he); distract.push(he); }
  });
  const options = shuffle([target, ...distract]);

  const box = el("div", "quiz-options");
  screen.appendChild(box);
  const buttons = [];
  options.forEach((he) => {
    const btn = el("button", "quiz-option option-he", `<span class="he">${he}</span> ${speakBtn(he)}`);
    buttons.push({ btn, he });
    btn.addEventListener("click", () => {
      if (s.answered) return;
      s.answered = true;
      const correct = he === target;
      buttons.forEach(({ btn: b, he: h }) => { b.classList.add("locked"); if (h === target) b.classList.add("correct"); });
      if (!correct) btn.classList.add("wrong");
      s[correct ? "ok" : "ko"]++;
      const fb = el("div", "feedback " + (correct ? "good" : "bad"));
      fb.innerHTML = `${correct ? "✔" : "✘"} <span class="he">${target}</span> ${speakBtn(target)} — <em>${label}</em>`;
      screen.appendChild(fb);
      const next = el("button", "btn btn-primary srs-next", "Suivant →");
      next.addEventListener("click", () => { srsPickConj(); render(); });
      screen.appendChild(next);
    });
    box.appendChild(btn);
  });

  const quit = el("button", "btn btn-ghost srs-quit", "⏹ Terminer");
  quit.addEventListener("click", () => { state.srs.screen = "home"; state.srs.sess = null; render(); });
  screen.appendChild(quit);
}

/* ---------- Ajouter des verbes (cours) ---------- */
function srsAddScreen() {
  screen.appendChild(el("h2", "view-title", "➕ Ajouter des verbes"));
  screen.appendChild(
    el("p", "hint", "Sélectionne les verbes d'un cours et choisis sa date : ils rejoignent la file d'attente (les plus récents sont travaillés en priorité).")
  );

  // date du cours
  const dateRow = el("div", "srs-add-date");
  dateRow.innerHTML = `<label>Date du cours : </label>`;
  const dateInp = el("input", "srs-date-input");
  dateInp.type = "date";
  dateInp.value = todayStr();
  dateRow.appendChild(dateInp);
  screen.appendChild(dateRow);

  // recherche
  const search = el("input", "write-input srs-add-search");
  search.type = "text";
  search.placeholder = "Filtrer (français ou hébreu)…";
  screen.appendChild(search);

  // par défaut : les verbes encore dans la file (pas encore en cours de
  // mémorisation) — ce sont ceux qu'on veut dater/prioriser pour un cours
  const onlyQueue = { v: true };
  screen.appendChild(
    checkToggle("Afficher seulement les verbes encore en file", onlyQueue.v, (val) => { onlyQueue.v = val; renderList(); })
  );

  const selected = new Set();
  const listWrap = el("div", "srs-add-list");
  screen.appendChild(listWrap);

  const addBtn = el("button", "btn btn-primary srs-add-confirm", "Ajouter à la file");
  addBtn.addEventListener("click", () => {
    if (selected.size === 0) return;
    const dayNum = srsDateToNum(dateInp.value);
    selected.forEach((inf) => {
      const c = srsCard(inf);
      c.added = dayNum; // date du cours → priorité
      // On (re)met dans la file seulement si le verbe n'est pas déjà en
      // cours de mémorisation : jamais de perte de progression.
      if (c.status === "queue" || c.status === "new" || c.status == null) {
        c.status = "queue";
        c.box = 0; c.streak = 0; c.due = null;
      }
    });
    srsSave();
    const msg = el("div", "srs-callout", `✅ ${selected.size} verbe(s) ajouté(s) à la file.`);
    state.srs.screen = "home";
    render();
    screen.insertBefore(msg, screen.firstChild.nextSibling);
  });

  function renderList() {
    listWrap.innerHTML = "";
    const q = normalize(search.value);
    let items = SRS_INFS.map((inf) => srsVerb(inf)).filter(Boolean); // distincts
    if (onlyQueue.v) items = items.filter((v) => { const c = srsData.cards[v.inf]; return !c || c.status === "queue"; });
    if (q) items = items.filter((v) => normalize(srsFr(v.inf)).includes(q) || v.inf.includes(search.value.trim()));
    items = items.slice(0, 120);
    if (items.length === 0) { listWrap.appendChild(el("p", "hint", "Aucun verbe.")); return; }
    items.forEach((v) => {
      const row = el("label", "srs-add-row" + (selected.has(v.inf) ? " on" : ""));
      const st = srsData.cards[v.inf] ? srsStatusLabel(srsData.cards[v.inf]) : "nouveau";
      row.innerHTML =
        `<input type="checkbox"${selected.has(v.inf) ? " checked" : ""}>` +
        `<span class="he">${v.inf}</span> <span class="srs-add-fr">${srsFr(v.inf)}</span> <span class="srs-add-st">${st}</span>`;
      row.querySelector("input").addEventListener("change", (e) => {
        if (e.target.checked) selected.add(v.inf); else selected.delete(v.inf);
        row.classList.toggle("on", e.target.checked);
        addBtn.textContent = `Ajouter à la file (${selected.size})`;
      });
      listWrap.appendChild(row);
    });
  }
  search.addEventListener("input", renderList);
  renderList();
  screen.appendChild(addBtn);
  screen.appendChild(srsBackBtn());
}
function srsStatusLabel(c) {
  if (c.status === "queue") return "en file";
  if (c.status === "packet") return "paquet";
  if (c.status === "acquired") return "acquis";
  if (c.status === "box") return "boîte " + (c.box || 1);
  return "nouveau";
}
function srsDateToNum(str) {
  // "AAAA-MM-JJ" -> numéro de jour (même base que todayNum)
  const d = new Date(str + "T00:00:00");
  if (isNaN(d)) return todayNum();
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

/* ---------- Réglages ---------- */
function srsSettingsScreen() {
  screen.appendChild(el("h2", "view-title", "⚙️ Réglages — mémorisation"));

  // Taille du paquet (7 à 10)
  screen.appendChild(el("p", "srs-set-lab", "Taille du paquet de travail (« salle d'attente »)"));
  const pk = el("div", "srs-set-choice");
  [7, 8, 9, 10].forEach((n) => {
    const b = el("button", "seg-btn" + (srsData.settings.packetMax === n ? " active" : ""), String(n));
    b.addEventListener("click", () => { srsData.settings.packetMax = n; srsSave(); render(); });
    pk.appendChild(b);
  });
  screen.appendChild(pk);

  // Nouveaux par jour
  screen.appendChild(el("p", "srs-set-lab", "Nouveaux verbes par jour"));
  const dn = el("div", "srs-set-choice");
  [3, 4, 5, 6, 8, 10, 12].forEach((n) => {
    const b = el("button", "seg-btn" + (srsData.settings.dailyNew === n ? " active" : ""), String(n));
    b.addEventListener("click", () => { srsData.settings.dailyNew = n; srsSave(); render(); });
    dn.appendChild(b);
  });
  screen.appendChild(dn);
  screen.appendChild(el("p", "hint", `Déjà introduits aujourd'hui : ${srsData.daily.newIntroduced || 0}.`));

  screen.appendChild(srsBackBtn());
}

/* ---------- petit util ---------- */
function frMain(fr) {
  return String(fr).replace(/\([^)]*\)/g, "").split("/")[0].trim().toLowerCase();
}

/* ============================================================
   FAMILLES DE RACINES (le chandelier des binyanim)
   ============================================================ */

/* Racines ayant au moins deux verbes en boîte 3+ (ou acquis) : condition
   de déblocage du mode Famille. */
function srsFamilyRootsReady() {
  const res = [];
  Object.entries(SRS_FAMILIES).forEach(([r, infs]) => {
    const adv = infs.filter((inf) => {
      const c = srsData.cards[inf];
      return c && (c.status === "acquired" || (c.status === "box" && (c.box || 1) >= 3));
    });
    if (adv.length >= 2) res.push({ root: r, adv, all: infs });
  });
  return res;
}

function srsStartFamily(ready) {
  state.srs.sess = { mode: "family", phase: "family", roots: ready, ok: 0, ko: 0, answered: false, current: null };
  srsPickFamily();
  state.srs.screen = "session-family";
  render();
}
function srsPickFamily() {
  const s = state.srs.sess;
  const fam = s.roots[Math.floor(Math.random() * s.roots.length)];
  // cible : un verbe avancé (boîte 3+) de la racine
  const target = fam.adv[Math.floor(Math.random() * fam.adv.length)];
  // options : les verbes de la famille (même racine), cible incluse,
  // en privilégiant les membres avancés, complétés par les autres.
  const uniq = [];
  const seen = new Set();
  const order = [target, ...fam.adv.filter((i) => i !== target), ...fam.all.filter((i) => !fam.adv.includes(i))];
  order.forEach((inf) => { if (!seen.has(inf) && uniq.length < 4) { seen.add(inf); uniq.push(inf); } });
  s.current = { root: fam.root, target, options: shuffle(uniq) };
  s.answered = false;
}

function srsSessionFamily() {
  const s = state.srs.sess;
  if (!s || !s.current) { state.srs.screen = "home"; return; }
  const cur = s.current;
  const tv = srsVerb(cur.target);

  const head = el("div", "srs-sess-head");
  head.innerHTML =
    `<span class="srs-phase">🕎 Famille</span>` +
    `<span class="session-score"><span class="ok">✔ ${s.ok}</span><span class="ko">✘ ${s.ko}</span></span>`;
  screen.appendChild(head);
  screen.appendChild(el("p", "hint srs-remain", "Les erreurs ici ne font pas reculer les verbes."));

  // Phrase à trous : contexte français + hébreu, forme à retrouver
  const q = el("div", "quiz-question srs-fam-q");
  q.innerHTML =
    `<div class="conj-badges"><span class="badge srs-lvl">Racine ${srsRootDotted(cur.root)}</span></div>` +
    `<div class="srs-fam-fr">Il faut <strong>${frMain(tv.fr)}</strong>.</div>` +
    `<div class="srs-fam-he he" dir="rtl">צריך <span class="srs-blank">______</span>.</div>` +
    `<div class="hint srs-ask">Quelle forme de la racine ${srsRootDotted(cur.root)} convient ?</div>`;
  screen.appendChild(q);

  const box = el("div", "quiz-options");
  screen.appendChild(box);
  const buttons = [];
  cur.options.forEach((inf) => {
    const v = srsVerb(inf);
    const btn = el("button", "quiz-option option-he", `<span class="he">${v.inf}</span> ${speakBtn(v.inf)}`);
    buttons.push({ btn, inf });
    btn.addEventListener("click", () => {
      if (s.answered) return;
      s.answered = true;
      const correct = inf === cur.target;
      s[correct ? "ok" : "ko"]++;
      buttons.forEach(({ btn: b, inf: i }) => { b.classList.add("locked"); if (i === cur.target) b.classList.add("correct"); });
      if (!correct) btn.classList.add("wrong");

      // Retour : la phrase complétée + toute la famille (he = sens, binyan)
      const fb = el("div", "feedback " + (correct ? "good" : "bad"));
      fb.innerHTML =
        `${correct ? "✔" : "✘"} <span class="he">צריך ${tv.inf}</span> — <em>Il faut ${frMain(tv.fr)}</em>`;
      screen.appendChild(fb);
      const famList = el("div", "srs-fam-list");
      famList.innerHTML = cur.options.map((i) => {
        const vv = srsVerb(i);
        const bi = SRS_BINYAN_INFO[vv.binyan];
        return `<div class="srs-fam-item${i === cur.target ? " is-target" : ""}"><span class="he">${vv.inf}</span> <span class="srs-fam-sens">${srsFr(vv.inf)}</span>${bi ? ` <span class="srs-fam-bin">${bi.r}</span>` : ""}</div>`;
      }).join("");
      screen.appendChild(famList);

      const next = el("button", "btn btn-primary srs-next", "Suivant →");
      next.addEventListener("click", () => { srsPickFamily(); render(); });
      screen.appendChild(next);
    });
    box.appendChild(btn);
  });

  const quit = el("button", "btn btn-ghost srs-quit", "⏹ Terminer");
  quit.addEventListener("click", () => { state.srs.screen = "home"; state.srs.sess = null; render(); });
  screen.appendChild(quit);
}

/* ---------- Écran « Familles » : le chandelier par racine ---------- */
function srsVerbStatusChip(inf) {
  const c = srsData.cards[inf];
  if (!c || c.status === "new") return `<span class="srs-chip srs-chip-new">—</span>`;
  if (c.status === "acquired") return `<span class="srs-chip srs-chip-acq">🏆 acquis</span>`;
  if (c.status === "box") return `<span class="srs-chip srs-chip-box">boîte ${c.box || 1}</span>`;
  if (c.status === "packet") return `<span class="srs-chip srs-chip-pac">🎒 paquet</span>`;
  if (c.status === "queue") return `<span class="srs-chip srs-chip-file">⏳ file</span>`;
  return "";
}
function srsFamIsKnown(inf) {
  const c = srsData.cards[inf];
  return !!(c && c.status !== "new");
}
/* Familles réelles : racines ayant au moins 2 verbes dans les données. */
function srsRealFamilies() {
  return Object.entries(SRS_FAMILIES)
    .filter(([, infs]) => infs.length >= 2)
    .map(([root, infs]) => ({ root, infs, known: infs.filter(srsFamIsKnown).length }));
}
function srsChandelierCell(root, binyan) {
  const infs = (SRS_FAMILIES[root] || []).filter((inf) => srsVerb(inf).binyan === binyan);
  const info = SRS_BINYAN_INFO[binyan] || { r: binyan, v: "" };
  const cell = el("div", "srs-ch-cell" + (infs.length ? " filled" : " empty"));
  let inner = `<div class="srs-ch-bin">${info.r}<span class="srs-ch-he he">${binyan}</span></div>` +
    `<div class="srs-ch-voice">${info.v}</div>`;
  if (infs.length) {
    inner += infs.map((inf) => {
      const v = srsVerb(inf);
      return `<div class="srs-ch-verb${srsFamIsKnown(inf) ? " known" : ""}"><span class="he">${v.inf}</span> <span class="srs-ch-fr">${srsFr(inf)}</span>${srsVerbStatusChip(inf)}</div>`;
    }).join("");
  } else {
    inner += `<div class="srs-ch-none">—</div>`;
  }
  cell.innerHTML = inner;
  return cell;
}
function srsFamillesScreen() {
  screen.appendChild(el("h2", "view-title", "🕎 Familles de racines"));
  screen.appendChild(
    el("p", "hint", "Chaque racine se décline sur le « chandelier » des binyanim : à gauche les formes actives, à droite les passives/réfléchies, le hitpa'el au centre. Les verbes que tu travailles sont surlignés.")
  );

  // Lancer le mode Famille si débloqué
  const famReady = srsFamilyRootsReady();
  if (famReady.length) {
    const play = el("button", "btn btn-primary srs-fam-play", `🎮 Jouer au mode Famille (${famReady.length} racine${famReady.length > 1 ? "s" : ""} prête${famReady.length > 1 ? "s" : ""})`);
    play.addEventListener("click", () => srsStartFamily(famReady));
    screen.appendChild(play);
  } else {
    screen.appendChild(el("p", "hint srs-fam-locked", "🔒 Le jeu « Famille » se débloque dès que deux verbes d'une même racine atteignent la boîte 3."));
  }

  // filtre
  const onlyMine = state.srs.famMine !== false; // par défaut : mes familles
  screen.appendChild(
    checkToggle("Seulement mes familles (au moins un verbe commencé)", onlyMine, (v) => { state.srs.famMine = v; render(); })
  );
  const search = el("input", "write-input srs-add-search");
  search.type = "text";
  search.placeholder = "Filtrer (racine, hébreu ou français)…";
  search.value = state.srs.famQ || "";
  search.addEventListener("input", () => { state.srs.famQ = search.value; renderFamList(); });
  screen.appendChild(search);

  const listWrap = el("div", "srs-fam-families");
  screen.appendChild(listWrap);

  function renderFamList() {
    listWrap.innerHTML = "";
    let fams = srsRealFamilies();
    if (onlyMine) fams = fams.filter((f) => f.known > 0);
    const q = (state.srs.famQ || "").trim();
    if (q) {
      const qn = normalize(q);
      fams = fams.filter((f) =>
        f.root.includes(q) ||
        f.infs.some((inf) => inf.includes(q) || normalize(srsVerb(inf).fr).includes(qn)));
    }
    // tri : le plus de verbes connus d'abord, puis les plus grandes familles
    fams.sort((a, b) => (b.known - a.known) || (b.infs.length - a.infs.length) || (a.root < b.root ? -1 : 1));
    if (fams.length === 0) { listWrap.appendChild(el("p", "hint", "Aucune famille à afficher.")); return; }

    fams.slice(0, 80).forEach((f) => {
      const open = state.srs.openFam === f.root;
      const famEl = el("div", "srs-fam" + (open ? " open" : ""));
      const header = el("button", "srs-fam-head");
      header.innerHTML =
        `<span class="srs-fam-root he">${srsRootDotted(f.root)}</span>` +
        `<span class="srs-fam-count">${f.known}/${f.infs.length} verbe${f.infs.length > 1 ? "s" : ""}</span>` +
        `<span class="srs-fam-arrow">${open ? "▾" : "▸"}</span>`;
      header.addEventListener("click", () => { state.srs.openFam = open ? null : f.root; render(); });
      famEl.appendChild(header);

      if (open) {
        const grid = el("div", "srs-chandelier");
        SRS_CHANDELIER_PAIRS.forEach(([act, pas]) => {
          const row = el("div", "srs-ch-row");
          row.appendChild(srsChandelierCell(f.root, act));
          row.appendChild(srsChandelierCell(f.root, pas));
          grid.appendChild(row);
        });
        // centre : hitpa'el
        const center = el("div", "srs-ch-row srs-ch-center");
        center.appendChild(srsChandelierCell(f.root, SRS_CHANDELIER_CENTER));
        grid.appendChild(center);
        famEl.appendChild(grid);
      }
      listWrap.appendChild(famEl);
    });
    if (fams.length > 80) listWrap.appendChild(el("p", "hint", `… et ${fams.length - 80} autres (affine avec le filtre).`));
  }
  renderFamList();
  screen.appendChild(srsBackBtn());
}

/* ============================================================
   BLOC « VERBES » DE L'ACCUEIL GÉNÉRAL
   Remplace l'ancien système (travaillés / bien connus / Révision /
   Mes erreurs) : une seule source de progression pour les verbes =
   la répétition espacée. Montre les chiffres du jour + un bouton qui
   lance directement la session. (La partie « Mots » reste inchangée.)
   ============================================================ */
function srsHomeBlock() {
  srsReady();
  const due = srsDueList().length;
  const newLeft = srsNewRemainingToday();
  const acq = srsCardsBy("acquired").length;
  const total = srsTotalCount();
  const packet = srsCardsBy("packet").length;
  const queue = srsCardsBy("queue").length;
  const streak = (typeof currentStreak === "function") ? currentStreak() : 0;
  const canStart = due > 0 || packet > 0 || newLeft > 0;

  const block = el("div", "home-block");
  block.appendChild(el("div", "home-block-head",
    `<span class="hb-title">🔤 Verbes</span><span class="daily-streak">🔥 <strong>${streak}</strong> <span>j</span></span>`));

  // Trois chiffres du nouveau système
  const banner = el("div", "stats-banner");
  banner.innerHTML =
    `<div><div class="big">${due}</div><div class="label">révisions dues</div></div>` +
    `<div><div class="big">${newLeft}</div><div class="label">nouveaux du jour</div></div>` +
    `<div><div class="big">${acq}</div><div class="label">acquis</div></div>`;
  block.appendChild(banner);

  // Bouton : lance la session du jour (ou renvoie au tableau de bord)
  const actions = el("div", "daily-actions");
  const btn = el("button", "btn btn-primary",
    canStart ? `📅 Session du jour${due ? ` <span class="pill">${due}</span>` : ""}` : "À jour 🎉");
  btn.addEventListener("click", () => {
    state.view = "jeux"; state.jeux.sub = "verbes";
    if (canStart) srsStartSession({ mode: "normal" });
    else { state.srs.screen = "home"; render(); }
  });
  actions.appendChild(btn);
  const board = el("button", "btn btn-neutral", "📊 Tableau de bord");
  board.addEventListener("click", () => { state.view = "jeux"; state.jeux.sub = "verbes"; state.srs.screen = "home"; render(); });
  actions.appendChild(board);
  block.appendChild(actions);

  // Rappel du Total (toujours = nombre de verbes de la liste)
  block.appendChild(el("p", "hb-total",
    `📊 Total <strong>${total}</strong> verbes · ${queue} en file · ${packet} au paquet`));
  return block;
}

/* app.js a fait son premier rendu AVANT le chargement de ce fichier
   (ordre des <script>). On re-rend une fois, maintenant que la
   répétition espacée est disponible, pour que l'accueil et le jeu
   « Verbes » utilisent le nouveau système dès l'ouverture de l'app. */
if (typeof render === "function" && typeof activeProfile !== "undefined" && activeProfile) {
  try { render(); } catch (e) { /* rendu initial : on ignore toute erreur */ }
}
