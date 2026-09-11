/* ============================================================
   Mon vocabulaire hébreu — logique de l'application
   (Vous n'avez PAS besoin de modifier ce fichier :
    le vocabulaire s'édite dans js/vocab.js)
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   1. PROGRESSION (répétition espacée, système de "boîtes de Leitner")
   ------------------------------------------------------------
   Chaque mot a une "boîte" de 0 à 4 :
     - bonne réponse  → le mot monte d'une boîte (max 4)
     - mauvaise réponse → le mot retombe en boîte 0
   Les mots des boîtes basses sont tirés beaucoup plus souvent.
   Le tout est sauvegardé dans le navigateur (localStorage).       */

const LEGACY_STORAGE_KEY = "hebreu-vocab-progres"; // ancienne sauvegarde (avant les profils)
const PROFILES_KEY = "hebreu-vocab-profils";
const ACTIVE_PROFILE_KEY = "hebreu-vocab-profil-actif";
const MAX_BOX = 4;

/* ---- Profils : chaque personne a sa propre progression ----
   La liste des profils et le profil actif sont mémorisés dans le
   navigateur ; la progression de chacun est rangée sous sa propre
   clé ("hebreu-vocab-progres-Nom").                              */

function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveProfiles(list) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
}

function storageKeyFor(name) {
  return LEGACY_STORAGE_KEY + "-" + name;
}

/* Correspondance lettres finales → formes normales (ך ם ן ף ץ ne
   peuvent apparaître qu'en fin de mot). */
const FINAL_LETTERS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

/* Garde-fou sur les données : une lettre finale tapée par erreur au
   milieu d'un mot (ex. דןים) est corrigée en sa forme normale (דנים).
   On regarde le caractère suivant : si c'est encore de l'hébreu
   (lettre ou niqqoud), la lettre n'est pas en fin de mot. */
function fixFinalLetters(text) {
  return text.replace(/[ךםןףץ](?=[֑-״])/g, (c) => FINAL_LETTERS[c]);
}

function loadProgress() {
  if (!activeProfile) return {};
  try {
    return JSON.parse(localStorage.getItem(storageKeyFor(activeProfile))) || {};
  } catch {
    return {};
  }
}

function saveProgress() {
  if (!activeProfile) return;
  localStorage.setItem(storageKeyFor(activeProfile), JSON.stringify(progress));
}

function createProfile(name) {
  name = name.trim();
  if (!name) return;
  const profiles = getProfiles();
  if (!profiles.includes(name)) {
    profiles.push(name);
    saveProfiles(profiles);
    /* Migration : la progression d'avant les profils est rattachée
       au tout premier profil créé, pour ne rien perdre. */
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && profiles.length === 1 && !localStorage.getItem(storageKeyFor(name))) {
      localStorage.setItem(storageKeyFor(name), legacy);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }
  selectProfile(name);
}

function selectProfile(name) {
  activeProfile = name;
  localStorage.setItem(ACTIVE_PROFILE_KEY, name);
  progress = loadProgress();
  stats = loadStats();
  updateProfileChip();
  switchView("home");
}

function deleteProfile(name) {
  saveProfiles(getProfiles().filter((p) => p !== name));
  localStorage.removeItem(storageKeyFor(name));
  if (activeProfile === name) {
    activeProfile = null;
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    progress = {};
    updateProfileChip();
  }
  render();
}

/* Clé de sauvegarde d'un élément : les mots utilisent leur hébreu,
   les formes conjuguées ont une clé dédiée (verbe + temps + personne). */
function itemKey(item) {
  return item.key || item.he;
}

function getWordStats(word) {
  const k = itemKey(word);
  if (!progress[k]) {
    progress[k] = { box: 0, seen: 0, ok: 0, ko: 0 };
  }
  return progress[k];
}

/* Répétition espacée « à date » : après une bonne réponse, le mot est
   reprogrammé à un intervalle qui grandit avec sa boîte (1, 2, 4, 9,
   20 jours) ; après une erreur, il redevient dû aujourd'hui. */
const SRS_INTERVALS = [1, 2, 4, 9, 20];

function todayNum() {
  const d = new Date();
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}
function todayStr() {
  return new Date().toLocaleDateString("fr-CA"); // AAAA-MM-JJ
}

function recordAnswer(word, isCorrect) {
  const s = getWordStats(word);
  s.seen += 1;
  if (isCorrect) {
    s.ok += 1;
    s.box = Math.min(MAX_BOX, s.box + 1);
  } else {
    s.ko += 1;
    s.box = 0; // le mot raté revient au début : il ressortira souvent
  }
  s.due = todayNum() + (isCorrect ? SRS_INTERVALS[s.box] : 0);
  saveProgress();
  bumpDailyCount();
}

/* Un élément est « à réviser aujourd'hui » s'il a déjà été vu et que
   sa date de révision est atteinte (ou absente, pour les anciennes
   sauvegardes d'avant la planification). */
function isDue(s) {
  return s && s.seen > 0 && (s.due == null || s.due <= todayNum());
}

/* ---- Statistiques quotidiennes : objectif + série (streak) ---- */
const STATS_PREFIX = "hebreu-vocab-stats-";
function statsKey() {
  return STATS_PREFIX + activeProfile;
}
function loadStats() {
  if (!activeProfile) return { goal: 20, days: {} };
  try {
    const s = JSON.parse(localStorage.getItem(statsKey())) || {};
    return { goal: s.goal || 20, days: s.days || {} };
  } catch {
    return { goal: 20, days: {} };
  }
}
function saveStats() {
  if (activeProfile) localStorage.setItem(statsKey(), JSON.stringify(stats));
}
function bumpDailyCount() {
  const d = todayStr();
  stats.days[d] = (stats.days[d] || 0) + 1;
  saveStats();
}
function todayCount() {
  return stats.days[todayStr()] || 0;
}
/* Série : nombre de jours consécutifs (jusqu'à aujourd'hui ou hier)
   où au moins une réponse a été donnée. */
function currentStreak() {
  let streak = 0;
  const d = new Date();
  // Si rien aujourd'hui, la série peut encore tenir depuis hier
  if (!stats.days[todayStr()]) d.setDate(d.getDate() - 1);
  while (true) {
    const key = d.toLocaleDateString("fr-CA");
    if (stats.days[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

/* Tirage pondéré : plus la boîte est basse, plus le mot a de
   chances de sortir. Un mot jamais vu est prioritaire.
   Poids : boîte 0 → 25, 1 → 16, 2 → 9, 3 → 4, 4 → 1              */
function pickWord(pool, avoid) {
  const candidates = pool.filter((w) => w !== avoid);
  const list = candidates.length > 0 ? candidates : pool;

  let total = 0;
  const weights = list.map((w) => {
    const s = progress[itemKey(w)];
    const box = s ? s.box : 0;
    const neverSeen = !s || s.seen === 0;
    const weight = Math.pow(MAX_BOX + 1 - box, 2) + (neverSeen ? 15 : 0);
    total += weight;
    return weight;
  });

  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

/* ------------------------------------------------------------
   2. ÉTAT GLOBAL
   ------------------------------------------------------------ */

let activeProfile = localStorage.getItem(ACTIVE_PROFILE_KEY) || null;
if (activeProfile && !getProfiles().includes(activeProfile)) activeProfile = null;
let progress = loadProgress();
let stats = loadStats();
let reviewScope = localStorage.getItem("hebreu-vocab-review-scope") || "tout"; // Tout / mots / verbes

const state = {
  view: "home",
  category: "Tous",
  currentWord: null,
  reverse: false, // sens de la question : false = hébreu→français, true = français→hébreu
  session: { ok: 0, ko: 0 }, // score de la session en cours
  conj: { mode: "qcm", tenses: new Set(), binyans: new Set(), newOnly: false, verb: 0, current: null, reverse: false, audioRev: false }, // onglet Verbes
  confus: { mode: "qcm", family: null, current: null, reverse: false }, // sous-menu Verbes proches
  vocab: { mode: "flashcards", newOnly: false }, // onglet Vocabulaire
  combine: { phrase: null, reverse: false, newV: false, newN: false }, // onglet Combiné
  home: { vocabNew: false, verbNew: false }, // options de l'accueil
  prog: { content: "Tout", status: "Tous", level: "Tous", rouge: "Tous", shown: 300 }, // filtres Progrès
  search: { q: "", openVerb: null }, // onglet Recherche (openVerb = verbe déplié)
  tables: { q: "", openVerb: null, newOnly: false }, // page « Tableaux de conjugaison »
  review: { active: false, mode: "due", queue: [], idx: 0, ok: 0, ko: 0, missed: [], flipped: false }, // révision du jour
};

/* Nettoyage des données au chargement : on corrige les lettres
   finales mal placées dans le vocabulaire et les verbes, pour que
   l'app n'affiche jamais une forme impossible. */
VOCAB.forEach((w) => {
  w.he = fixFinalLetters(w.he);
});
if (typeof VERBES !== "undefined") {
  VERBES.forEach((v) => {
    v.inf = fixFinalLetters(v.inf);
    Object.values(v.temps).forEach((forms) =>
      forms.forEach((f) => {
        f.he = fixFinalLetters(f.he);
      })
    );
  });
}

/* Les derniers éléments des fichiers (= le bas de votre tableau Excel)
   forment la catégorie « Nouvel ajout » : elle suit automatiquement
   les derniers mots et verbes ajoutés, sans rien à maintenir. */
const NEW_COUNT = 50;
VOCAB.slice(-NEW_COUNT).forEach((w) => {
  if (w.cat === "Général") w.cat = "🆕 Nouvel ajout";
});
const NEW_VERBS = new Set(typeof VERBES !== "undefined" ? VERBES.slice(-NEW_COUNT) : []);

/* On "déplie" les verbes (js/verbes.js) en une liste plate de formes
   conjuguées : chaque forme devient un exercice avec sa propre clé
   de progression. */
const CONJ_ITEMS = [];
if (typeof VERBES !== "undefined") {
  VERBES.forEach((verb) => {
    Object.entries(verb.temps).forEach(([tense, forms]) => {
      forms.forEach((form, i) => {
        CONJ_ITEMS.push({
          key: `V|${verb.inf}|${tense}|${i}`,
          verb,
          tense,
          personne: form.p,
          he: form.he,
          translit: form.t,
        });
      });
    });
    // L'infinitif est aussi une question à part entière (QCM et écrire)
    if (verb.inf) {
      CONJ_ITEMS.push({
        key: `V|${verb.inf}|Infinitif|0`,
        verb,
        tense: "Infinitif",
        personne: "שם פועל",
        he: verb.inf,
        translit: verb.translit,
        isInf: true,
      });
    }
  });
}
const CONJ_TENSES = [...new Set(CONJ_ITEMS.map((c) => c.tense))];

/* ------------------------------------------------------------
   « Verbes proches » : familles de verbes qui ne diffèrent que
   d'UNE lettre (paires minimales), ex. להציג / להציל / להציע /
   להציץ / להציק. Très difficiles à distinguer à l'oreille et à
   l'écrit : on les regroupe automatiquement pour un jeu dédié.
   ------------------------------------------------------------ */
function confHeLetters(s) {
  return [...String(s)].filter((c) => c >= "א" && c <= "ת");
}
/* Clé « sonore » d'une prononciation : on réduit le translit à des
   phonèmes (ch/kh/ts → 1 symbole, ou → u, glottales retirées) pour
   comparer les verbes SUR LEUR SON, pas sur leur orthographe. Deux
   verbes proches = même son sauf une syllabe (ex. להציג/להציל/להציק),
   alors que להיות/להנוט (lehiyot/lehanot) ne le sont pas. */
function soundKey(tr) {
  return String(tr)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/ou/g, "u")
    .replace(/ch|sh/g, "C")
    .replace(/ts|tz/g, "Z")
    .replace(/kh/g, "K")
    .replace(/[éèê]/g, "e")
    .replace(/[^a-z]/g, "");
}
/* Position de la lettre hébraïque qui varie dans une famille (pour la
   surligner) : uniquement si tous les infinitifs ont la même longueur
   et ne diffèrent qu'à une seule position ; sinon -1 (pas de surlignage). */
function familyDiffPos(infs) {
  const arrs = infs.map((s) => [...String(s)]);
  const len = arrs[0].length;
  if (!arrs.every((a) => a.length === len)) return -1;
  let diff = -1;
  for (let p = 0; p < len; p++) {
    const set = new Set(arrs.map((a) => a[p]));
    if (set.size > 1) {
      if (diff !== -1) return -1; // plus d'une position varie
      diff = p;
    }
  }
  return diff;
}
function buildVerbFamilies() {
  if (typeof VERBES === "undefined") return [];
  const vs = VERBES.filter((v) => v.inf && v.translit && soundKey(v.translit).length >= 3);
  // Regroupe les verbes dont le SON est identique sauf à une position
  const masks = {};
  vs.forEach((v) => {
    const k = soundKey(v.translit);
    for (let p = 0; p < k.length; p++) {
      const key = k.length + "|" + p + "|" + k.slice(0, p) + "_" + k.slice(p + 1);
      (masks[key] = masks[key] || []).push(v);
    }
  });
  let fams = Object.values(masks)
    .filter((a) => a.length >= 3)
    .map((a) => ({ verbs: a }));
  // Dédoublonne les familles à ensemble de verbes identique
  const seen = new Set();
  fams = fams.filter((f) => {
    const sig = f.verbs.map((v) => v.inf).sort().join(",");
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
  fams.forEach((f) => {
    f.pos = familyDiffPos([...new Set(f.verbs.map((v) => v.inf))]);
  });
  fams.sort((a, b) => b.verbs.length - a.verbs.length);
  return fams;
}
const VERB_FAMILIES = buildVerbFamilies();
const BINYANS = typeof VERBES !== "undefined"
  ? [...new Set(VERBES.map((v) => v.binyan).filter(Boolean))]
  : [];

// Index et helpers pour le jeu Combiné
const VERB_BY_INF = {};
if (typeof VERBES !== "undefined") VERBES.forEach((v) => { if (v.inf) VERB_BY_INF[v.inf] = v; });
const VOCAB_BY_HE = {};
if (typeof VOCAB !== "undefined") VOCAB.forEach((w) => { if (!(w.he in VOCAB_BY_HE)) VOCAB_BY_HE[w.he] = w; });
const NEW_VERB_INF = new Set([...(typeof NEW_VERBS !== "undefined" ? NEW_VERBS : [])].map((v) => v.inf));
// Forme hébraïque d'un verbe à un temps donné (repli sur le présent)
function verbFormHe(inf, tense) {
  const v = VERB_BY_INF[inf];
  if (!v) return "";
  const t = v.temps && v.temps[tense] && v.temps[tense][0];
  const pr = v.temps && v.temps["Présent"] && v.temps["Présent"][0];
  return (t && t.he) || (pr && pr.he) || "";
}
function verbIsNew(inf) { return NEW_VERB_INF.has(inf); }
function wordIsNew(he) { const w = VOCAB_BY_HE[he]; return !!(w && w.cat === "🆕 Nouvel ajout"); }

const screen = document.getElementById("screen");

function filteredVocab() {
  return state.vocab.newOnly ? VOCAB.filter((w) => w.cat === "🆕 Nouvel ajout") : VOCAB;
}

/* ---- Cases à cocher (remplacent les menus déroulants) ---- */
// Choix multiple : ensemble vide = « tout ». Bascule l'appartenance au Set.
// Le libellé est sur sa propre ligne ; toutes les cases sont sur la ligne
// d'en dessous (une seule ligne, qui défile si l'écran est trop étroit).
function checkMulti(labelTxt, options, set, onChange) {
  const wrap = el("div", "check-block");
  if (labelTxt) wrap.appendChild(el("div", "check-label", labelTxt));
  const line = el("div", "check-line");
  options.forEach(({ val, text }) => {
    const on = set.has(val);
    const lab = el("label", "check-item" + (on ? " on" : ""));
    lab.innerHTML =
      `<input type="checkbox"${on ? " checked" : ""}><span>${text}</span>`;
    lab.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) set.add(val);
      else set.delete(val);
      onChange();
    });
    line.appendChild(lab);
  });
  wrap.appendChild(line);
  return wrap;
}
// Choix unique (comportement « radio ») rendu en cases à cocher.
function checkSingle(labelTxt, options, current, apply) {
  const wrap = el("div", "check-row");
  if (labelTxt) wrap.appendChild(el("span", "check-label", labelTxt));
  options.forEach(({ val, text }) => {
    const on = val === current;
    const lab = el("label", "check-item" + (on ? " on" : ""));
    lab.innerHTML =
      `<input type="checkbox"${on ? " checked" : ""}><span>${text}</span>`;
    lab.querySelector("input").addEventListener("change", () => {
      apply(val);
    });
    wrap.appendChild(lab);
  });
  return wrap;
}
// Case unique on/off.
function checkToggle(text, checked, apply) {
  const wrap = el("div", "check-row");
  const lab = el("label", "check-item" + (checked ? " on" : ""));
  lab.innerHTML = `<input type="checkbox"${checked ? " checked" : ""}><span>${text}</span>`;
  lab.querySelector("input").addEventListener("change", (e) => apply(e.target.checked));
  wrap.appendChild(lab);
  return wrap;
}
// Barre de filtres des jeux de verbes : temps, binyan, nouveaux ajouts.
function verbFilterBar() {
  const bar = el("div", "filter-bar");
  // « Nouveaux ajouts » en première ligne
  bar.appendChild(
    checkToggle("🆕 Nouveaux ajouts", state.conj.newOnly, (v) => {
      state.conj.newOnly = v;
      state.conj.current = null;
      render();
    })
  );
  bar.appendChild(
    checkMulti("Temps :", CONJ_TENSES.map((t) => ({ val: t, text: t })), state.conj.tenses, () => {
      state.conj.current = null;
      render();
    })
  );
  if (BINYANS.length) {
    bar.appendChild(
      checkMulti("Binyan :", BINYANS.map((b) => ({ val: b, text: b })), state.conj.binyans, () => {
        state.conj.current = null;
        render();
      })
    );
  }
  return bar;
}

/* ------------------------------------------------------------
   3. PETITS OUTILS
   ------------------------------------------------------------ */

// Crée un élément HTML : el("button", "btn btn-good", "Oui !")
function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/* Les nombres écrits en lettres valent les chiffres :
   "encore une fois" == "encore 1 fois". On applique la même
   conversion à la réponse tapée ET à la traduction attendue. */
const NUMBER_WORDS = {
  zero: "0", un: "1", une: "1", deux: "2", trois: "3", quatre: "4",
  cinq: "5", six: "6", sept: "7", huit: "8", neuf: "9", dix: "10",
};

// Normalise une réponse tapée : minuscules, sans accents ni ponctuation
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // enlève les accents
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9 ]/g, " ")     // ponctuation → espace
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(zero|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\b/g, (m) => NUMBER_WORDS[m]);
}

/* La traduction "bonjour / paix" ou "un / une (1)" accepte
   plusieurs bonnes réponses : on découpe sur "/" et on ignore
   les parenthèses. */
function acceptedAnswers(word) {
  return word.fr
    .replace(/\([^)]*\)/g, " ")
    .split("/")
    .map(normalize)
    .filter((a) => a.length > 0);
}

/* Normalise une translittération tapée : minuscules, sans accents,
   sans apostrophes/tirets, et "kh" accepté pour "ch" (חֵית). */
function normalizeTranslit(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "")
    .replace(/kh/g, "ch");
}

/* Garde uniquement les lettres hébraïques (enlève niqqoud, espaces…)
   et assimile les lettres finales (ך ם ן ף ץ) à leur forme normale
   (כ מ נ פ צ) : c'est la même lettre, seule l'apparence change. */
function hebrewLetters(text) {
  return text
    .replace(/[^א-ת]/g, "")
    .replace(/[ךםןףץ]/g, (c) => FINAL_LETTERS[c]);
}

/* Une réponse en hébreu est bonne si elle correspond au mot hébreu
   OU à sa translittération (les variantes "x / y" sont acceptées). */
function checkHebrewAnswer(item, typed) {
  const heTyped = hebrewLetters(typed);
  if (heTyped.length > 0) {
    return String(item.he).split("/").some((v) => hebrewLetters(v) === heTyped);
  }
  const t = normalizeTranslit(typed);
  if (t.length === 0) return false;
  return String(item.translit).split("/").some((v) => normalizeTranslit(v) === t);
}

function mixedFeedback(word) {
  return `<span class="he">${word.he}</span> (<em>${word.translit}</em>) = <strong>${word.fr}</strong>`;
}

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sessionScoreBar() {
  const bar = el(
    "div",
    "session-score",
    `<span class="ok">✔ ${state.session.ok}</span><span class="ko">✘ ${state.session.ko}</span>`
  );
  return bar;
}

/* ------------------------------------------------------------
   4. LES VUES (écrans)
   ------------------------------------------------------------ */

function render() {
  screen.innerHTML = "";
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.view === state.view);
  });
  // Tant que personne n'est identifié, on affiche le choix du profil
  if (!activeProfile || state.view === "profiles") {
    renderProfileGate();
    return;
  }
  const views = {
    home: renderHome,
    verbes: renderVerbes,
    vocab: renderVocab,
    combine: renderCombine,
    search: renderSearch,
    tables: renderTables,
    review: renderReview,
    progress: renderProgress,
  };
  (views[state.view] || renderHome)();
}

function switchView(view) {
  state.view = view;
  state.currentWord = null;
  state.conj.current = null;
  state.confus.current = null;
  state.session = { ok: 0, ko: 0 };
  state.review.active = false;
  render();
}

/* ----- Choix du profil ----- */
function renderProfileGate() {
  screen.appendChild(el("h2", "view-title", "👤 Qui révise aujourd'hui ?"));

  const profiles = getProfiles();
  if (profiles.length > 0) {
    const list = el("div", "profile-list");
    profiles.forEach((name) => {
      const row = el("div", "profile-row");
      const btn = el("button", "profile-btn", `👤 <strong>${name}</strong>`);
      btn.addEventListener("click", () => selectProfile(name));
      row.appendChild(btn);
      const del = el("button", "profile-delete", "✕");
      del.title = "Supprimer ce profil et sa progression";
      del.addEventListener("click", () => {
        if (confirm(`Supprimer le profil « ${name} » et toute sa progression ?`)) {
          deleteProfile(name);
        }
      });
      row.appendChild(del);
      list.appendChild(row);
    });
    screen.appendChild(list);
  } else {
    screen.appendChild(
      el("p", "hint", "Bienvenue ! Créez votre profil pour commencer : votre progression sera enregistrée sous votre prénom.")
    );
  }

  const form = el("form", "write-form");
  const input = el("input", "write-input");
  input.type = "text";
  input.placeholder = "Votre prénom…";
  input.maxLength = 30;
  input.autocapitalize = "words";
  const submit = el("button", "btn btn-primary", profiles.length ? "Ajouter" : "Commencer");
  form.appendChild(input);
  form.appendChild(submit);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    createProfile(input.value);
  });
  screen.appendChild(form);
  if (profiles.length === 0) input.focus();

  screen.appendChild(
    el(
      "p",
      "hint",
      "💡 Chaque profil a sa propre progression sur cet appareil. Pas de mot de passe : c'est un partage de confiance entre amis."
    )
  );
}

function updateProfileChip() {
  const chip = document.getElementById("profile-chip");
  chip.textContent = activeProfile ? `👤 ${activeProfile}` : "👤";
  chip.style.display = activeProfile ? "" : "none";
}

/* ----- Accueil ----- */
function homeBlock(icon, name, scope, newOnly, onToggle) {
  const pool = reviewCards(scope, newOnly);
  const dueCount = pool.filter((c) => isDue(progress[c.key])).length;
  const errCount = pool.filter((c) => {
    const s = progress[c.key];
    return s && s.seen >= 2 && s.ko > s.ok;
  }).length;
  const streak = currentStreak();
  const label = scope === "verbes" ? "des verbes" : "du vocabulaire";

  const block = el("div", "home-block");
  block.appendChild(
    el(
      "div",
      "home-block-head",
      `<span class="hb-title">${icon} ${name}</span><span class="daily-streak">🔥 <strong>${streak}</strong> <span>j</span></span>`
    )
  );
  const actions = el("div", "daily-actions");
  const btnDue = el(
    "button",
    "btn btn-primary",
    `📅 Révision ${label}${dueCount ? ` <span class="pill">${dueCount}</span>` : ""}`
  );
  btnDue.addEventListener("click", () => startReview("due", scope, newOnly));
  actions.appendChild(btnDue);
  const btnErr = el(
    "button",
    "btn btn-neutral",
    `🔴 Mes erreurs${errCount ? ` <span class="pill">${errCount}</span>` : ""}`
  );
  btnErr.disabled = errCount === 0;
  btnErr.addEventListener("click", () => startReview("errors", scope, newOnly));
  actions.appendChild(btnErr);
  block.appendChild(actions);

  block.appendChild(checkToggle("🆕 Nouveaux ajouts", newOnly, onToggle));
  return block;
}

function renderHome() {
  screen.appendChild(el("h2", "view-title home-title", `שלום ${activeProfile} !`));

  // Deux blocs identiques : vocabulaire et verbes
  screen.appendChild(
    homeBlock("📚", "Vocabulaire", "mots", state.home.vocabNew, (v) => {
      state.home.vocabNew = v;
      render();
    })
  );
  screen.appendChild(
    homeBlock("🔤", "Verbes", "verbes", state.home.verbNew, (v) => {
      state.home.verbNew = v;
      render();
    })
  );

  // Objectif du jour (cases à cocher) + point du jour
  screen.appendChild(el("div", "section-label", "🎯 Objectif du jour"));
  screen.appendChild(
    checkSingle(
      "",
      [10, 15, 20, 30, 50].map((n) => ({ val: n, text: n + " cartes" })),
      stats.goal,
      (v) => {
        stats.goal = Number(v);
        saveStats();
        render();
      }
    )
  );
  screen.appendChild(
    el("p", "hint", `Aujourd'hui : ${todayCount()} / ${stats.goal} carte${stats.goal > 1 ? "s" : ""}.`)
  );

  // Totaux séparés : vocabulaire / verbes
  const vSeen = VOCAB.filter((w) => progress[w.he] && progress[w.he].seen > 0).length;
  const vKnown = VOCAB.filter((w) => { const s = progress[w.he]; return s && s.box >= 3; }).length;
  const infItems = CONJ_ITEMS.filter((c) => c.isInf);
  const kSeen = infItems.filter((c) => progress[c.key] && progress[c.key].seen > 0).length;
  const kKnown = infItems.filter((c) => { const s = progress[c.key]; return s && s.box >= 3; }).length;

  screen.appendChild(el("div", "section-label", "📊 Totaux"));
  screen.appendChild(el("p", "hint totals-cap", "📚 Vocabulaire"));
  const tv = el("div", "stats-banner");
  tv.innerHTML = `
    <div><div class="big">${VOCAB.length}</div><div class="label">mots</div></div>
    <div><div class="big">${vSeen}</div><div class="label">travaillés</div></div>
    <div><div class="big">${vKnown}</div><div class="label">bien connus</div></div>`;
  screen.appendChild(tv);
  screen.appendChild(el("p", "hint totals-cap", "🔤 Verbes"));
  const tk = el("div", "stats-banner");
  tk.innerHTML = `
    <div><div class="big">${infItems.length}</div><div class="label">verbes</div></div>
    <div><div class="big">${kSeen}</div><div class="label">travaillés</div></div>
    <div><div class="big">${kKnown}</div><div class="label">bien connus</div></div>`;
  screen.appendChild(tk);
}

/* Tire un nouveau mot ET un sens de question au hasard */
function nextWord(pool, avoid) {
  state.currentWord = pickWord(pool, avoid);
  state.reverse = Math.random() < 0.5;
}

/* Filtre par thème, affiché en haut des jeux de vocabulaire. */
function categoryFilter() {
  const wrap = el("div", "conj-filter");
  wrap.appendChild(el("span", "hint", "Thème : "));
  const sel = el("select", "conj-select");
  ["Tous", ...new Set(VOCAB.map((w) => w.cat))].forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = cat;
    if (cat === state.category) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", () => {
    state.category = sel.value;
    state.currentWord = null;
    render();
  });
  wrap.appendChild(sel);
  return wrap;
}

/* ------------------------------------------------------------
   📅 Révision du jour (session bornée, en flashcards, avec récap)
   ------------------------------------------------------------ */

/* Pool de cartes à réviser selon la portée choisie : mots de
   vocabulaire et/ou verbes à l'infinitif. Chaque carte porte une clé
   de progression ; pour les infinitifs, c'est la même que le QCM de
   conjugaison, donc la mémoire est partagée. */
function reviewCards(scope, newOnly) {
  const s = scope || "tout";
  const cards = [];
  if (s !== "verbes") {
    let ws = VOCAB;
    if (newOnly) ws = ws.filter((w) => w.cat === "🆕 Nouvel ajout");
    ws.forEach((w) =>
      cards.push({ he: w.he, translit: w.translit, fr: w.fr, cat: w.cat, note: w.note || "", key: w.he })
    );
  }
  if (s !== "mots" && typeof CONJ_ITEMS !== "undefined") {
    let cs = CONJ_ITEMS.filter((c) => c.isInf);
    if (newOnly) cs = cs.filter((c) => NEW_VERBS.has(c.verb));
    cs.forEach((c) =>
      cards.push({
        he: c.he,
        translit: c.translit,
        fr: c.verb.fr,
        cat: "🔤 Verbe (infinitif)",
        note: c.verb.binyan ? "Binyan " + c.verb.binyan : "",
        key: c.key,
        verb: c.verb, // pour afficher la conjugaison au verso
      })
    );
  }
  return cards;
}

/* Mini-tableau de conjugaison (formes de référence des 3 temps),
   affiché au dos d'une carte de verbe pendant la révision. */
function conjMini(verb) {
  const rows = Object.entries(verb.temps)
    .map(([tense, forms]) => {
      const f = forms[0];
      if (!f) return "";
      return `<tr>
        <td class="cm-tense">${tense}</td>
        <td class="he cm-he">${f.he} ${speakBtn(f.he)}</td>
        <td class="cm-tr">${f.t}</td>
      </tr>`;
    })
    .join("");
  return rows ? `<table class="conj-mini">${rows}</table>` : "";
}

function startReview(mode, scope, newOnly) {
  const pool = reviewCards(scope, newOnly);
  let queue;
  if (mode === "errors") {
    queue = shuffle(
      pool.filter((c) => {
        const s = progress[c.key];
        return s && s.seen >= 2 && s.ko > s.ok;
      })
    );
  } else {
    // Les cartes dues aujourd'hui, complétées par des nouvelles jusqu'à l'objectif
    const due = shuffle(pool.filter((c) => isDue(progress[c.key])));
    const neuf = shuffle(pool.filter((c) => !progress[c.key] || progress[c.key].seen === 0));
    queue = due.slice(0, stats.goal);
    if (queue.length < stats.goal) queue = queue.concat(neuf.slice(0, stats.goal - queue.length));
  }
  // Sens tiré au sort pour chaque carte : hébreu→français ou l'inverse
  queue.forEach((c) => (c.rev = Math.random() < 0.5));
  state.review = { active: true, mode, scope: scope || "tout", queue, idx: 0, ok: 0, ko: 0, missed: [], flipped: false };
  state.view = "review";
  render();
}

function renderReview() {
  const r = state.review;

  const scopeLbl = r.scope === "verbes" ? "des verbes" : r.scope === "mots" ? "du vocabulaire" : "du jour";
  const dueTitle = "📅 Révision " + scopeLbl;

  // Rien à réviser
  if (r.active && r.queue.length === 0) {
    screen.appendChild(el("h2", "view-title", r.mode === "errors" ? "🔴 Réviser mes erreurs" : dueTitle));
    screen.appendChild(
      el(
        "p",
        "hint",
        r.mode === "errors"
          ? "Aucun mot en difficulté pour l'instant — bravo ! 🎉"
          : "Rien à réviser aujourd'hui : vous êtes à jour ! 🎉 Revenez demain, ou entraînez-vous librement dans les autres onglets."
      )
    );
    const back = el("button", "btn btn-primary", "← Retour à l'accueil");
    back.style.marginTop = "1rem";
    back.addEventListener("click", () => switchView("home"));
    screen.appendChild(back);
    return;
  }

  // Fin de session → récap
  if (r.idx >= r.queue.length) return renderReviewRecap();

  const word = r.queue[r.idx];
  const reverse = !!word.rev; // true : on montre le français, on cherche l'hébreu

  screen.appendChild(
    el("h2", "view-title", r.mode === "errors" ? "🔴 Mes erreurs" : dueTitle)
  );

  // Barre de progression de la session
  const prog = el("div", "review-progress");
  prog.innerHTML = `
    <div class="review-count">${r.idx + 1} / ${r.queue.length}</div>
    <div class="daily-bar"><div class="daily-bar-fill" style="width:${Math.round((r.idx / r.queue.length) * 100)}%"></div></div>
    <div class="review-score"><span class="ok">✔ ${r.ok}</span> <span class="ko">✘ ${r.ko}</span></div>`;
  screen.appendChild(prog);

  // Flashcard
  const scene = el("div", "flash-scene");
  const card = el("div", "flash-card" + (r.flipped ? " flipped" : "") + (word.verb ? " has-conj" : ""));
  const front = reverse
    ? `<span class="word-cat">${word.cat}</span>
       <div class="fr-word" style="font-size:1.5rem">${word.fr}</div>
       <div class="tap-hint">👆 Touchez pour voir l'hébreu</div>`
    : `<span class="word-cat">${word.cat}</span>
       <div class="he-word he">${word.he} ${speakBtn(word.he)}</div>
       <div class="translit">${word.translit}</div>
       <div class="tap-hint">👆 Touchez pour voir la traduction</div>`;
  card.innerHTML = `
    <div class="flash-face front">${front}</div>
    <div class="flash-face back">
      <span class="word-cat">${word.cat}</span>
      <div class="fr-word" style="font-size:1.4rem">${word.fr}</div>
      <div class="he-word he" style="font-size:1.6rem">${word.he} ${speakBtn(word.he)}</div>
      <div class="translit">${word.translit}</div>
      ${word.verb ? conjMini(word.verb) : ""}
      ${!word.verb && word.note ? `<div class="word-note">💡 ${word.note}</div>` : ""}
    </div>`;
  scene.appendChild(card);
  screen.appendChild(scene);

  const buttons = el("div", "flash-buttons");
  const btnKo = el("button", "btn btn-bad", "😕 Je ne savais pas");
  const btnOk = el("button", "btn btn-good", "😀 Je savais !");
  btnKo.disabled = btnOk.disabled = !r.flipped;
  buttons.appendChild(btnKo);
  buttons.appendChild(btnOk);
  screen.appendChild(buttons);

  card.addEventListener("click", () => {
    r.flipped = true;
    render();
  });

  function answer(correct) {
    recordAnswer(word, correct);
    r[correct ? "ok" : "ko"] += 1;
    if (!correct) r.missed.push(word);
    r.idx += 1;
    r.flipped = false;
    render();
  }
  btnOk.addEventListener("click", () => answer(true));
  btnKo.addEventListener("click", () => answer(false));

  const quit = el("button", "btn-link", "Arrêter la session");
  quit.addEventListener("click", () => switchView("home"));
  screen.appendChild(quit);
}

function renderReviewRecap() {
  const r = state.review;
  const total = r.ok + r.ko;
  screen.appendChild(el("h2", "view-title", "🎉 Session terminée !"));

  const recap = el("div", "stats-banner");
  recap.innerHTML = `
    <div><div class="big">${total}</div><div class="label">révisés</div></div>
    <div><div class="big" style="color:var(--good)">${r.ok}</div><div class="label">réussis</div></div>
    <div><div class="big" style="color:var(--bad)">${r.ko}</div><div class="label">à revoir</div></div>`;
  screen.appendChild(recap);

  const streak = currentStreak();
  screen.appendChild(
    el("p", "hint", `🔥 Série : ${streak} jour${streak > 1 ? "s" : ""} d'affilée. Aujourd'hui : ${todayCount()} / ${stats.goal}.`)
  );

  if (r.missed.length > 0) {
    screen.appendChild(el("p", "hint", "À revoir :"));
    const list = el("div", "word-list");
    r.missed.forEach((w) => {
      const row = el("div", "word-row struggling");
      row.innerHTML = `
        <div class="he">${w.he} ${speakBtn(w.he)}</div>
        <div class="infos"><div class="fr">${w.fr}</div><div class="translit">${w.translit}</div></div>`;
      list.appendChild(row);
    });
    screen.appendChild(list);
  }

  const actions = el("div", "daily-actions");
  if (r.missed.length > 0) {
    const again = el("button", "btn btn-primary", "🔁 Revoir mes erreurs");
    again.addEventListener("click", () => {
      const missed = r.missed.slice();
      state.review = { active: true, mode: "errors", queue: shuffle(missed), idx: 0, ok: 0, ko: 0, missed: [], flipped: false };
      render();
    });
    actions.appendChild(again);
  }
  const home = el("button", "btn btn-neutral", "← Accueil");
  home.addEventListener("click", () => switchView("home"));
  actions.appendChild(home);
  screen.appendChild(actions);
}

/* ----- Flashcards ----- */
function renderFlashcards() {
  const pool = filteredVocab();
  if (pool.length === 0) return renderEmpty();

  if (!state.currentWord) nextWord(pool, null);
  const word = state.currentWord;

  screen.appendChild(sessionScoreBar());

  // Le recto varie selon le sens tiré au sort ; le verso montre tout
  const front = state.reverse
    ? `<span class="word-cat">${word.cat}</span>
       <div class="fr-word">${word.fr}</div>
       <div class="tap-hint">👆 Touchez la carte pour voir l'hébreu</div>`
    : `<span class="word-cat">${word.cat}</span>
       <div class="he-word he">${word.he}</div>
       <div class="translit">${word.translit}</div>
       <div class="tap-hint">👆 Touchez la carte pour voir la traduction</div>`;

  const scene = el("div", "flash-scene");
  const card = el("div", "flash-card");
  card.innerHTML = `
    <div class="flash-face front">${front}</div>
    <div class="flash-face back">
      <span class="word-cat">${word.cat}</span>
      <div class="he-word he" style="font-size:2.1rem">${word.he} ${speakBtn(word.he)}</div>
      <div class="translit">${word.translit}</div>
      <div class="fr-word" style="font-size:1.3rem">${word.fr}</div>
      ${word.note ? `<div class="word-note">💡 ${word.note}</div>` : ""}
    </div>`;
  scene.appendChild(card);
  screen.appendChild(scene);

  const buttons = el("div", "flash-buttons");
  const btnKo = el("button", "btn btn-bad", "😕 Je ne savais pas");
  const btnOk = el("button", "btn btn-good", "😀 Je savais !");
  btnKo.disabled = btnOk.disabled = true;
  buttons.appendChild(btnKo);
  buttons.appendChild(btnOk);
  screen.appendChild(buttons);

  // On ne peut répondre qu'après avoir retourné la carte
  card.addEventListener("click", () => {
    card.classList.add("flipped");
    btnKo.disabled = btnOk.disabled = false;
  });

  function answer(isCorrect) {
    recordAnswer(word, isCorrect);
    state.session[isCorrect ? "ok" : "ko"] += 1;
    nextWord(pool, word);
    render();
  }
  btnOk.addEventListener("click", () => answer(true));
  btnKo.addEventListener("click", () => answer(false));
}

/* ----- QCM ----- */

/* Après une réponse au QCM, on enchaîne tout seul : vite si c'est
   juste, plus lentement si c'est faux (le temps de lire la correction). */
const QCM_DELAY_OK = 1100;
const QCM_DELAY_KO = 2800;

function renderQuiz() {
  const pool = filteredVocab();
  if (pool.length === 0) return renderEmpty();

  if (!state.currentWord) nextWord(pool, null);
  const word = state.currentWord;
  const reverse = state.reverse; // true : question en français, choix en hébreu

  screen.appendChild(sessionScoreBar());

  const question = el("div", "quiz-question");
  question.innerHTML = reverse
    ? `<span class="word-cat">${word.cat}</span>
       <div class="fr-word">${word.fr}</div>`
    : `<span class="word-cat">${word.cat}</span>
       <div class="he-word he">${word.he}</div>
       <div class="translit">${word.translit}</div>`;
  screen.appendChild(question);

  // 3 mauvaises réponses : de préférence dans la même catégorie, en
  // évitant les doublons d'affichage (deux mots de même traduction)
  const displayOf = (w) => (reverse ? w.he : w.fr);
  const sameCat = VOCAB.filter((w) => w !== word && w.cat === word.cat);
  const others = VOCAB.filter((w) => w !== word && w.cat !== word.cat);
  const seen = new Set([displayOf(word)]);
  const distractors = [];
  shuffle(sameCat).concat(shuffle(others)).forEach((w) => {
    if (distractors.length < 3 && !seen.has(displayOf(w))) {
      seen.add(displayOf(w));
      distractors.push(w);
    }
  });
  const options = shuffle([word, ...distractors]);

  const optionsBox = el("div", "quiz-options");
  screen.appendChild(optionsBox);

  let answered = false;
  const buttons = [];
  options.forEach((option) => {
    const btn = el(
      "button",
      "quiz-option" + (reverse ? " option-he" : ""),
      reverse ? `<span class="he">${option.he}</span>` : option.fr
    );
    buttons.push({ btn, option });
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const isCorrect = option === word;
      recordAnswer(word, isCorrect);
      state.session[isCorrect ? "ok" : "ko"] += 1;

      buttons.forEach(({ btn: b, option: o }) => {
        b.disabled = true;
        if (o === word) b.classList.add("correct");
      });
      if (!isCorrect) {
        btn.classList.add("wrong");
        screen.appendChild(el("div", "feedback bad", `✘ ${mixedFeedback(word)}`));
      }

      // Enchaînement automatique (sauf si on a changé d'écran entre-temps)
      setTimeout(() => {
        if (state.view === "vocab" && state.vocab.mode === "quiz" && state.currentWord === word) {
          nextWord(pool, word);
          render();
        }
      }, isCorrect ? QCM_DELAY_OK : QCM_DELAY_KO);
    });
    optionsBox.appendChild(btn);
  });
}

/* ----- Mode "écris la traduction" ----- */
function renderWrite() {
  const pool = filteredVocab();
  if (pool.length === 0) return renderEmpty();

  if (!state.currentWord) nextWord(pool, null);
  const word = state.currentWord;
  const reverse = state.reverse; // true : le français est affiché, on écrit l'hébreu

  screen.appendChild(sessionScoreBar());

  const question = el("div", "quiz-question");
  question.innerHTML = reverse
    ? `<span class="word-cat">${word.cat}</span>
       <div class="fr-word">${word.fr}</div>`
    : `<span class="word-cat">${word.cat}</span>
       <div class="he-word he">${word.he}</div>
       <div class="translit">${word.translit}</div>`;
  screen.appendChild(question);

  if (reverse) {
    screen.appendChild(
      el("p", "hint write-hint", "Tapez le mot en hébreu ou en prononciation (ex. <em>shalom</em>).")
    );
  }

  const form = el("form", "write-form");
  const input = el("input", "write-input");
  input.type = "text";
  input.placeholder = reverse ? "En hébreu ou en prononciation…" : "Traduction en français…";
  input.autocapitalize = "off";
  input.autocomplete = "off";
  const submit = el("button", "btn btn-primary", "Valider");
  form.appendChild(input);
  form.appendChild(submit);
  screen.appendChild(form);
  // Quand le clavier s'ouvre, on garde l'énoncé visible au-dessus
  input.addEventListener("focus", () => {
    setTimeout(() => question.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  });
  input.focus();

  let answered = false;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (answered || input.value.trim() === "") return;
    answered = true;

    const isCorrect = reverse
      ? checkHebrewAnswer(word, input.value)
      : acceptedAnswers(word).includes(normalize(input.value));
    recordAnswer(word, isCorrect);
    state.session[isCorrect ? "ok" : "ko"] += 1;

    const feedback = el(
      "div",
      "feedback " + (isCorrect ? "good" : "bad"),
      isCorrect
        ? `✔ Bravo ! ${mixedFeedback(word)}`
        : `✘ Presque… la réponse était : ${mixedFeedback(word)}`
    );
    screen.appendChild(feedback);
    input.disabled = true;
    submit.disabled = true;

    const next = el("button", "btn btn-primary", "Mot suivant →");
    next.style.marginTop = "1rem";
    next.style.width = "100%";
    next.addEventListener("click", () => {
      nextWord(pool, word);
      render();
    });
    screen.appendChild(next);
    next.focus();
  });
}

/* ----- Conjugaison ----- */

function conjPool() {
  let pool = CONJ_ITEMS;
  const t = state.conj.tenses, b = state.conj.binyans;
  if (t.size) pool = pool.filter((c) => t.has(c.tense));
  if (b.size) pool = pool.filter((c) => b.has(c.verb.binyan));
  if (state.conj.newOnly) pool = pool.filter((c) => NEW_VERBS.has(c.verb));
  return pool;
}

/* ----- Onglet Verbes (QCM / Écrire / Audio / Proches) ----- */
function renderVerbes() {
  screen.appendChild(el("h2", "view-title", "🔤 Verbes"));

  if (CONJ_ITEMS.length === 0) {
    screen.appendChild(
      el("p", "hint", "Aucun verbe pour l'instant. Ajoutez-en dans <code>js/verbes.js</code> !")
    );
    return;
  }

  const seg = el("div", "segmented");
  [
    ["qcm", "✅ QCM"],
    ["write", "✍️ Écrire"],
    ["audio", "🎧 Audio"],
    ["proches", "🎯 Proches"],
  ].forEach(([mode, label]) => {
    const btn = el("button", "seg-btn" + (state.conj.mode === mode ? " active" : ""), label);
    btn.addEventListener("click", () => {
      state.conj.mode = mode;
      state.conj.current = null;
      state.confus.current = null;
      state.session = { ok: 0, ko: 0 };
      render();
    });
    seg.appendChild(btn);
  });
  screen.appendChild(seg);

  // Filtres (temps, binyan, nouveaux) — sauf pour « Proches » (familles)
  if (state.conj.mode !== "proches") screen.appendChild(verbFilterBar());

  if (state.conj.mode === "qcm") renderConjQuiz();
  else if (state.conj.mode === "audio") renderConjAudio();
  else if (state.conj.mode === "proches") renderConfus();
  else renderConjWrite();
}

/* ----- Onglet Vocabulaire (Flashcards / QCM / Écrire) ----- */
function renderVocab() {
  screen.appendChild(el("h2", "view-title", "📚 Vocabulaire"));

  const seg = el("div", "segmented");
  [
    ["flashcards", "🃏 Flashcards"],
    ["quiz", "✅ QCM"],
    ["write", "✍️ Écrire"],
  ].forEach(([mode, label]) => {
    const btn = el("button", "seg-btn" + (state.vocab.mode === mode ? " active" : ""), label);
    btn.addEventListener("click", () => {
      state.vocab.mode = mode;
      state.currentWord = null;
      state.session = { ok: 0, ko: 0 };
      render();
    });
    seg.appendChild(btn);
  });
  screen.appendChild(seg);

  const bar = el("div", "filter-bar");
  bar.appendChild(
    checkToggle("🆕 Nouveaux ajouts", state.vocab.newOnly, (v) => {
      state.vocab.newOnly = v;
      state.currentWord = null;
      render();
    })
  );
  screen.appendChild(bar);

  if (state.vocab.mode === "flashcards") renderFlashcards();
  else if (state.vocab.mode === "quiz") renderQuiz();
  else renderWrite();
}

/* ------------------------------------------------------------
   🔀 Combiné : une petite phrase qui mêle un VERBE (conjugué) et un
   MOT de vocabulaire. Deux QCM (un par mot) dans les deux sens :
     • phrase en français → retrouver chaque mot en hébreu ;
     • phrase en hébreu   → retrouver chaque mot en français.
   Faute de genre pour les noms, on ne fabrique pas d'article : on
   juxtapose proprement le verbe et le mot, tous deux surlignés.
   ------------------------------------------------------------ */
function frFirst(s) {
  return String(s).replace(/\([^)]*\)/g, "").split("/")[0].trim();
}

/* Banque de phrases écrites à la main : de VRAIES phrases (parfois
   longues), où seuls DEUX mots sont à trouver — un verbe et un mot,
   tous deux de vos listes. Les autres mots (le contexte) peuvent ne
   pas figurer dans le vocabulaire : ils aident à deviner par le sens.
   { v: infinitif → forme hébraïque au temps vT (depuis les données),
     vT: temps du verbe, vFr: verbe conjugué en français,
     nHe/nFr: le mot, frT/heT: la phrase avec {V} et {N}.
   Sujets masculins singuliers → la forme hébraïque (masc. sing.) reste
   correcte. */
// Banque de phrases du jeu « Combiné » : définie dans js/combine-phrases.js
// (COMBINE_PHRASES_RAW). On écarte les phrases dont le verbe est absent.
const COMBINE_PHRASES = (typeof COMBINE_PHRASES_RAW !== "undefined" ? COMBINE_PHRASES_RAW : [])
  .filter((ph) => ph.vHe || verbFormHe(ph.v, ph.vT));

// Pool de distracteurs verbe, par temps (construit à la demande)
const _combineVerbPools = {};
function combineVerbPool(tense) {
  if (!_combineVerbPools[tense]) {
    _combineVerbPools[tense] = CONJ_ITEMS
      .filter((c) => c.tense === tense && !c.isInf)
      .map((c) => ({ he: c.he, fr: frVerbOnly(c) }));
  }
  return _combineVerbPools[tense];
}

// Phrases retenues selon les cases « nouveaux verbes / nouveaux mots »
function combinePool() {
  let pool = COMBINE_PHRASES;
  if (state.combine.newV) pool = pool.filter((p) => verbIsNew(p.v));
  if (state.combine.newN) pool = pool.filter((p) => wordIsNew(p.nHe));
  return pool;
}
function pickCombine() {
  const list = combinePool();
  if (list.length === 0) { state.combine.phrase = null; return; }
  let ph = list[Math.floor(Math.random() * list.length)];
  let guard = 0;
  while (state.combine.phrase && ph === state.combine.phrase && list.length > 1 && guard++ < 8) {
    ph = list[Math.floor(Math.random() * list.length)];
  }
  state.combine.phrase = ph;
  state.combine.reverse = Math.random() < 0.5;
}

function renderCombine() {
  screen.appendChild(el("h2", "view-title", "🔀 Combiné"));

  // Les deux filtres sur une seule ligne (moins de défilement)
  const bar = el("div", "filter-bar");
  const frow = el("div", "check-row");
  const mkToggle = (text, checked, apply) => {
    const lab = el("label", "check-item" + (checked ? " on" : ""));
    lab.innerHTML = `<input type="checkbox"${checked ? " checked" : ""}><span>${text}</span>`;
    lab.querySelector("input").addEventListener("change", (e) => apply(e.target.checked));
    return lab;
  };
  frow.appendChild(mkToggle("🆕 Nouveaux verbes", state.combine.newV, (v) => { state.combine.newV = v; state.combine.phrase = null; render(); }));
  frow.appendChild(mkToggle("🆕 Nouveaux mots", state.combine.newN, (v) => { state.combine.newN = v; state.combine.phrase = null; render(); }));
  bar.appendChild(frow);
  screen.appendChild(bar);

  const pool = combinePool();
  if (pool.length === 0) {
    screen.appendChild(el("p", "hint", "Aucune phrase ne correspond à ce filtre pour l'instant. Décochez une case."));
    return;
  }
  if (!state.combine.phrase || !pool.includes(state.combine.phrase)) pickCombine();
  const ph = state.combine.phrase;
  const reverse = state.combine.reverse;
  const vHe = ph.vHe || verbFormHe(ph.v, ph.vT);

  const hl = (s) => `<span class="cb-hl">${s}</span>`;
  const frSent = ph.frT.replace("{V}", hl(ph.vFr)).replace("{N}", hl(ph.nFr));
  // Le verbe {V} est toujours un repère ; le mot {N} est parfois intégré
  // directement à la phrase (forme indéfinie / état construit). Dans ce cas
  // on souligne quand même le mot là où il apparaît, pour qu'il ne manque
  // jamais de soulignement.
  let heSent = ph.heT.replace("{V}", hl(vHe));
  if (heSent.includes("{N}")) {
    heSent = heSent.replace("{N}", hl(ph.nHe));
  } else {
    const i = heSent.indexOf(ph.nHe);
    if (i >= 0) heSent = heSent.slice(0, i) + hl(ph.nHe) + heSent.slice(i + ph.nHe.length);
  }
  const heRaw = ph.heT.replace("{V}", vHe).replace("{N}", ph.nHe); // pour l'audio
  const heBlock = `<span class="he" dir="rtl">${heSent}</span> ${speakBtn(heRaw)}`;
  const original = reverse ? heBlock : frSent;
  const translation = reverse ? frSent : heBlock;

  const q = el("div", "quiz-question cb-q");
  q.innerHTML =
    `<div class="cb-sentence">${original}</div>` +
    `<div class="cb-flip-hint">👆 Touchez la phrase pour la traduction complète</div>` +
    `<div class="cb-trans" hidden>${translation}</div>`;
  screen.appendChild(q);
  // Toucher la phrase → afficher / masquer la traduction complète
  const sentEl = q.querySelector(".cb-sentence");
  const transEl = q.querySelector(".cb-trans");
  const hintEl = q.querySelector(".cb-flip-hint");
  sentEl.style.cursor = "pointer";
  sentEl.addEventListener("click", () => {
    transEl.hidden = !transEl.hidden;
    hintEl.textContent = transEl.hidden
      ? "👆 Touchez la phrase pour la traduction complète"
      : "👆 Touchez la phrase pour masquer la traduction";
  });

  const verbCorrect = { he: vHe, fr: ph.vFr };
  const wordCorrect = { he: ph.nHe, fr: ph.nFr };
  const disp = (o) => (reverse ? o.fr : o.he);

  let doneCount = 0;
  const nextWrap = el("div");
  const groupsWrap = el("div", "cb-groups");

  function group(kind, correct, pool2, keyPrefix) {
    const srcHtml = reverse ? `<span class="he">${correct.he}</span>` : `<strong>${kind === "verb" ? ph.vFr : ph.nFr}</strong>`;
    groupsWrap.appendChild(el("div", "cb-qlabel", `${kind === "verb" ? "🔤 Verbe" : "📚 Mot"} — ${srcHtml}`));
    const seen = new Set([disp(correct)]);
    const distractors = [];
    shuffle(pool2).forEach((x) => { if (distractors.length < 3 && !seen.has(disp(x))) { seen.add(disp(x)); distractors.push(x); } });
    const options = shuffle([correct, ...distractors]);
    const box = el("div", "quiz-options");
    groupsWrap.appendChild(box);
    let answered = false;
    const btns = [];
    options.forEach((opt) => {
      const label = reverse ? opt.fr : `<span class="he">${opt.he}</span> ${speakBtn(opt.he)}`;
      const btn = el("button", "quiz-option" + (reverse ? "" : " option-he"), label);
      btns.push({ btn, opt });
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const ok = opt === correct;
        recordAnswer({ he: correct.he, key: keyPrefix + correct.he }, ok);
        state.session[ok ? "ok" : "ko"] += 1;
        // On ne désactive PAS les boutons (sinon le 🔊 intégré cesse de
        // fonctionner) : le drapeau « answered » bloque déjà une 2e réponse.
        btns.forEach(({ btn: b, opt: o }) => { b.classList.add("locked"); if (o === correct) b.classList.add("correct"); });
        if (!ok) btn.classList.add("wrong");
        doneCount += 1;
        if (doneCount === 2) {
          const next = el("button", "btn btn-primary conf-next", "Suivant →");
          next.addEventListener("click", () => { pickCombine(); render(); });
          nextWrap.appendChild(next);
        }
      });
      box.appendChild(btn);
    });
  }

  const wordPool = VOCAB.map((w) => ({ he: w.he, fr: frFirst(w.fr) }));
  const doVerb = () => group("verb", verbCorrect, combineVerbPool(ph.vT), "CB-V|");
  const doWord = () => group("word", wordCorrect, wordPool, "");
  // Ordre des deux QCM = ordre d'apparition des mots dans la phrase montrée
  const orderSrc = reverse ? ph.heT : ph.frT;
  const vPos = orderSrc.indexOf("{V}");
  let nPos = orderSrc.indexOf("{N}");
  if (nPos < 0) nPos = reverse ? ph.heT.indexOf(ph.nHe) : ph.frT.indexOf(ph.nFr);
  const verbFirst = nPos < 0 || vPos <= nPos;
  if (verbFirst) { doVerb(); doWord(); } else { doWord(); doVerb(); }

  screen.appendChild(groupsWrap);
  screen.appendChild(nextWrap);
}

/* ------------------------------------------------------------
   🎧 Audio à trous : une phrase courte est donnée en entier (texte
   + audio) dans une langue, avec un marqueur de temps (hier /
   demain / chaque jour) ; la même phrase est affichée dans l'autre
   langue avec le verbe masqué, à retrouver en QCM. Les deux sens
   sont tirés au sort :
     • français donné (lu en audio) → trouver le verbe en hébreu ;
     • hébreu donné (lu en audio)   → trouver le verbe en français.
   ------------------------------------------------------------ */
const AUDIO_CARRIERS = {
  "Présent": { he: "כל יום הוא", fr: "Chaque jour, il" },
  "Passé": { he: "אתמול הוא", fr: "Hier, il" },
  "Futur": { he: "מחר הוא", fr: "Demain, il" },
};

// Le français du verbe se conjugue-t-il proprement à ce temps ?
// (sinon la phrase « il … » serait bancale : on écarte ces verbes ici)
function frConjOk(item) {
  return !!conjugateFrLabel(item.verb.fr, item.tense);
}

function audioPool() {
  // Temps avec phrase support (pas l'infinitif) ET français conjugable
  return conjPool().filter((c) => AUDIO_CARRIERS[c.tense] && frConjOk(c));
}

// Verbe français conjugué, sans le « il » de tête (ex. « mangera »)
function frVerbOnly(item) {
  return frOfConj(item).replace(/^[Ii]l\s+/, "");
}

// Fiche complète d'un verbe (hébreu) : infinitif, racine/binyan et
// conjugaison aux 3 temps. Réutilisée par le bouton « i » de l'audio.
function verbInfoHtml(verb) {
  const inf = `<div class="vi-row"><span class="vi-label">Infinitif</span>` +
    `<span class="he vi-he">${verb.inf} ${speakBtn(verb.inf)}</span>` +
    `<span class="vi-tr">${verb.translit}</span></div>`;
  const rac = verb.racine
    ? `<div class="vi-row"><span class="vi-label">Racine</span>` +
      `<span class="he vi-he">${verb.racine}</span>` +
      (verb.binyan ? `<span class="vi-tr">${verb.binyan}</span>` : "") +
      `</div>`
    : "";
  return `<div class="vi-head">📖 ${verb.fr}</div>${inf}${rac}${conjMini(verb)}`;
}

function renderConjAudio() {
  const pool = audioPool();
  if (pool.length === 0) {
    screen.appendChild(
      el("p", "hint", "Choisissez le temps « Tous », « Présent », « Passé » ou « Futur » pour ce mode.")
    );
    return;
  }
  if (!state.conj.current || !AUDIO_CARRIERS[state.conj.current.tense]) {
    state.conj.current = pickWord(pool, null);
    state.conj.audioRev = Math.random() < 0.5;
  }
  const item = state.conj.current;
  const carrier = AUDIO_CARRIERS[item.tense];
  // reverse = false : on donne le français (audio fr) → trouver l'hébreu
  // reverse = true  : on donne l'hébreu (audio he)   → trouver le français
  const reverse = state.conj.audioRev;
  const heSentence = carrier.he + " " + item.he;
  const frSentence = carrier.fr + " " + frVerbOnly(item);

  screen.appendChild(sessionScoreBar());

  const givenText = reverse ? heSentence : frSentence;
  const givenLang = reverse ? "he" : "fr";
  const givenHtml = reverse
    ? `<div class="audio-given he" dir="rtl">${heSentence}</div>`
    : `<div class="audio-given">${frSentence}</div>`;
  const blankHtml = reverse
    ? `<div class="audio-blankline">${carrier.fr} <span class="audio-blank">______</span></div>`
    : `<div class="audio-blankline he" dir="rtl">${carrier.he} <span class="audio-blank">______</span></div>`;

  const q = el("div", "quiz-question audio-q");
  q.innerHTML = `
    <div class="conf-listen">🎧 Complétez : trouvez le verbe manquant</div>
    <button class="audio-play" data-speak="${givenText.replace(/"/g, "&quot;")}" data-lang="${givenLang}" aria-label="Réécouter">🔊 Réécouter</button>
    ${givenHtml}
    <div class="audio-arrow">↓</div>
    ${blankHtml}`;
  screen.appendChild(q);
  // Pas de lecture automatique : l'audio ne part qu'au clic sur 🔊.

  // Distracteurs : même temps, en préférant les verbes proches
  const rootOf = (v) => hebrewLetters(String(v.racine || ""));
  const itemRoot = rootOf(item.verb);
  function score(c) {
    let s = Math.random();
    if (c.verb.binyan && c.verb.binyan === item.verb.binyan) s += 2;
    if (c.he[0] === item.he[0]) s += 1.5;
    if (Math.abs(c.he.length - item.he.length) <= 1) s += 1;
    const r = rootOf(c.verb);
    if (itemRoot && r) {
      let comm = 0;
      new Set(r).forEach((ch) => { if (itemRoot.includes(ch)) comm++; });
      if (comm >= 2) s += 1.5;
    }
    return s;
  }
  const displayKey = (c) => (reverse ? frVerbOnly(c) : c.he);
  const seen = new Set([displayKey(item)]);
  const distractors = [];
  CONJ_ITEMS
    .filter((c) => c.tense === item.tense && c.verb !== item.verb && frConjOk(c))
    .map((c) => [score(c), c])
    .sort((a, b) => b[0] - a[0])
    .forEach(([, c]) => {
      if (distractors.length < 3 && !seen.has(displayKey(c))) {
        seen.add(displayKey(c));
        distractors.push(c);
      }
    });
  const options = shuffle([item, ...distractors]);

  const optionsBox = el("div", "quiz-options");
  screen.appendChild(optionsBox);

  let answered = false;
  const buttons = [];
  options.forEach((opt) => {
    const btn = reverse
      ? el("button", "quiz-option", frVerbOnly(opt))
      : el("button", "quiz-option option-he", `<span class="he">${opt.he}</span> ${speakBtn(opt.he)}`);
    buttons.push({ btn, opt });
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const isCorrect = opt === item;
      recordAnswer(item, isCorrect);
      state.session[isCorrect ? "ok" : "ko"] += 1;

      buttons.forEach(({ btn: b, opt: o }) => {
        b.classList.add("locked"); // pas de disabled : garde le 🔊 cliquable
        if (o === item) b.classList.add("correct");
      });
      if (!isCorrect) btn.classList.add("wrong");

      // Révèle les deux phrases complètes + la translittération.
      // Le petit « i » (à côté du verbe hébreu) déplie la fiche complète.
      const fb = el("div", "feedback " + (isCorrect ? "good" : "bad"));
      fb.innerHTML =
        `${isCorrect ? "✔" : "✘"} <span class="he">${heSentence}</span> ${speakBtn(item.he)}` +
        ` <button type="button" class="verb-info-btn" title="Voir le verbe en détail" aria-label="Détails du verbe">i</button>` +
        `<br><em>${frSentence}</em> <span class="feedback-tr">(${item.translit})</span>`;
      screen.appendChild(fb);

      const panel = el("div", "verb-info-panel", verbInfoHtml(item.verb));
      panel.hidden = true;
      screen.appendChild(panel);
      fb.querySelector(".verb-info-btn").addEventListener("click", () => {
        panel.hidden = !panel.hidden;
      });

      const next = el("button", "btn btn-primary conf-next", "Suivant →");
      next.addEventListener("click", () => {
        state.conj.current = pickWord(pool, item);
        state.conj.audioRev = Math.random() < 0.5;
        render();
      });
      screen.appendChild(next);
    });
    optionsBox.appendChild(btn);
  });
}

/* ------------------------------------------------------------
   🎯 Verbes proches (paires minimales)
   Un verbe cible ↔ ses cousins qui ne changent que d'une lettre.
   Deux sens tirés au sort : entendre l'hébreu et trouver le sens,
   ou lire le français et retrouver le bon hébreu (parmi des mots
   presque identiques). Après la réponse, on montre toute la
   famille pour bien fixer les différences.
   ------------------------------------------------------------ */

// Regroupe les sens quand un même infinitif a plusieurs traductions
// (ex. להראות = Montrer / Sembler) pour n'afficher qu'une ligne.
function famEntries(fam) {
  const byInf = new Map();
  fam.verbs.forEach((v) => {
    if (!byInf.has(v.inf)) byInf.set(v.inf, { verb: v, frs: [] });
    byInf.get(v.inf).frs.push(v.fr);
  });
  return [...byInf.values()].map((e) => ({
    verb: e.verb,
    he: e.verb.inf,
    translit: e.verb.translit,
    fr: [...new Set(e.frs)].join(" / "),
  }));
}

// Met en évidence la lettre qui change dans la famille (position pos)
function highlightLetter(he, pos) {
  const chars = [...String(he)];
  if (pos < 0 || pos >= chars.length) return String(he);
  chars[pos] = `<span class="conf-diff">${chars[pos]}</span>`;
  return chars.join("");
}

function pickConfus(avoid) {
  // Familles éligibles : au moins 3 entrées de sens distincts
  const fams = VERB_FAMILIES.filter((f) => famEntries(f).length >= 3);
  if (fams.length === 0) return;
  const fam = fams[Math.floor(Math.random() * fams.length)];
  const entries = famEntries(fam);
  let target = entries[Math.floor(Math.random() * entries.length)];
  if (avoid && entries.length > 1) {
    let guard = 0;
    while (target.he === avoid && guard++ < 8)
      target = entries[Math.floor(Math.random() * entries.length)];
  }
  state.confus.family = { pos: fam.pos, entries };
  state.confus.current = { ...target, key: "CF|" + target.he };
  state.confus.reverse = Math.random() < 0.5; // true : on entend l'hébreu, on cherche le sens
}

function renderConfus() {
  if (VERB_FAMILIES.length === 0) {
    screen.appendChild(
      el("p", "hint", "Pas encore de familles de verbes proches à travailler.")
    );
    return;
  }

  const seg = el("div", "segmented sub-seg");
  [
    ["qcm", "✅ Quiz"],
    ["browse", "📖 Familles"],
  ].forEach(([mode, label]) => {
    const btn = el("button", "seg-btn" + (state.confus.mode === mode ? " active" : ""), label);
    btn.addEventListener("click", () => {
      state.confus.mode = mode;
      state.confus.current = null;
      state.session = { ok: 0, ko: 0 };
      render();
    });
    seg.appendChild(btn);
  });
  screen.appendChild(seg);

  screen.appendChild(
    el(
      "p",
      "hint",
      "Ces verbes ne changent que d'<strong>une lettre</strong> et se ressemblent beaucoup — à l'oreille comme à l'écrit."
    )
  );

  if (state.confus.mode === "browse") renderConfusBrowse();
  else renderConfusQuiz();
}

function renderConfusQuiz() {
  if (!state.confus.current) pickConfus(null);
  if (!state.confus.current) {
    screen.appendChild(el("p", "hint", "Pas assez de verbes pour ce jeu."));
    return;
  }
  const item = state.confus.current;
  const fam = state.confus.family;
  const reverse = state.confus.reverse;

  screen.appendChild(sessionScoreBar());

  // Énoncé
  const q = el("div", "quiz-question");
  if (reverse) {
    // On entend / lit l'hébreu, on cherche le sens
    q.innerHTML = `
      <div class="conf-listen">🎧 Quel est ce verbe ?</div>
      <div class="he-word he">${item.he} ${speakBtn(item.he)}</div>
      <div class="translit">${item.translit}</div>`;
  } else {
    // On lit le français, on cherche le bon hébreu (mots presque identiques)
    q.innerHTML = `
      <div class="conf-listen">Lequel s'écrit ainsi ?</div>
      <div class="conf-fr">${item.fr}</div>`;
  }
  screen.appendChild(q);
  // Pas de lecture automatique : l'audio ne part qu'au clic sur 🔊.

  // Options = toute la famille (max 4), la cible incluse
  let opts = fam.entries.slice();
  if (opts.length > 4) {
    opts = opts.filter((e) => e.he !== item.he);
    opts = shuffle(opts).slice(0, 3);
    opts.push(item);
  }
  opts = shuffle(opts);

  const optionsBox = el("div", "quiz-options");
  screen.appendChild(optionsBox);

  let answered = false;
  const buttons = [];
  opts.forEach((opt) => {
    const btn = reverse
      ? el("button", "quiz-option", opt.fr)
      : el(
          "button",
          "quiz-option option-he",
          `<span class="he">${highlightLetter(opt.he, fam.pos)}</span> ${speakBtn(opt.he)}`
        );
    buttons.push({ btn, opt });
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const isCorrect = opt.he === item.he && opt.fr === item.fr;
      recordAnswer(item, isCorrect);
      state.session[isCorrect ? "ok" : "ko"] += 1;

      buttons.forEach(({ btn: b, opt: o }) => {
        b.classList.add("locked"); // pas de disabled : garde le 🔊 cliquable
        if (o.he === item.he && o.fr === item.fr) b.classList.add("correct");
      });
      if (!isCorrect) btn.classList.add("wrong");

      // Récap de toute la famille pour bien fixer les différences
      const recap = el("div", "conf-recap");
      recap.appendChild(el("div", "conf-recap-title", "La famille :"));
      fam.entries.forEach((e) => {
        const row = el("div", "conf-recap-row" + (e.he === item.he ? " is-target" : ""));
        row.innerHTML =
          `<span class="he conf-recap-he">${highlightLetter(e.he, fam.pos)}</span>` +
          `<span class="conf-recap-tr">${e.translit}</span>` +
          `<span class="conf-recap-fr">${e.fr}</span>` +
          speakBtn(e.he);
        recap.appendChild(row);
      });
      screen.appendChild(recap);

      const next = el("button", "btn btn-primary conf-next", "Suivant →");
      next.addEventListener("click", () => {
        pickConfus(item.he);
        render();
      });
      screen.appendChild(next);
    });
    optionsBox.appendChild(btn);
  });
}

function renderConfusBrowse() {
  const list = el("div", "conf-fam-list");
  VERB_FAMILIES.forEach((fam) => {
    const entries = famEntries(fam);
    if (entries.length < 3) return;
    const card = el("div", "conf-fam-card");
    entries.forEach((e) => {
      const row = el("div", "conf-recap-row");
      row.innerHTML =
        `<span class="he conf-recap-he">${highlightLetter(e.he, fam.pos)}</span>` +
        `<span class="conf-recap-tr">${e.translit}</span>` +
        `<span class="conf-recap-fr">${e.fr}</span>` +
        speakBtn(e.he);
      card.appendChild(row);
    });
    list.appendChild(card);
  });
  screen.appendChild(list);
}

/* ------------------------------------------------------------
   Conjugueur français (3e pers. masc. sing.) : affiche « il a
   prouvé » plutôt que « Prouver, passé, il » dans les questions.
   En cas de libellé trop inhabituel, on garde l'ancien affichage.
   ------------------------------------------------------------ */

// Irréguliers : présent 3sg, participe passé, futur 3sg, auxiliaire être ?
const FR_IRREG = {
  "être":       ["est", "été", "sera"],
  "etre":       ["est", "été", "sera"],
  "avoir":      ["a", "eu", "aura"],
  "aller":      ["va", "allé", "ira", "être"],
  "faire":      ["fait", "fait", "fera"],
  "dire":       ["dit", "dit", "dira"],
  "prendre":    ["prend", "pris", "prendra"],
  "comprendre": ["comprend", "compris", "comprendra"],
  "mettre":     ["met", "mis", "mettra"],
  "permettre":  ["permet", "permis", "permettra"],
  "promettre":  ["promet", "promis", "promettra"],
  "venir":      ["vient", "venu", "viendra", "être"],
  "devenir":    ["devient", "devenu", "deviendra", "être"],
  "intervenir": ["intervient", "intervenu", "interviendra", "être"],
  "appartenir": ["appartient", "appartenu", "appartiendra"],
  "soutenir":   ["soutient", "soutenu", "soutiendra"],
  "entretenir": ["entretient", "entretenu", "entretiendra"],
  "souvenir":   ["souvient", "souvenu", "souviendra", "être"],
  "voir":       ["voit", "vu", "verra"],
  "pouvoir":    ["peut", "pu", "pourra"],
  "vouloir":    ["veut", "voulu", "voudra"],
  "devoir":     ["doit", "dû", "devra"],
  "boire":      ["boit", "bu", "boira"],
  "croire":     ["croit", "cru", "croira"],
  "lire":       ["lit", "lu", "lira"],
  "écrire":     ["écrit", "écrit", "écrira"],
  "ecrire":     ["écrit", "écrit", "écrira"],
  "décrire":    ["décrit", "décrit", "décrira"],
  "inscrire":   ["inscrit", "inscrit", "inscrira"],
  "conduire":   ["conduit", "conduit", "conduira"],
  "construire": ["construit", "construit", "construira"],
  "détruire":   ["détruit", "détruit", "détruira"],
  "connaître":  ["connaît", "connu", "connaîtra"],
  "naître":     ["naît", "né", "naîtra", "être"],
  "naitre":     ["naît", "né", "naîtra", "être"],
  "courir":     ["court", "couru", "courra"],
  "mourir":     ["meurt", "mort", "mourra", "être"],
  "dormir":     ["dort", "dormi", "dormira"],
  "mentir":     ["ment", "menti", "mentira"],
  "sortir":     ["sort", "sorti", "sortira", "être"],
  "sentir":     ["sent", "senti", "sentira"],
  "ressentir":  ["ressent", "ressenti", "ressentira"],
  "servir":     ["sert", "servi", "servira"],
  "ouvrir":     ["ouvre", "ouvert", "ouvrira"],
  "découvrir":  ["découvre", "découvert", "découvrira"],
  "cueillir":   ["cueille", "cueilli", "cueillera"],
  "acquérir":   ["acquiert", "acquis", "acquerra"],
  "recevoir":   ["reçoit", "reçu", "recevra"],
  "asseoir":    ["assoit", "assis", "assoira"],
  "rejoindre":  ["rejoint", "rejoint", "rejoindra"],
  "peindre":    ["peint", "peint", "peindra"],
  "plaindre":   ["plaint", "plaint", "plaindra"],
  "convaincre": ["convainc", "convaincu", "convaincra"],
  "résoudre":   ["résout", "résolu", "résoudra"],
  "vivre":      ["vit", "vécu", "vivra"],
  "survivre":   ["survit", "survécu", "survivra"],
  "sourire":    ["sourit", "souri", "sourira"],
  "envoyer":    ["envoie", "envoyé", "enverra"],
  // -er à alternance e/è ou doublement
  "acheter":    ["achète", "acheté", "achètera"],
  "appeler":    ["appelle", "appelé", "appellera"],
  "jeter":      ["jette", "jeté", "jettera"],
  "lever":      ["lève", "levé", "lèvera"],
  "peser":      ["pèse", "pesé", "pèsera"],
  "préférer":     ["préfère", "préféré", "préférera"],
  "espérer":      ["espère", "espéré", "espérera"],
  "considérer":   ["considère", "considéré", "considérera"],
  "compléter":    ["complète", "complété", "complétera"],
  "interpréter":  ["interprète", "interprété", "interprétera"],
  "inquiéter":    ["inquiète", "inquiété", "inquiétera"],
};

// Verbes (non pronominaux) qui se conjuguent avec être au passé composé
const FR_AUX_ETRE = new Set(["arriver", "entrer", "rentrer", "rester", "tomber", "passer", "descendre"]);

const FR_VOWEL = /^[aeiouhàâäéèêëîïôöùûü]/i;

/* Conjugue un verbe français (infinitif, minuscules) à la 3e pers.
   du masc. sing. Renvoie { pres, pc, fut, aux } ou null si inconnu. */
function frVerb(inf) {
  if (FR_IRREG[inf]) {
    const [pres, pp, fut, aux] = FR_IRREG[inf];
    return { pres, pp, fut, aux: aux || (FR_AUX_ETRE.has(inf) ? "être" : "avoir") };
  }
  const aux = FR_AUX_ETRE.has(inf) ? "être" : "avoir";
  if (inf.endsWith("er")) {
    let stem = inf.slice(0, -2);
    let pres = stem.endsWith("y") ? stem.slice(0, -1) + "ie" : stem + "e";
    let fut = stem.endsWith("y") ? stem.slice(0, -1) + "iera" : inf + "a";
    return { pres, pp: stem + "é", fut, aux };
  }
  if (inf.endsWith("ir")) {
    const stem = inf.slice(0, -2);
    return { pres: stem + "it", pp: stem + "i", fut: inf + "a", aux };
  }
  if (inf.endsWith("re")) {
    const stem = inf.slice(0, -2);
    // futur : rendre → rendra (on retire seulement le e final)
    return { pres: stem.endsWith("d") ? stem : null, pp: stem + "u", fut: inf.slice(0, -1) + "a", aux };
  }
  return null;
}

/* Construit la phrase française conjuguée pour un libellé de verbe.
   tense : "Présent" | "Passé" | "Futur". Renvoie null si on ne sait
   pas conjuguer proprement (l'app garde alors l'ancien affichage). */
function conjugateFrLabel(label, tense) {
  // parenthèses retirées D'ABORD (elles peuvent contenir des "/"),
  // puis premier sens seulement
  let seg = label.replace(/\([^)]*\)/g, "").split("/")[0].replace(/\s+/g, " ").trim();
  if (!seg) return null;
  let lower = seg.toLowerCase();

  // pronominal ? (se lever, s'arrêter…) — "s'être …" et les libellés
  // déjà au participe ("avoir raconté") sont trop tordus : on abandonne
  let pronominal = false;
  if (lower.startsWith("s'être")) return null;
  if (lower.startsWith("avoir raconté")) return null;
  if (/^se\s+/.test(lower)) { pronominal = true; lower = lower.replace(/^se\s+/, ""); }
  else if (/^s'/.test(lower)) { pronominal = true; lower = lower.replace(/^s'/, ""); }

  const words = lower.split(" ");
  const inf = words[0];
  const rest = words.slice(1).join(" ");
  const v = frVerb(inf);
  if (!v || !v.pres) return null;

  const se = (w) => (FR_VOWEL.test(w) ? "s'" : "se ") + w;
  let phrase;
  if (tense === "Présent") {
    phrase = "il " + (pronominal ? se(v.pres) : v.pres);
  } else if (tense === "Passé") {
    if (pronominal) phrase = "il s'est " + v.pp;         // il s'est levé
    else if (v.aux === "être") phrase = "il est " + v.pp; // il est allé
    else phrase = "il a " + v.pp;                         // il a prouvé
  } else if (tense === "Futur") {
    phrase = "il " + (pronominal ? se(v.fut) : v.fut);
  } else {
    return null;
  }
  return phrase + (rest ? " " + rest : "");
}

/* Affiche la question : verbe + temps + personne demandés.
   En QCM (hideInf) — et toujours quand la question porte sur
   l'infinitif — on cache l'infinitif hébreu et sa prononciation :
   ils donneraient la réponse. */
function conjQuestionBox(item, hideInf) {
  const hide = hideInf || item.isInf;
  // Question en français déjà conjugué ("il a prouvé") quand la forme
  // demandée est la 3e pers. masc. sing. (c'est le cas de nos données)
  const phrase =
    !item.isInf && item.personne.includes("הוא")
      ? conjugateFrLabel(item.verb.fr, item.tense)
      : null;
  const q = el("div", "quiz-question");
  q.innerHTML = `
    <div class="conj-badges">
      <span class="badge badge-tense">${item.tense}</span>
      ${item.isInf || phrase ? "" : `<span class="badge">${item.personne}</span>`}
      ${item.verb.binyan ? `<span class="badge">${item.verb.binyan}</span>` : ""}
    </div>
    <div class="fr-word">${phrase || item.verb.fr}</div>
    ${hide ? "" : `<div class="translit"><span class="he">${item.verb.inf}</span> · ${item.verb.translit}</div>`}`;
  return q;
}

/* --- Mode tableaux : consulter la conjugaison complète d'un verbe --- */
/* Tableau complet de conjugaison d'un verbe (HTML), affiché dans la
   Recherche quand on ouvre un verbe. */
function verbTablesHtml(verb) {
  let html = "";
  const meta = [
    verb.racine ? `Racine : <span class="he">${verb.racine}</span>` : "",
    verb.binyan ? `Binyan : <span class="he">${verb.binyan}</span>` : "",
  ].filter(Boolean).join(" · ");
  if (meta) html += `<p class="hint conj-meta">${meta}</p>`;
  if (Object.keys(verb.temps).length === 0) {
    html += `<p class="hint">Pas encore de formes pour ce verbe.</p>`;
  }
  Object.entries(verb.temps).forEach(([tense, forms]) => {
    html += `<div class="conj-table-block"><h3 class="conj-tense-title">${tense}</h3><table class="conj-table">`;
    html += forms
      .map(
        (f) => `<tr>
          <td class="personne">${f.p}</td>
          <td class="he form">${f.he}</td>
          <td class="translit">${f.t} ${speakBtn(f.he)}</td>
        </tr>`
      )
      .join("");
    html += `</table></div>`;
  });
  return html;
}

/* Représentation française d'une forme (pour le sens inversé du QCM) :
   verbe déjà conjugué (« il a parlé »), ou l'infinitif pour les
   questions d'infinitif. */
function frOfConj(c) {
  if (c.isInf) return c.verb.fr;
  return conjugateFrLabel(c.verb.fr, c.tense) || c.verb.fr;
}

/* Prend une nouvelle question de conjugaison et tire son sens au sort. */
function pickConj(pool, avoid) {
  state.conj.current = pickWord(pool, avoid);
  state.conj.reverse = Math.random() < 0.5;
}

/* Question hébraïque affichée (sens inversé : on cherche le français). */
function conjQuestionBoxHe(item) {
  const q = el("div", "quiz-question");
  q.innerHTML = `
    <div class="conj-badges">
      <span class="badge badge-tense">${item.tense}</span>
      ${item.isInf ? "" : `<span class="badge">${item.personne}</span>`}
      ${item.verb.binyan ? `<span class="badge">${item.verb.binyan}</span>` : ""}
    </div>
    <div class="he-word he">${item.he}</div>
    <div class="translit">${item.translit}</div>`;
  return q;
}

/* --- QCM de conjugaison : sens tiré au sort à chaque question ---
   français conjugué → 4 formes hébraïques, OU forme hébraïque → 4
   traductions françaises. --- */
function renderConjQuiz() {
  const pool = conjPool();
  if (!state.conj.current) pickConj(pool, null);
  const item = state.conj.current;
  const reverse = state.conj.reverse; // true : hébreu affiché, on cherche le français

  screen.appendChild(sessionScoreBar());
  screen.appendChild(reverse ? conjQuestionBoxHe(item) : conjQuestionBox(item, true));

  // Ce qui distingue les options à l'écran, selon le sens
  const displayOf = (c) => (reverse ? frOfConj(c) : c.he);

  // Distracteurs : tous AU MÊME TEMPS que la question, en préférant
  // les verbes qui ressemblent à la bonne réponse (même binyan,
  // racine proche, même première lettre, longueur voisine) pour que
  // le choix soit un vrai exercice.
  const rootOf = (v) => hebrewLetters(String(v.racine || ""));
  const itemRoot = rootOf(item.verb);
  function ressemblance(c) {
    let s = Math.random(); // départage aléatoire pour varier les questions
    if (c.verb.binyan && c.verb.binyan === item.verb.binyan) s += 3;
    if (c.he[0] === item.he[0]) s += 2;
    if (Math.abs(c.he.length - item.he.length) <= 1) s += 1;
    const r = rootOf(c.verb);
    if (itemRoot && r) {
      let communes = 0;
      new Set(r).forEach((ch) => { if (itemRoot.includes(ch)) communes++; });
      if (communes >= 2) s += 2;
    }
    return s;
  }
  const seen = new Set([displayOf(item)]);
  const distractors = [];
  CONJ_ITEMS
    .filter((c) => c.tense === item.tense && c.verb !== item.verb)
    .map((c) => [ressemblance(c), c])
    .sort((a, b) => b[0] - a[0])
    .forEach(([, c]) => {
      if (distractors.length < 3 && !seen.has(displayOf(c))) {
        seen.add(displayOf(c));
        distractors.push(c);
      }
    });
  // Sécurité : si un temps a trop peu de verbes, on complète ailleurs
  if (distractors.length < 3) {
    shuffle(CONJ_ITEMS).forEach((c) => {
      if (distractors.length < 3 && !seen.has(displayOf(c))) {
        seen.add(displayOf(c));
        distractors.push(c);
      }
    });
  }
  const options = shuffle([item, ...distractors]);

  const optionsBox = el("div", "quiz-options");
  screen.appendChild(optionsBox);

  let answered = false;
  const buttons = [];
  options.forEach((option) => {
    const btn = reverse
      ? el("button", "quiz-option", frOfConj(option))
      : el("button", "quiz-option option-he", `<span class="he">${option.he}</span>`);
    buttons.push({ btn, option });
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const isCorrect = option === item;
      recordAnswer(item, isCorrect);
      state.session[isCorrect ? "ok" : "ko"] += 1;

      buttons.forEach(({ btn: b, option: o }) => {
        b.disabled = true;
        if (o === item) b.classList.add("correct");
      });
      if (!isCorrect) btn.classList.add("wrong");

      screen.appendChild(
        el(
          "div",
          "feedback " + (isCorrect ? "good" : "bad"),
          `${isCorrect ? "✔" : "✘"} <strong>${frOfConj(item)}</strong> — <span class="he">${item.he}</span> (<em>${item.translit}</em>)`
        )
      );

      // Enchaînement automatique
      setTimeout(() => {
        if (state.view === "verbes" && state.conj.mode === "qcm" && state.conj.current === item) {
          pickConj(pool, item);
          render();
        }
      }, isCorrect ? QCM_DELAY_OK : QCM_DELAY_KO);
    });
    optionsBox.appendChild(btn);
  });
}

/* --- Mode écrire : taper la forme (translittération ou hébreu) --- */
function renderConjWrite() {
  const pool = conjPool();
  if (!state.conj.current) state.conj.current = pickWord(pool, null);
  const item = state.conj.current;

  screen.appendChild(sessionScoreBar());
  const question = conjQuestionBox(item);
  screen.appendChild(question);
  screen.appendChild(
    el("p", "hint write-hint", "Tapez la forme demandée, en translittération (ex. <em>katavti</em>) ou en hébreu.")
  );

  const form = el("form", "write-form");
  const input = el("input", "write-input");
  input.type = "text";
  input.placeholder = "En hébreu ou en prononciation…";
  input.autocapitalize = "off";
  input.autocomplete = "off";
  const submit = el("button", "btn btn-primary", "Valider");
  form.appendChild(input);
  form.appendChild(submit);
  screen.appendChild(form);
  // Quand le clavier s'ouvre, on garde l'énoncé visible au-dessus
  input.addEventListener("focus", () => {
    setTimeout(() => question.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  });
  input.focus();

  let answered = false;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (answered || input.value.trim() === "") return;
    answered = true;

    const isCorrect = checkHebrewAnswer(item, input.value);
    recordAnswer(item, isCorrect);
    state.session[isCorrect ? "ok" : "ko"] += 1;

    screen.appendChild(
      el(
        "div",
        "feedback " + (isCorrect ? "good" : "bad"),
        isCorrect
          ? `✔ Bravo ! <span class="he">${item.he}</span> (<em>${item.translit}</em>)`
          : `✘ La réponse était : <span class="he">${item.he}</span> (<em>${item.translit}</em>)`
      )
    );
    input.disabled = true;
    submit.disabled = true;

    const next = el("button", "btn btn-primary", "Suivant →");
    next.style.marginTop = "1rem";
    next.style.width = "100%";
    next.addEventListener("click", () => {
      state.conj.current = pickWord(pool, item);
      render();
    });
    screen.appendChild(next);
    next.focus();
  });
}

/* ----- Recherche globale (mots + verbes, français / hébreu / prononciation) ----- */
function renderSearch() {
  // Comparaison souple : minuscules, sans accents ("écrire" ↔ "ecrire")
  const fold = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // Index unifié des mots et des verbes, construit une fois
  if (!renderSearch.index) {
    const idx = [];
    VOCAB.forEach((w) => {
      idx.push({
        type: "mot",
        he: w.he,
        translit: w.translit,
        fr: w.fr,
        tag: w.cat,
        note: w.note || "",
        hay: fold(w.fr) + " | " + fold(w.translit),
        heRaw: w.he,
      });
    });
    VERBES.forEach((v, i) => {
      idx.push({
        type: "verbe",
        he: v.inf,
        translit: v.translit,
        fr: v.fr,
        tag: "🔤 verbe" + (v.binyan ? " · " + v.binyan : ""),
        verbIndex: i,
        hay: fold(v.fr) + " | " + fold(v.translit),
        heRaw: v.inf,
      });
    });
    renderSearch.index = idx;
  }
  const index = renderSearch.index;

  screen.appendChild(el("h2", "view-title", "🔍 Recherche"));

  // Lien vers les tableaux de conjugaison, au-dessus de la barre de recherche
  const tablesLink = el("button", "tables-link", "📖 Tableaux de conjugaison des verbes →");
  tablesLink.type = "button";
  tablesLink.addEventListener("click", () => switchView("tables"));
  screen.appendChild(tablesLink);

  const search = el("div", "verb-search");
  const input = el("input", "write-input");
  input.type = "search";
  input.placeholder = "🔍 Mot ou verbe, en français ou en hébreu…";
  input.autocapitalize = "off";
  input.autocomplete = "off";
  input.value = state.search.q;
  search.appendChild(input);
  const results = el("div", "verb-results search-results");
  search.appendChild(results);
  screen.appendChild(search);

  screen.appendChild(
    el("p", "hint", "Tapez en français, en prononciation (ex. <em>shalom</em>) ou en hébreu. La recherche trouve le texte où qu'il se trouve dans le mot.")
  );

  function runSearch() {
    const raw = input.value.trim();
    state.search.q = raw;
    const q = fold(raw);
    const qHe = hebrewLetters(raw); // partie hébraïque éventuelle
    results.innerHTML = "";
    if (!q && !qHe) return;

    const matches = index.filter((it) => {
      if (qHe) return hebrewLetters(it.heRaw).includes(qHe);
      return it.hay.includes(q);
    });
    // Pertinence : ce qui commence par la recherche d'abord, puis A→Z
    matches.sort((a, b) => {
      const pa = fold(a.fr).startsWith(q) ? 0 : 1;
      const pb = fold(b.fr).startsWith(q) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.fr.localeCompare(b.fr, "fr");
    });

    results.appendChild(
      el("p", "hint", `${matches.length} résultat${matches.length > 1 ? "s" : ""}${matches.length > 200 ? " (200 affichés)" : ""}.`)
    );
    matches.slice(0, 200).forEach((it) => {
      const row = el("button", "search-row");
      row.type = "button";
      row.innerHTML = `
        <div class="he">${it.he}</div>
        <div class="infos">
          <div class="fr">${it.fr}</div>
          <div class="translit">${it.translit}${it.note ? ` · 💡 ${it.note}` : ""}</div>
        </div>
        ${speakBtn(it.he)}
        <span class="search-tag">${it.tag}</span>`;
      if (it.type === "verbe") {
        row.classList.add("is-verb");
        const open = state.search.openVerb === it.verbIndex;
        if (open) row.classList.add("open");
        row.title = "Voir la conjugaison";
        row.addEventListener("click", () => {
          state.search.openVerb = open ? null : it.verbIndex;
          runSearch();
        });
        results.appendChild(row);
        if (open) {
          const tbl = el("div", "search-conj");
          tbl.innerHTML = verbTablesHtml(VERBES[it.verbIndex]);
          results.appendChild(tbl);
        }
        return;
      }
      row.disabled = true; // un mot n'est pas cliquable (rien à ouvrir)
      results.appendChild(row);
    });
    if (matches.length === 0) {
      results.appendChild(el("p", "hint", "Aucun mot ni verbe trouvé."));
    }
  }

  input.addEventListener("input", runSearch);
  if (state.search.q) runSearch();
  input.focus();
}

/* ----- Page « Tableaux de conjugaison » (depuis la Recherche) ----- */
function renderTables() {
  const fold = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const sorted = VERBES.map((_, i) => i).sort((a, b) =>
    VERBES[a].fr.localeCompare(VERBES[b].fr, "fr")
  );

  const back = el("button", "btn-link tables-back", "← Retour à la recherche");
  back.addEventListener("click", () => switchView("search"));
  screen.appendChild(back);

  screen.appendChild(el("h2", "view-title", "📖 Tableaux de conjugaison"));
  screen.appendChild(
    el("p", "hint", "Cherchez un verbe, puis touchez-le pour voir sa conjugaison complète aux 3 temps.")
  );

  const box = el("div", "verb-search");
  const input = el("input", "write-input");
  input.type = "search";
  input.placeholder = "🔍 Chercher un verbe…";
  input.autocapitalize = "off";
  input.autocomplete = "off";
  input.value = state.tables.q;
  box.appendChild(input);
  // Case « nouveaux verbes », au-dessus de la liste
  box.appendChild(
    checkToggle("🆕 Nouveaux verbes", state.tables.newOnly, (v) => {
      state.tables.newOnly = v;
      render();
    })
  );
  const results = el("div", "verb-results");
  box.appendChild(results);
  screen.appendChild(box);

  function run() {
    const raw = input.value.trim();
    state.tables.q = raw;
    const q = fold(raw);
    const qHe = hebrewLetters(raw);
    results.innerHTML = "";
    let matches = sorted;
    if (state.tables.newOnly) matches = matches.filter((i) => NEW_VERBS.has(VERBES[i]));
    if (q || qHe) {
      matches = matches.filter((i) => {
        const v = VERBES[i];
        return qHe ? hebrewLetters(v.inf).includes(qHe) : fold(v.fr).includes(q) || fold(v.translit).includes(q);
      });
      matches.sort((a, b) => {
        const pa = fold(VERBES[a].fr).startsWith(q) ? 0 : 1;
        const pb = fold(VERBES[b].fr).startsWith(q) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return VERBES[a].fr.localeCompare(VERBES[b].fr, "fr");
      });
    }
    results.appendChild(
      el("p", "hint", `${matches.length} verbe${matches.length > 1 ? "s" : ""} affiché${matches.length > 1 ? "s" : ""} sur ${VERBES.length}.`)
    );
    matches.forEach((i) => {
      const v = VERBES[i];
      const open = state.tables.openVerb === i;
      const row = el(
        "button",
        "verb-result" + (open ? " open" : ""),
        `<strong>${v.fr}</strong> — <span class="he">${v.inf}</span> · ${v.translit}`
      );
      row.type = "button";
      row.addEventListener("click", () => {
        state.tables.openVerb = open ? null : i;
        run();
      });
      results.appendChild(row);
      if (open) {
        const t = el("div", "search-conj");
        t.innerHTML = verbTablesHtml(v);
        results.appendChild(t);
      }
    });
    if (matches.length === 0) results.appendChild(el("p", "hint", "Aucun verbe trouvé."));
  }

  input.addEventListener("input", run);
  run();
}

/* ----- Page Progrès ----- */
function renderProgress() {
  const f = state.prog;

  // Liste unifiée : les mots ET les formes conjuguées, présentés pareil
  const items = [];
  if (f.content !== "Conjugaison") {
    filteredVocab().forEach((w) =>
      items.push({ he: w.he, label: w.fr, translit: w.translit, key: itemKey(w) })
    );
  }
  if (f.content !== "Mots") {
    CONJ_ITEMS.forEach((c) =>
      items.push({ he: c.he, label: `${c.verb.fr} · ${c.tense}`, translit: c.translit, key: c.key })
    );
  }

  const statsOf = (it) => progress[it.key] || { box: 0, seen: 0, ok: 0, ko: 0 };
  const isRed = (s) => s.seen >= 2 && s.ko > s.ok;
  const levelOf = (s) => (s.seen > 0 ? s.box + 1 : 0); // 0 = jamais vu, 1..5 = pastilles

  screen.appendChild(el("h2", "view-title", "📊 Vos progrès"));

  // Résumé (sur le contenu choisi, avant les autres filtres)
  const nSeen = items.filter((it) => statsOf(it).seen > 0).length;
  const nKnown = items.filter((it) => { const s = statsOf(it); return s.seen > 0 && s.box >= 3; }).length;
  const nRed = items.filter((it) => isRed(statsOf(it))).length;
  const summary = el("div", "progress-summary");
  summary.innerHTML = `
    <div class="cell"><div class="big">${nSeen}/${items.length}</div><div class="label">travaillés</div></div>
    <div class="cell"><div class="big">${nKnown}</div><div class="label">bien connus</div></div>
    <div class="cell"><div class="big">${nRed}</div><div class="label">à retravailler</div></div>`;
  screen.appendChild(summary);

  // Barre de filtres
  const bar = el("div", "prog-filters");
  const addFilter = (labelTxt, options, current, apply) => {
    bar.appendChild(
      checkSingle(labelTxt, options.map(([val, text]) => ({ val, text })), current, (v) => {
        apply(v);
        f.shown = 300;
        render();
      })
    );
  };
  addFilter("Contenu :", [["Tout", "Tout"], ["Mots", "Mots"], ["Conjugaison", "Conjugaison"]], f.content, (v) => (f.content = v));
  addFilter("Statut :", [["Tous", "Tous"], ["Déjà vus", "Déjà vus"], ["Jamais vus", "Jamais vus"]], f.status, (v) => (f.status = v));
  addFilter("Niveau :", [["Tous", "Tous"], ["1", "🟢 1"], ["2", "🟢 2"], ["3", "🟢 3"], ["4", "🟢 4"], ["5", "🟢 5"]], f.level, (v) => (f.level = v));
  addFilter("Difficulté :", [["Tous", "Tous"], ["rouge", "🔴 À retravailler"]], f.rouge, (v) => (f.rouge = v));
  screen.appendChild(bar);

  screen.appendChild(
    el("p", "hint", "Les pastilles vertes = niveau de mémorisation (5 = bien ancré). En rouge : ce que vous ratez souvent.")
  );

  // Application des filtres
  const filtered = items.filter((it) => {
    const s = statsOf(it);
    if (f.status === "Déjà vus" && s.seen === 0) return false;
    if (f.status === "Jamais vus" && s.seen > 0) return false;
    if (f.level !== "Tous" && levelOf(s) !== Number(f.level)) return false;
    if (f.rouge === "rouge" && !isRed(s)) return false;
    return true;
  });

  // Tri : les rouges d'abord, puis par niveau croissant
  filtered.sort((a, b) => {
    const sa = statsOf(a), sb = statsOf(b);
    const ra = isRed(sa) ? 0 : 1, rb = isRed(sb) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return sa.box - sb.box;
  });

  screen.appendChild(el("p", "hint", `${filtered.length} élément${filtered.length > 1 ? "s" : ""} correspondent aux filtres.`));

  // Rendu (par tranches, pour rester fluide sur téléphone)
  const list = el("div", "word-list");
  filtered.slice(0, f.shown).forEach((it) => {
    const s = statsOf(it);
    const row = el("div", "word-row" + (isRed(s) ? " struggling" : ""));
    const dots = Array.from({ length: MAX_BOX + 1 }, (_, i) =>
      `<span class="${i <= s.box && s.seen > 0 ? "on" : ""}"></span>`
    ).join("");
    row.innerHTML = `
      <div class="he">${it.he}</div>
      <div class="infos">
        <div class="fr">${it.label}</div>
        <div class="translit">${it.translit} · vu ${s.seen}×${s.seen ? ` · ✔ ${s.ok} / ✘ ${s.ko}` : ""}</div>
      </div>
      <div class="level-dots">${dots}</div>`;
    list.appendChild(row);
  });
  screen.appendChild(list);

  if (filtered.length > f.shown) {
    const more = el("button", "btn btn-neutral", `Afficher plus (${filtered.length - f.shown} restants)`);
    more.style.width = "100%";
    more.style.marginTop = "0.8rem";
    more.addEventListener("click", () => {
      f.shown += 300;
      render();
    });
    screen.appendChild(more);
  }

  /* --- Sauvegarde / restauration de la progression ---
     Utile si le navigateur perd sa mémoire (navigation privée…)
     ou pour transférer sa progression sur un autre appareil. */
  const backupZone = el("div", "reset-zone");
  const backupRow = el("div", "flash-buttons");
  const saveBtn = el("button", "btn btn-neutral", "💾 Sauvegarder ma progression");
  const restoreBtn = el("button", "btn btn-neutral", "📥 Restaurer");
  backupRow.appendChild(saveBtn);
  backupRow.appendChild(restoreBtn);
  backupZone.appendChild(backupRow);
  const backupArea = el("div", "");
  backupZone.appendChild(backupArea);
  screen.appendChild(backupZone);

  function showBackupText(data) {
    backupArea.innerHTML = "";
    backupArea.appendChild(
      el("p", "hint", "Copiez ce code et gardez-le (dans vos Notes par exemple) :")
    );
    const ta = el("textarea", "backup-text");
    ta.value = data;
    ta.readOnly = true;
    ta.addEventListener("focus", () => ta.select());
    backupArea.appendChild(ta);
  }

  saveBtn.addEventListener("click", () => {
    const data = JSON.stringify({
      app: "hebreu-vocab",
      profil: activeProfile,
      date: new Date().toISOString().slice(0, 10),
      progress,
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(data)
        .then(() => {
          backupArea.innerHTML = "";
          backupArea.appendChild(
            el("p", "feedback good", "✔ Progression copiée ! Collez-la dans vos Notes pour la garder en lieu sûr.")
          );
        })
        .catch(() => showBackupText(data));
    } else {
      showBackupText(data);
    }
  });

  restoreBtn.addEventListener("click", () => {
    backupArea.innerHTML = "";
    backupArea.appendChild(el("p", "hint", "Collez ici le code sauvegardé, puis validez :"));
    const ta = el("textarea", "backup-text");
    ta.placeholder = '{"app":"hebreu-vocab", …}';
    backupArea.appendChild(ta);
    const ok = el("button", "btn btn-primary", "Restaurer cette sauvegarde");
    ok.style.marginTop = "0.5rem";
    ok.addEventListener("click", () => {
      try {
        const parsed = JSON.parse(ta.value.trim());
        if (!parsed || parsed.app !== "hebreu-vocab" || typeof parsed.progress !== "object") {
          throw new Error("format");
        }
        if (!confirm(`Remplacer la progression de « ${activeProfile} » par cette sauvegarde${parsed.date ? " du " + parsed.date : ""} ?`)) return;
        progress = parsed.progress;
        saveProgress();
        render();
      } catch {
        backupArea.appendChild(el("p", "feedback bad", "✘ Ce code n'est pas une sauvegarde valide — copiez-le en entier, sans le modifier."));
      }
    });
    backupArea.appendChild(ok);
  });

  const resetZone = el("div", "reset-zone");
  const resetBtn = el("button", "btn btn-neutral", "🗑 Remettre ma progression à zéro");
  resetBtn.addEventListener("click", () => {
    if (confirm(`Effacer toute la progression de « ${activeProfile} » ? (le vocabulaire est conservé)`)) {
      localStorage.removeItem(storageKeyFor(activeProfile));
      progress = {};
      render();
    }
  });
  resetZone.appendChild(resetBtn);
  screen.appendChild(resetZone);
}

function renderEmpty() {
  screen.appendChild(
    el("p", "hint", "Aucun mot dans ce thème. Ajoutez-en dans <code>js/vocab.js</code> !")
  );
}

/* ------------------------------------------------------------
   5. INITIALISATION (onglets + filtre de catégories)
   ------------------------------------------------------------ */

/* Demande au navigateur de protéger notre mémoire (progression,
   profils) contre le nettoyage automatique du système. */
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

/* ------------------------------------------------------------
   🔊 Prononciation audio (voix hébraïque du navigateur)
   ------------------------------------------------------------
   Un clic sur n'importe quel bouton [data-speak] lit le mot en
   hébreu. Écouté en capture pour ne pas déclencher le clic de
   l'élément qui l'entoure (carte, ligne de résultat…). */
function speak(text, lang) {
  if (!("speechSynthesis" in window) || !text) return;
  const code = lang === "fr" ? "fr-FR" : "he-IL";
  const re = lang === "fr" ? /fr([-_]?[A-Z]{2})?/i : /he([-_]?IL)?/i;
  // Pour l'hébreu : on remplace chaque mot connu par sa version vocalisée
  // (niqqud), ce qui améliore nettement la prononciation. L'affichage,
  // lui, reste sans points — seul le texte envoyé au moteur audio change.
  let toSpeak = String(text);
  if (lang !== "fr" && typeof NIQQUD !== "undefined") {
    toSpeak = toSpeak.split(/(\s+)/).map((tok) => NIQQUD[tok] || tok).join("");
  }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(toSpeak);
    u.lang = code;
    const voices = speechSynthesis.getVoices() || [];
    const v = voices.find((x) => re.test(x.lang));
    if (v) u.voice = v;
    // un peu plus lent pour bien détacher les syllabes (surtout l'hébreu)
    u.rate = lang === "fr" ? 0.9 : 0.75;
    speechSynthesis.speak(u);
  } catch {
    /* pas de synthèse vocale disponible : on ignore silencieusement */
  }
}
// getVoices() est parfois vide au démarrage : on force son chargement
if ("speechSynthesis" in window) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}
document.addEventListener(
  "click",
  (e) => {
    const btn = e.target.closest("[data-speak]");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      speak(btn.getAttribute("data-speak"), btn.getAttribute("data-lang") || "he");
    }
  },
  true // capture : passe avant le clic de la carte / de la ligne
);

/* Petit bouton haut-parleur à insérer près d'un mot hébreu. */
function speakBtn(he) {
  return `<button class="speak-btn" data-speak="${String(he).replace(/"/g, "&quot;")}" title="Écouter" aria-label="Écouter">🔊</button>`;
}

/* ------------------------------------------------------------
   🌙 Mode clair / sombre
   ------------------------------------------------------------ */
const THEME_KEY = "hebreu-vocab-theme";
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}
(function initTheme() {
  let theme = localStorage.getItem(THEME_KEY);
  if (!theme) {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  applyTheme(theme);
})();
document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

document.getElementById("tabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) switchView(tab.dataset.view);
});

document.querySelector(".logo").addEventListener("click", () => switchView("home"));

// Le badge profil (en haut à droite) ramène à l'écran de choix du profil
document.getElementById("profile-chip").addEventListener("click", () => switchView("profiles"));
updateProfileChip();

// Accès rapide à la recherche depuis le bandeau
document.getElementById("search-btn").addEventListener("click", () => {
  if (activeProfile) switchView("search");
});

render();
