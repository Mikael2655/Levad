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

const STORAGE_KEY = "hebreu-vocab-progres";
const MAX_BOX = 4;

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getWordStats(word) {
  if (!progress[word.he]) {
    progress[word.he] = { box: 0, seen: 0, ok: 0, ko: 0 };
  }
  return progress[word.he];
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
    const s = progress[w.he];
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

const progress = loadProgress();

const state = {
  view: "home",
  category: "Tous",
  currentWord: null,
  session: { ok: 0, ko: 0 }, // score de la session en cours
};

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

// Normalise une réponse tapée : minuscules, sans accents ni ponctuation
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // enlève les accents
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9 ]/g, " ")     // ponctuation → espace
    .replace(/\s+/g, " ")
    .trim();
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
  const views = {
    home: renderHome,
    flashcards: renderFlashcards,
    quiz: renderQuiz,
    write: renderWrite,
    progress: renderProgress,
  };
  views[state.view]();
}

function switchView(view) {
  state.view = view;
  state.currentWord = null;
  state.session = { ok: 0, ko: 0 };
  render();
}

/* ----- Accueil ----- */
function renderHome() {
  const total = VOCAB.length;
  const learned = VOCAB.filter((w) => {
    const s = progress[w.he];
    return s && s.box >= 3;
  }).length;
  const seen = VOCAB.filter((w) => progress[w.he] && progress[w.he].seen > 0).length;

  screen.appendChild(el("h2", "view-title", "שלום ! Prêt(e) à réviser ?"));

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

/* ----- Flashcards ----- */
function renderFlashcards() {
  const pool = filteredVocab();
  if (pool.length === 0) return renderEmpty();

  if (!state.currentWord) state.currentWord = pickWord(pool, null);
  const word = state.currentWord;

  screen.appendChild(el("h2", "view-title", "🃏 Flashcards"));
  screen.appendChild(sessionScoreBar());

  const scene = el("div", "flash-scene");
  const card = el("div", "flash-card");
  card.innerHTML = `
    <div class="flash-face front">
      <span class="word-cat">${word.cat}</span>
      <div class="he-word he">${word.he}</div>
      <div class="translit">${word.translit}</div>
      <div class="tap-hint">👆 Touchez la carte pour voir la traduction</div>
    </div>
    <div class="flash-face back">
      <span class="word-cat">${word.cat}</span>
      <div class="fr-word">${word.fr}</div>
      <div class="he-word he" style="font-size:1.6rem">${word.he}</div>
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
    state.currentWord = pickWord(pool, word);
    render();
  }
  btnOk.addEventListener("click", () => answer(true));
  btnKo.addEventListener("click", () => answer(false));
}

/* ----- QCM ----- */
function renderQuiz() {
  const pool = filteredVocab();
  if (pool.length === 0) return renderEmpty();

  if (!state.currentWord) state.currentWord = pickWord(pool, null);
  const word = state.currentWord;

  screen.appendChild(el("h2", "view-title", "✅ QCM"));
  screen.appendChild(sessionScoreBar());

  const question = el("div", "quiz-question");
  question.innerHTML = `
    <span class="word-cat">${word.cat}</span>
    <div class="he-word he">${word.he}</div>
    <div class="translit">${word.translit}</div>`;
  screen.appendChild(question);

  // 3 mauvaises réponses : de préférence dans la même catégorie
  const sameCat = VOCAB.filter((w) => w !== word && w.cat === word.cat);
  const others = VOCAB.filter((w) => w !== word && w.cat !== word.cat);
  const distractors = shuffle(sameCat).concat(shuffle(others)).slice(0, 3);
  const options = shuffle([word, ...distractors]);

  const optionsBox = el("div", "quiz-options");
  screen.appendChild(optionsBox);

  let answered = false;
  options.forEach((option) => {
    const btn = el("button", "quiz-option", option.fr);
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const isCorrect = option === word;
      recordAnswer(word, isCorrect);
      state.session[isCorrect ? "ok" : "ko"] += 1;

      // Coloration : la bonne réponse en vert, l'erreur en rouge
      optionsBox.querySelectorAll(".quiz-option").forEach((b) => {
        b.disabled = true;
        if (b.textContent === word.fr) b.classList.add("correct");
      });
      if (!isCorrect) btn.classList.add("wrong");

      const next = el("button", "btn btn-primary", "Mot suivant →");
      next.style.marginTop = "1rem";
      next.style.width = "100%";
      next.addEventListener("click", () => {
        state.currentWord = pickWord(pool, word);
        render();
      });
      screen.appendChild(next);
      next.focus();
    });
    optionsBox.appendChild(btn);
  });
}

/* ----- Mode "écris la traduction" ----- */
function renderWrite() {
  const pool = filteredVocab();
  if (pool.length === 0) return renderEmpty();

  if (!state.currentWord) state.currentWord = pickWord(pool, null);
  const word = state.currentWord;

  screen.appendChild(el("h2", "view-title", "✍️ Écrire la traduction"));
  screen.appendChild(sessionScoreBar());

  const question = el("div", "quiz-question");
  question.innerHTML = `
    <span class="word-cat">${word.cat}</span>
    <div class="he-word he">${word.he}</div>
    <div class="translit">${word.translit}</div>`;
  screen.appendChild(question);

  const form = el("form", "write-form");
  const input = el("input", "write-input");
  input.type = "text";
  input.placeholder = "Traduction en français…";
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
    if (answered || normalize(input.value) === "") return;
    answered = true;

    const isCorrect = acceptedAnswers(word).includes(normalize(input.value));
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
      state.currentWord = pickWord(pool, word);
      render();
    });
    screen.appendChild(next);
    next.focus();
  });
}

/* ----- Page Progrès ----- */
function renderProgress() {
  const pool = filteredVocab();

  screen.appendChild(el("h2", "view-title", "📊 Vos progrès"));

  const seen = pool.filter((w) => progress[w.he] && progress[w.he].seen > 0);
  const known = pool.filter((w) => progress[w.he] && progress[w.he].box >= 3);
  const struggling = pool.filter((w) => {
    const s = progress[w.he];
    return s && s.seen >= 2 && s.ko > s.ok;
  });

  const summary = el("div", "progress-summary");
  summary.innerHTML = `
    <div class="cell"><div class="big">${seen.length}/${pool.length}</div><div class="label">mots travaillés</div></div>
    <div class="cell"><div class="big">${known.length}</div><div class="label">bien connus</div></div>
    <div class="cell"><div class="big">${struggling.length}</div><div class="label">à retravailler</div></div>`;
  screen.appendChild(summary);

  screen.appendChild(
    el("p", "hint", "Les pastilles vertes = niveau de mémorisation (5 = bien ancré). En rouge : les mots que vous ratez souvent.")
  );

  // Tri : les mots en difficulté d'abord, puis par niveau croissant
  const sorted = pool.slice().sort((a, b) => {
    const sa = progress[a.he] || { box: 0, seen: 0, ok: 0, ko: 0 };
    const sb = progress[b.he] || { box: 0, seen: 0, ok: 0, ko: 0 };
    const strugA = sa.seen >= 2 && sa.ko > sa.ok ? 0 : 1;
    const strugB = sb.seen >= 2 && sb.ko > sb.ok ? 0 : 1;
    if (strugA !== strugB) return strugA - strugB;
    return sa.box - sb.box;
  });

  const list = el("div", "word-list");
  sorted.forEach((w) => {
    const s = progress[w.he] || { box: 0, seen: 0, ok: 0, ko: 0 };
    const isStruggling = s.seen >= 2 && s.ko > s.ok;
    const row = el("div", "word-row" + (isStruggling ? " struggling" : ""));
    const dots = Array.from({ length: MAX_BOX + 1 }, (_, i) =>
      `<span class="${i <= s.box && s.seen > 0 ? "on" : ""}"></span>`
    ).join("");
    row.innerHTML = `
      <div class="he">${w.he}</div>
      <div class="infos">
        <div class="fr">${w.fr}</div>
        <div class="translit">${w.translit} · vu ${s.seen}×${s.seen ? ` · ✔ ${s.ok} / ✘ ${s.ko}` : ""}</div>
      </div>
      <div class="level-dots">${dots}</div>`;
    list.appendChild(row);
  });
  screen.appendChild(list);

  const resetZone = el("div", "reset-zone");
  const resetBtn = el("button", "btn btn-neutral", "🗑 Remettre ma progression à zéro");
  resetBtn.addEventListener("click", () => {
    if (confirm("Effacer toute votre progression ? (le vocabulaire est conservé)")) {
      localStorage.removeItem(STORAGE_KEY);
      Object.keys(progress).forEach((k) => delete progress[k]);
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
