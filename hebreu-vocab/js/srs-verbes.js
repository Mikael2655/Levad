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
    daily: { date: todayStr(), newIntroduced: 0 },
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
  return srsData;
}
/* Remise à zéro du compteur de nouveaux verbes quand le jour change. */
function srsEnsureDaily() {
  const t = todayStr();
  if (!srsData.daily || srsData.daily.date !== t) {
    srsData.daily = { date: t, newIntroduced: 0 };
    srsSave();
  }
}

/* ---------- Accès aux verbes (un verbe = une unité) ---------- */
const SRS_VERBS = typeof VERBES !== "undefined" ? VERBES.filter((v) => v.inf) : [];
const SRS_INDEX = {}; // inf -> position (pour départager la file)
SRS_VERBS.forEach((v, i) => (SRS_INDEX[v.inf] = i));

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

/* ---------- Comptages (tableau de bord) ---------- */
function srsCardsBy(status) {
  return SRS_VERBS.map((v) => v.inf).filter((inf) => {
    const c = srsData.cards[inf];
    if (!c) return status === "new";
    return c.status === status;
  });
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
  SRS_VERBS.forEach((v) => {
    const c = srsData.cards[v.inf];
    if (!c) return;
    if ((c.status === "box" || c.status === "acquired") && (c.due == null || c.due <= t)) {
      due.push(v.inf);
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
function srsRefillPacket(extra) {
  srsEnsureDaily();
  const max = srsData.settings.packetMax || 8;
  let room = max - srsCardsBy("packet").length;
  let quota = (srsData.settings.dailyNew || 6) - (srsData.daily.newIntroduced || 0) + (extra || 0);
  let introduced = 0;
  while (room > 0 && quota > 0) {
    const q = srsQueueOrdered();
    if (q.length === 0) break;
    const inf = q[0];
    const c = srsCard(inf);
    c.status = "packet";
    c.streak = 0;
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
    c.added = todayNum() + 1; // en tête de file (plus "récent" que tout)
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
  // Verbes pas encore classés (status "new")
  return SRS_VERBS.filter((v) => {
    const c = srsData.cards[v.inf];
    return !c || c.status === "new";
  });
}
function srsTriageMark(inf, known) {
  const c = srsCard(inf);
  if (known) {
    // Connu → acquis, révision hebdomadaire étalée pour ne pas tout
    // ramener le même jour
    c.status = "acquired";
    c.box = 4;
    c.due = todayNum() + 1 + Math.floor(Math.random() * SRS_ACQUIRED_INTERVAL);
  } else {
    c.status = "queue";
    c.added = todayNum();
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
  const bSet = el("button", "btn btn-ghost", "⚙️ Réglages");
  bSet.addEventListener("click", () => { state.srs.screen = "settings"; render(); });
  [bAdd, bTri, bSet].forEach((b) => actions.appendChild(b));
  screen.appendChild(actions);
}

/* ---------- Tri initial ---------- */
function srsTriageScreen() {
  const list = srsTriageList();
  const total = SRS_VERBS.length;
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
    `<div class="srs-triage-fr">${v.fr}</div>` +
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

  // 3 distracteurs : on préfère des verbes proches (même binyan, 1re
  // lettre, longueur voisine) pour que le choix soit un vrai test.
  const others = SRS_VERBS.filter((o) => o.inf !== v.inf && o.fr);
  function sim(o) {
    let sc = Math.random();
    if (o.binyan && o.binyan === v.binyan) sc += 2;
    if (o.inf[0] === v.inf[0]) sc += 1.5;
    if (Math.abs(o.inf.length - v.inf.length) <= 1) sc += 1;
    return sc;
  }
  const seen = new Set([frMain(v.fr)]);
  const distract = [];
  others.map((o) => [sim(o), o]).sort((a, b) => b[0] - a[0]).forEach(([, o]) => {
    if (distract.length < 3 && !seen.has(frMain(o.fr))) { seen.add(frMain(o.fr)); distract.push(o); }
  });
  const options = shuffle([v, ...distract]);

  const box = el("div", "quiz-options");
  screen.appendChild(box);
  const buttons = [];
  options.forEach((opt) => {
    const btn = el("button", "quiz-option", opt.fr);
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
    `<div class="fr-word">${v.fr}</div>` +
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
    `<div class="fr-word">${v.fr}</div>` +
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
    `${correct ? "✔" : "✘"} <strong>${v.fr}</strong> — <span class="he">${v.inf}</span> ${speakBtn(v.inf)} <span class="feedback-tr">(${v.translit})</span>` +
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
  // verbes en boîte 3+ ou acquis, qui ont présent ET/OU passé
  return SRS_VERBS.filter((v) => {
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

/* On réutilise le routeur : "session-conj" rendu ici */
const _srsRenderSrs = renderSrs;
renderSrs = function () {
  srsReady();
  if (state.srs.screen === "session-conj") return srsSessionConj();
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
  shuffle(SRS_VERBS).forEach((o) => {
    if (o.inf === v.inf) return;
    const he = verbFormHe(o.inf, tense);
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

  // ne proposer que les verbes encore non classés par défaut
  const onlyNew = { v: true };
  screen.appendChild(
    checkToggle("Afficher seulement les verbes non encore classés", onlyNew.v, (val) => { onlyNew.v = val; renderList(); })
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
      c.status = "queue";
      c.added = dayNum;
      c.box = 0; c.streak = 0; c.due = null;
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
    let items = SRS_VERBS;
    if (onlyNew.v) items = items.filter((v) => { const c = srsData.cards[v.inf]; return !c || c.status === "new"; });
    if (q) items = items.filter((v) => normalize(v.fr).includes(q) || v.inf.includes(search.value.trim()));
    items = items.slice(0, 120);
    if (items.length === 0) { listWrap.appendChild(el("p", "hint", "Aucun verbe.")); return; }
    items.forEach((v) => {
      const row = el("label", "srs-add-row" + (selected.has(v.inf) ? " on" : ""));
      const st = srsData.cards[v.inf] ? srsStatusLabel(srsData.cards[v.inf]) : "nouveau";
      row.innerHTML =
        `<input type="checkbox"${selected.has(v.inf) ? " checked" : ""}>` +
        `<span class="he">${v.inf}</span> <span class="srs-add-fr">${v.fr}</span> <span class="srs-add-st">${st}</span>`;
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
