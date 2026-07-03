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
  saveProgress();
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

const state = {
  view: "home",
  category: "Tous",
  currentWord: null,
  reverse: false, // sens de la question : false = hébreu→français, true = français→hébreu
  session: { ok: 0, ko: 0 }, // score de la session en cours
  conj: { mode: "qcm", tense: "Tous", scope: "Tous", verb: 0, current: null }, // onglet Conjugaison
  prog: { content: "Tout", status: "Tous", level: "Tous", rouge: "Tous", shown: 300 }, // filtres Progrès
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
const NEW_COUNT = 25;
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

const screen = document.getElementById("screen");

function filteredVocab() {
  if (state.category === "Tous") return VOCAB;
  return VOCAB.filter((w) => w.cat === state.category);
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
    flashcards: renderFlashcards,
    quiz: renderQuiz,
    write: renderWrite,
    conj: renderConj,
    progress: renderProgress,
  };
  views[state.view]();
}

function switchView(view) {
  state.view = view;
  state.currentWord = null;
  state.conj.current = null;
  state.session = { ok: 0, ko: 0 };
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
function renderHome() {
  const total = VOCAB.length;
  const learned = VOCAB.filter((w) => {
    const s = progress[w.he];
    return s && s.box >= 3;
  }).length;
  const seen = VOCAB.filter((w) => progress[w.he] && progress[w.he].seen > 0).length;

  screen.appendChild(el("h2", "view-title", `שלום ${activeProfile} ! Prêt(e) à réviser ?`));

  const banner = el("div", "stats-banner");
  banner.innerHTML = `
    <div><div class="big">${total}</div><div class="label">mots au total</div></div>
    <div><div class="big">${seen}</div><div class="label">déjà travaillés</div></div>
    <div><div class="big">${learned}</div><div class="label">bien connus</div></div>`;
  screen.appendChild(banner);

  const grid = el("div", "menu-grid");
  const games = [
    ["flashcards", "🃏", "Flashcards", "Voyez l'hébreu, devinez le français, retournez la carte."],
    ["quiz", "✅", "QCM", "Un mot, quatre traductions : trouvez la bonne."],
    ["write", "✍️", "Écrire la traduction", "Tapez la traduction française du mot affiché."],
    ["conj", "🔤", "Conjugaison", "Tableaux, QCM et écriture des verbes aux différents temps."],
    ["progress", "📊", "Progrès", "Vos scores mot par mot, et les mots à retravailler."],
  ];
  games.forEach(([view, emoji, title, desc]) => {
    const card = el(
      "button",
      "menu-card",
      `<span class="emoji">${emoji}</span><strong>${title}</strong><p>${desc}</p>`
    );
    card.addEventListener("click", () => switchView(view));
    grid.appendChild(card);
  });
  screen.appendChild(grid);

  screen.appendChild(
    el(
      "p",
      "hint",
      "💡 Les mots que vous ratez reviennent plus souvent, jusqu'à ce que vous les connaissiez."
    )
  );
}

/* Tire un nouveau mot ET un sens de question au hasard */
function nextWord(pool, avoid) {
  state.currentWord = pickWord(pool, avoid);
  state.reverse = Math.random() < 0.5;
}

/* ----- Flashcards ----- */
function renderFlashcards() {
  const pool = filteredVocab();
  if (pool.length === 0) return renderEmpty();

  if (!state.currentWord) nextWord(pool, null);
  const word = state.currentWord;

  screen.appendChild(el("h2", "view-title", "🃏 Flashcards"));
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
      <div class="he-word he" style="font-size:2.1rem">${word.he}</div>
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

  screen.appendChild(el("h2", "view-title", "✅ QCM"));
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
        if (state.view === "quiz" && state.currentWord === word) {
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

  screen.appendChild(el("h2", "view-title", "✍️ Écrire la traduction"));
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
      el("p", "hint", "Tapez le mot en hébreu ou en prononciation (ex. <em>shalom</em>).")
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
  if (state.conj.tense !== "Tous") pool = pool.filter((c) => c.tense === state.conj.tense);
  if (state.conj.scope === "Nouveaux") pool = pool.filter((c) => NEW_VERBS.has(c.verb));
  return pool;
}

function renderConj() {
  screen.appendChild(el("h2", "view-title", "🔤 Conjugaison"));

  if (CONJ_ITEMS.length === 0) {
    screen.appendChild(
      el("p", "hint", "Aucun verbe pour l'instant. Ajoutez-en dans <code>js/verbes.js</code> !")
    );
    return;
  }

  // Choix du mode : tableaux / QCM / écrire
  const seg = el("div", "segmented");
  [
    ["tables", "📖 Tableaux"],
    ["qcm", "✅ QCM"],
    ["write", "✍️ Écrire"],
  ].forEach(([mode, label]) => {
    const btn = el("button", "seg-btn" + (state.conj.mode === mode ? " active" : ""), label);
    btn.addEventListener("click", () => {
      state.conj.mode = mode;
      state.conj.current = null;
      state.session = { ok: 0, ko: 0 };
      render();
    });
    seg.appendChild(btn);
  });
  screen.appendChild(seg);

  // Filtres par temps et par ancienneté (pour les exercices)
  if (state.conj.mode !== "tables") {
    const filter = el("div", "conj-filter");
    filter.appendChild(el("span", "hint", "Temps : "));
    const sel = el("select", "conj-select");
    ["Tous", ...CONJ_TENSES].forEach((t) => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = t;
      if (t === state.conj.tense) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      state.conj.tense = sel.value;
      state.conj.current = null;
      render();
    });
    filter.appendChild(sel);

    filter.appendChild(el("span", "hint", " Verbes : "));
    const scopeSel = el("select", "conj-select");
    [["Tous", "Tous"], ["Nouveaux", "🆕 Nouveaux ajouts"]].forEach(([value, text]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = text;
      if (value === state.conj.scope) opt.selected = true;
      scopeSel.appendChild(opt);
    });
    scopeSel.addEventListener("change", () => {
      state.conj.scope = scopeSel.value;
      state.conj.current = null;
      render();
    });
    filter.appendChild(scopeSel);
    screen.appendChild(filter);
  }

  if (state.conj.mode === "tables") renderConjTables();
  else if (state.conj.mode === "qcm") renderConjQuiz();
  else renderConjWrite();
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
function renderConjTables() {
  const picker = el("div", "conj-filter");
  picker.appendChild(el("span", "hint", "Verbe : "));
  const sel = el("select", "conj-select");
  VERBES.forEach((v, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${v.fr} — ${v.inf} (${v.translit})`;
    if (i === state.conj.verb) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", () => {
    state.conj.verb = Number(sel.value);
    render();
  });
  picker.appendChild(sel);
  screen.appendChild(picker);

  const verb = VERBES[state.conj.verb];
  if (verb.racine || verb.binyan) {
    screen.appendChild(
      el(
        "p",
        "hint",
        [verb.racine ? `Racine : <span class="he">${verb.racine}</span>` : "", verb.binyan ? `Binyan : <span class="he">${verb.binyan}</span>` : ""]
          .filter(Boolean)
          .join(" · ")
      )
    );
  }
  if (Object.keys(verb.temps).length === 0) {
    screen.appendChild(el("p", "hint", "Pas encore de formes pour ce verbe — complétez l'Excel ou le fichier verbes.js."));
  }
  Object.entries(verb.temps).forEach(([tense, forms]) => {
    const block = el("div", "conj-table-block");
    block.appendChild(el("h3", "conj-tense-title", tense));
    const table = el("table", "conj-table");
    table.innerHTML = forms
      .map(
        (f) => `<tr>
          <td class="personne">${f.p}</td>
          <td class="he form">${f.he}</td>
          <td class="translit">${f.t}</td>
        </tr>`
      )
      .join("");
    block.appendChild(table);
    screen.appendChild(block);
  });
}

/* --- QCM de conjugaison : 4 formes hébraïques, une seule est bonne --- */
function renderConjQuiz() {
  const pool = conjPool();
  if (!state.conj.current) state.conj.current = pickWord(pool, null);
  const item = state.conj.current;

  screen.appendChild(sessionScoreBar());
  screen.appendChild(conjQuestionBox(item, true));

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
  const seen = new Set([item.he]);
  const distractors = [];
  CONJ_ITEMS
    .filter((c) => c.tense === item.tense && c.verb !== item.verb)
    .map((c) => [ressemblance(c), c])
    .sort((a, b) => b[0] - a[0])
    .forEach(([, c]) => {
      if (distractors.length < 3 && !seen.has(c.he)) {
        seen.add(c.he);
        distractors.push(c);
      }
    });
  // Sécurité : si un temps a trop peu de verbes, on complète ailleurs
  if (distractors.length < 3) {
    shuffle(CONJ_ITEMS).forEach((c) => {
      if (distractors.length < 3 && !seen.has(c.he)) {
        seen.add(c.he);
        distractors.push(c);
      }
    });
  }
  const options = shuffle([item, ...distractors]);

  const optionsBox = el("div", "quiz-options");
  screen.appendChild(optionsBox);

  let answered = false;
  options.forEach((option) => {
    const btn = el("button", "quiz-option option-he", `<span class="he">${option.he}</span>`);
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const isCorrect = option.he === item.he;
      recordAnswer(item, isCorrect);
      state.session[isCorrect ? "ok" : "ko"] += 1;

      optionsBox.querySelectorAll(".quiz-option").forEach((b) => {
        b.disabled = true;
        if (b.textContent.trim() === item.he) b.classList.add("correct");
      });
      if (!isCorrect) btn.classList.add("wrong");

      screen.appendChild(
        el(
          "div",
          "feedback " + (isCorrect ? "good" : "bad"),
          `${isCorrect ? "✔" : "✘"} <span class="he">${item.he}</span> (<em>${item.translit}</em>)`
        )
      );

      // Enchaînement automatique
      setTimeout(() => {
        if (state.view === "conj" && state.conj.mode === "qcm" && state.conj.current === item) {
          state.conj.current = pickWord(pool, item);
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
  screen.appendChild(conjQuestionBox(item));
  screen.appendChild(
    el("p", "hint", "Tapez la forme demandée, en translittération (ex. <em>katavti</em>) ou en hébreu.")
  );

  const form = el("form", "write-form");
  const input = el("input", "write-input");
  input.type = "text";
  input.placeholder = "Forme conjuguée…";
  input.autocapitalize = "off";
  input.autocomplete = "off";
  const submit = el("button", "btn btn-primary", "Valider");
  form.appendChild(input);
  form.appendChild(submit);
  screen.appendChild(form);
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
    const wrap = el("label", "prog-filter", labelTxt + " ");
    const sel = el("select", "conj-select");
    options.forEach(([value, text]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = text;
      if (value === current) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      apply(sel.value);
      f.shown = 300;
      render();
    });
    wrap.appendChild(sel);
    bar.appendChild(wrap);
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

document.getElementById("tabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) switchView(tab.dataset.view);
});

document.querySelector(".logo").addEventListener("click", () => switchView("home"));

// Le badge profil (en haut à droite) ramène à l'écran de choix du profil
document.getElementById("profile-chip").addEventListener("click", () => switchView("profiles"));
updateProfileChip();

const categorySelect = document.getElementById("category-select");
["Tous", ...new Set(VOCAB.map((w) => w.cat))].forEach((cat) => {
  const opt = document.createElement("option");
  opt.value = opt.textContent = cat;
  categorySelect.appendChild(opt);
});
categorySelect.addEventListener("change", () => {
  state.category = categorySelect.value;
  state.currentWord = null;
  render();
});

render();
