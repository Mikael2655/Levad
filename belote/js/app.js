/* ============================================================
   Belote — Compteur de points
   -----------------------------------------------------------
   Application 100 % locale (aucun serveur). Tout est enregistré
   dans le navigateur (localStorage) : la partie en cours reprend
   automatiquement, et les parties terminées sont archivées.

   RÈGLES DE CALCUL (2 équipes) — base 160, arrondi à la dizaine
   -------------------------------------------------------------
   Une « donne » : une équipe prend un contrat (80…160, ou « capot »).
   On saisit les points de cartes d'un camp (0 à 162) ; l'autre = 160 −
   saisi. Un camp à 162 = tous les plis = CAPOT.

   • Contrat RÉUSSI : Preneur = arrondi(contrat + points du preneur) ;
     Défense = arrondi(160 − points du preneur).
   • Contrat CHUTÉ : Preneur = 0 ; Défense = arrondi(160 + contrat).
   • Belote : +20 au porteur si réussi ; à l'adversaire si chuté.
   • CONTRÉ / SURCONTRÉ (au gagnant de la donne) : contrat et belote ×2
     (contré) ou ×4 (surcontré) ; le forfait 160 n'est multiplié qu'en
     partie à 2000.  Ex. 2000 contré = contrat×2 + 160×2 + belote×2.
   • CAPOT annoncé (contrat « capot ») = 500 (×2 contré, ×4 surcontré),
     indépendant de l'objectif ; chuté → à l'adversaire.
     CAPOT non annoncé (un camp fait 162) = contrat + 250.

   Ces règles suivent les choix indiqués par l'utilisateur.
   ============================================================ */

(function () {
  "use strict";

  // ---------------------------------------------------------
  // Petits utilitaires
  // ---------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const screen = $("#screen");
  const K_GAME = "belote.game";
  const K_HIST = "belote.history";
  const K_THEME = "belote.theme";
  const K_SERIES = "belote.series";

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const roundTen = (n) => Math.round(n / 10) * 10;

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  // ---------------------------------------------------------
  // État
  // ---------------------------------------------------------
  let game = load(K_GAME, null);     // partie en cours (ou null)
  let history = load(K_HIST, []);    // parties terminées
  // Compteur de manches gagnées (revanche, belle…) par équipe.
  let series = load(K_SERIES, { wins: [0, 0], teams: ["", ""] });
  if (!series.wins) series = { wins: [0, 0], teams: ["", ""] };

  function persist() {
    save(K_GAME, game);
    save(K_HIST, history);
    save(K_SERIES, series);
  }

  // Bandeau « manches gagnées » (affiché dès qu'une manche a été gagnée).
  function seriesHtml(teams) {
    const w = series.wins;
    if (w[0] + w[1] === 0) return "";
    const belle = w[0] >= 1 && w[0] === w[1];
    return `
      <div class="series">
        <span class="series-lbl">Points des manches</span>
        <span class="series-score">
          <b class="t0">${esc(teams[0])} ${w[0]}</b>
          <span class="sep">—</span>
          <b class="t1">${w[1]} ${esc(teams[1])}</b>
        </span>
        ${belle ? `<span class="tag contre">Belle !</span>` : ""}
        <button class="series-reset" id="series-reset" title="Remettre les victoires à zéro">↺</button>
      </div>`;
  }

  function resetSeries() {
    if (!confirm("Remettre les compteurs de victoires à zéro ?")) return;
    series = { wins: [0, 0], teams: series.teams || ["", ""] };
    persist();
    closeModal();
    render();
  }

  // ---------------------------------------------------------
  // Thème clair / sombre
  // ---------------------------------------------------------
  (function initTheme() {
    const saved = load(K_THEME, null);
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    $("#theme-toggle").addEventListener("click", () => {
      const now =
        document.documentElement.getAttribute("data-theme") === "dark" ? null : "dark";
      if (now) document.documentElement.setAttribute("data-theme", now);
      else document.documentElement.removeAttribute("data-theme");
      save(K_THEME, now);
      $("#theme-toggle").textContent = now ? "☀️" : "🌙";
    });
    $("#theme-toggle").textContent = saved === "dark" ? "☀️" : "🌙";
  })();

  // Base de points de cartes utilisée (arrondie à la dizaine : 160, pas 162).
  const BASE = 160;

  // Couleurs (atout) — purement pour le suivi, sans effet sur les points.
  const SUITS = {
    pique: { sym: "♠", label: "Pique", red: false },
    coeur: { sym: "♥", label: "Cœur", red: true },
    carreau: { sym: "♦", label: "Carreau", red: true },
    trefle: { sym: "♣", label: "Trèfle", red: false },
  };

  // ---------------------------------------------------------
  // Moteur de calcul d'une donne
  //   d = { preneur, contrat, points, pointsSide, belote(-1|0|1),
  //         mode, couleur }
  //   `points` = points de cartes d'un camp (celui choisi via
  //   `pointsSide`) ; l'autre camp = 160 − points.
  //   Renvoie { pts:[s0,s1], realise, ppreneur, pdefense }
  // ---------------------------------------------------------
  function scoreDonne(d) {
    const preneur = d.preneur;
    const defense = 1 - preneur;
    const bel = d.belote; // -1, 0 ou 1
    const pts = [0, 0];
    // 1 = normale, 2 = contré, 4 = surcontré
    const facteur = d.mode === "surcontre" ? 4 : d.mode === "contre" ? 2 : 1;
    // Donne passée : personne ne prend, aucun point.
    if (d.contrat === "passe") return { pts: [0, 0], realise: false, passe: true };
    // Capot annoncé = contrat "capot" choisi aux enchères.
    const annonce = d.contrat === "capot";
    const C = annonce ? 0 : Number(d.contrat) || 0;
    // Points de cartes saisis (0 à 162). Points du preneur sur base 162
    // (162 - saisi si l'on saisit la défense).
    const entered = Math.max(0, Math.min(162, Number(d.points) || 0));
    const ppreneur162 = d.pointsSide === "defense" ? 162 - entered : entered;

    // --- Capot ANNONCÉ (500 ; ×2 contré, ×4 surcontré ; indép. objectif) ---
    // Réussi = le preneur a pris tous les plis, que l'on saisisse « 162 au
    // preneur » ou « 0 à la défense ».
    if (annonce) {
      const reussi = ppreneur162 === 162;
      const gagnant = reussi ? preneur : defense;
      pts[gagnant] = 500 * facteur;
      if (bel === 0 || bel === 1) pts[reussi ? bel : defense] += 20 * facteur;
      return { pts, realise: reussi, capot: "annonce" };
    }

    // --- Capot NON annoncé = contrat + 250 ---
    // Détecté uniquement si l'on SAISIT explicitement 162 pour un camp
    // (le 0 par défaut ne déclenche donc pas de capot).
    if (entered === 162) {
      const capotBy = d.pointsSide === "defense" ? defense : preneur;
      pts[capotBy] = C + 250;
      if (bel === 0 || bel === 1) pts[bel] += 20;
      return { pts, realise: capotBy === preneur, capot: "realise", capotBy };
    }

    // --- Donne normale (base 160, arrondie à la dizaine) ---
    const e = Math.min(BASE, entered);
    const ppreneur = d.pointsSide === "defense" ? BASE - e : e;
    const pdefense = BASE - ppreneur;
    // La belote compte pour atteindre le contrat du preneur.
    const beloteAuPreneur = bel === preneur ? 20 : 0;
    const realise = ppreneur + beloteAuPreneur >= C;

    if (facteur > 1) {
      // Contré / surcontré : tout va à l'équipe qui gagne la donne —
      // le preneur s'il réussit, sinon l'adversaire qui l'a fait chuter.
      // Le contrat et la belote sont toujours multipliés par le facteur ;
      // le forfait de 160 ne l'est qu'en partie à 2000 (en 1500 il reste
      // à 160). Ex. 2000 contré = contrat×2 + 160×2 + belote×2.
      const gagnant = realise ? preneur : defense;
      const forfait = game.target >= 2000 ? facteur * BASE : BASE;
      pts[gagnant] = facteur * C + forfait;
    } else {
      if (realise) {
        pts[preneur] = roundTen(C + ppreneur);
        pts[defense] = roundTen(pdefense);
      } else {
        pts[preneur] = 0;
        pts[defense] = roundTen(BASE + C);
      }
    }
    // Belote (×facteur) : au porteur si le contrat est réussi,
    // mais à l'adversaire (la défense) en cas de chute.
    if (bel === 0 || bel === 1) {
      const beneficiaire = realise ? bel : defense;
      pts[beneficiaire] += 20 * facteur;
    }
    return { pts, realise, ppreneur, pdefense };
  }

  // Totaux cumulés après chaque donne : renvoie tableau de [cum0, cum1]
  function cumulatives() {
    const cum = [];
    let a = 0,
      b = 0;
    for (const d of game.donnes) {
      const r = scoreDonne(d);
      a += r.pts[0];
      b += r.pts[1];
      cum.push([a, b]);
    }
    return cum;
  }

  function totals() {
    const cum = cumulatives();
    return cum.length ? cum[cum.length - 1] : [0, 0];
  }

  function dealerName(index) {
    if (!game.players.length) return "—";
    return game.players[index % game.players.length].name;
  }

  // La partie est-elle gagnée ? Il faut DÉPASSER l'objectif (1510 / 2010)
  // et mener au score.
  function winnerOf(g) {
    const t = (function () {
      const saved = game;
      game = g;
      const r = totals();
      game = saved;
      return r;
    })();
    const [a, b] = t;
    if (Math.max(a, b) <= g.target) return -1; // pas encore dépassé
    if (a === b) return -1; // égalité : on continue
    return a > b ? 0 : 1;
  }

  // Points de manche gagnés : 2 si le vainqueur a au moins le double des
  // points du perdant, sinon 1.
  function manchePoints(winnerTotal, loserTotal) {
    return winnerTotal >= 2 * loserTotal ? 2 : 1;
  }

  // ---------------------------------------------------------
  // Rendu : aiguillage
  // ---------------------------------------------------------
  function render() {
    if (!game) renderSetup();
    else renderGame();
    updateTargetChip();
  }

  function updateTargetChip() {
    const chip = $("#target-chip");
    if (game) {
      chip.hidden = false;
      chip.textContent = "Partie en " + game.target;
    } else {
      chip.hidden = true;
    }
  }

  // ---------------------------------------------------------
  // Écran de configuration (nouvelle partie)
  // ---------------------------------------------------------
  let setupDraft = null;

  function freshDraft() {
    return {
      target: 1500,
      teams: ["Nous", "Eux"],
      players: [
        { name: "", team: 0 },
        { name: "", team: 1 },
        { name: "", team: 0 },
        { name: "", team: 1 },
      ],
    };
  }

  function renderSetup() {
    if (!setupDraft) setupDraft = freshDraft();
    const d = setupDraft;

    const hasHistory = history.length > 0;
    const seriesTeams =
      series.teams && series.teams[0] ? series.teams : d.teams;

    screen.innerHTML = `
      ${seriesHtml(seriesTeams)}
      <div class="panel">
        <h2>Nouvelle partie</h2>

        <label>Objectif de points</label>
        <div class="big-choice" id="target-choice">
          <button data-target="1500" class="${d.target === 1500 ? "on" : ""}">1500<small>partie courte</small></button>
          <button data-target="2000" class="${d.target === 2000 ? "on" : ""}">2000<small>partie longue</small></button>
        </div>

        <h3>Équipes</h3>
        <div class="field-row">
          <div>
            <label style="color:var(--team1)">Équipe 1</label>
            <input type="text" id="team0" value="${esc(d.teams[0])}" maxlength="18" placeholder="Nous">
          </div>
          <div>
            <label style="color:var(--team2)">Équipe 2</label>
            <input type="text" id="team1" value="${esc(d.teams[1])}" maxlength="18" placeholder="Eux">
          </div>
        </div>

        <h3>Joueurs — dans l'ordre de distribution</h3>
        <p class="muted" style="font-size:0.82rem;margin:.2rem 0 .8rem">
          Le premier joueur distribue la 1ʳᵉ donne, puis on tourne. Choisissez l'équipe de chacun (bleu / rouge).
        </p>
        <div id="players"></div>
        <div class="btn-row" style="margin-top:.6rem">
          <button class="btn ghost" id="add-player" ${d.players.length >= 6 ? "disabled" : ""}>+ Joueur</button>
        </div>
      </div>

      <button class="btn big block" id="start">Commencer la partie ♠</button>

      ${hasHistory ? `<button class="btn secondary block" id="see-history" style="margin-top:.7rem">Historique des parties (${history.length})</button>` : ""}
    `;

    renderPlayerRows();

    $("#target-choice").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-target]");
      if (!b) return;
      d.target = Number(b.dataset.target);
      renderSetup();
    });
    $("#team0").addEventListener("input", (e) => (d.teams[0] = e.target.value));
    $("#team1").addEventListener("input", (e) => (d.teams[1] = e.target.value));
    $("#add-player").addEventListener("click", () => {
      if (d.players.length >= 6) return;
      d.players.push({ name: "", team: d.players.length % 2 });
      renderSetup();
    });
    $("#start").addEventListener("click", startGame);
    if (hasHistory) $("#see-history").addEventListener("click", renderHistory);
    const sr = $("#series-reset");
    if (sr) sr.addEventListener("click", resetSeries);
  }

  function renderPlayerRows() {
    const wrap = $("#players");
    const d = setupDraft;
    wrap.innerHTML = d.players
      .map(
        (p, i) => `
      <div class="player-row" data-i="${i}">
        <span class="idx">${i + 1}</span>
        <input type="text" value="${esc(p.name)}" maxlength="14" placeholder="Joueur ${i + 1}" data-name="${i}">
        <div class="team-pick" data-team-pick="${i}">
          <button data-team="0" class="${p.team === 0 ? "on" : ""}">1</button>
          <button data-team="1" class="${p.team === 1 ? "on" : ""}">2</button>
        </div>
        ${d.players.length > 2 ? `<button class="btn ghost" data-del="${i}" title="Retirer" style="padding:.4rem .6rem">✕</button>` : ""}
      </div>`
      )
      .join("");

    wrap.querySelectorAll("input[data-name]").forEach((inp) =>
      inp.addEventListener("input", (e) => {
        d.players[Number(e.target.dataset.name)].name = e.target.value;
      })
    );
    wrap.querySelectorAll("[data-team-pick]").forEach((grp) =>
      grp.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-team]");
        if (!b) return;
        d.players[Number(grp.dataset.teamPick)].team = Number(b.dataset.team);
        renderPlayerRows();
      })
    );
    wrap.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => {
        d.players.splice(Number(b.dataset.del), 1);
        renderSetup();
      })
    );
  }

  function startGame() {
    const d = setupDraft;
    const teams = [d.teams[0].trim() || "Nous", d.teams[1].trim() || "Eux"];
    const players = d.players
      .map((p, i) => ({ name: p.name.trim() || "Joueur " + (i + 1), team: p.team }))
      .filter((p) => true);
    game = {
      target: d.target,
      teams,
      players,
      donnes: [],
      startedAt: new Date().toISOString(),
    };
    setupDraft = null;
    persist();
    render();
  }

  // ---------------------------------------------------------
  // Écran de jeu
  // ---------------------------------------------------------
  function membersOf(team) {
    return game.players
      .filter((p) => p.team === team)
      .map((p) => p.name)
      .join(", ");
  }

  function renderGame() {
    const [a, b] = totals();
    const win = winnerOf(game);
    const pct = (v) => Math.min(100, Math.round((v / game.target) * 100));
    const lead = a === b ? -1 : a > b ? 0 : 1;

    screen.innerHTML = `
      ${seriesHtml(game.teams)}

      ${
        win >= 0
          ? (() => {
              const mp = manchePoints(win === 0 ? a : b, win === 0 ? b : a);
              return `<div class="winner-banner">🏆 ${esc(game.teams[win])} remporte la manche ! (${win === 0 ? a : b} pts) — +${mp} point${mp > 1 ? "s" : ""}${mp === 2 ? " (double !)" : ""}</div>`;
            })()
          : ""
      }

      <div class="scoreboard">
        <div class="score-card t0 ${lead === 0 ? "leader" : ""}">
          <div class="name">${esc(game.teams[0])}</div>
          <div class="members">${esc(membersOf(0))}</div>
          <div class="total">${a}</div>
          <div class="target">/ ${game.target}</div>
          <div class="bar"><span style="width:${pct(a)}%"></span></div>
        </div>
        <div class="score-card t1 ${lead === 1 ? "leader" : ""}">
          <div class="name">${esc(game.teams[1])}</div>
          <div class="members">${esc(membersOf(1))}</div>
          <div class="total">${b}</div>
          <div class="target">/ ${game.target}</div>
          <div class="bar"><span style="width:${pct(b)}%"></span></div>
        </div>
      </div>

      <div id="chart-area"></div>

      <div class="btn-row" style="margin:.2rem 0 1rem">
        ${win >= 0 ? `<button class="btn" id="revanche">🔁 Revanche</button>` : ""}
        <button class="btn secondary" id="finish">Terminer &amp; archiver</button>
        <button class="btn ghost" id="menu">⋯ Menu</button>
      </div>

      <h3 style="margin-top:.4rem">Donnes (${game.donnes.length})</h3>
      <div class="donnes" id="donnes"></div>

      <button class="fab" id="fab">＋ Donne</button>
    `;

    renderChart($("#chart-area"));
    renderDonnes($("#donnes"));

    $("#fab").addEventListener("click", () => openDonneModal(null));
    $("#finish").addEventListener("click", finishGame);
    $("#menu").addEventListener("click", openMenu);
    const rev = $("#revanche");
    if (rev) rev.addEventListener("click", revanche);
    const sr = $("#series-reset");
    if (sr) sr.addEventListener("click", resetSeries);
  }

  function renderDonnes(wrap) {
    if (!game.donnes.length) {
      wrap.innerHTML = `<div class="empty">Aucune donne pour l'instant.<br>Touchez « ＋ Donne » pour commencer.</div>`;
      return;
    }
    const cum = cumulatives();
    // Plus récente en haut
    wrap.innerHTML = game.donnes
      .map((d, i) => {
        const r = scoreDonne(d);
        const takerName = game.teams[d.preneur];
        const modeTag =
          d.mode === "contre"
            ? `<span class="tag contre">CONTRÉ</span>`
            : d.mode === "surcontre"
            ? `<span class="tag contre">SURCONTRÉ</span>`
            : "";
        const belTag =
          d.belote === 0 || d.belote === 1
            ? `<span class="tag belote">Belote ${esc(game.teams[d.belote])}</span>`
            : "";
        const resTag = r.realise
          ? `<span class="tag ok">réussi</span>`
          : `<span class="tag ko">chuté</span>`;
        const suit = SUITS[d.couleur];
        const suitTag = suit
          ? `<span class="suit-tag ${suit.red ? "red" : ""}">${suit.sym}</span>`
          : "";
        const sideTxt = d.pointsSide === "defense" ? "déf." : "pren.";
        const annonce = d.contrat === "capot";
        const capotTag = annonce
          ? `<span class="tag capot">CAPOT annoncé</span>`
          : r.capot === "realise"
          ? `<span class="tag capot">CAPOT +250</span>`
          : "";
        const contractText = annonce
          ? ``
          : r.capot === "realise"
          ? `prend <b>${d.contrat}</b>`
          : `prend <b>${d.contrat}</b> · ${d.points} pts (${sideTxt})`;
        const passe = d.contrat === "passe";
        return `
        <div class="donne ${passe ? "passe" : r.realise ? "" : "chute"}" data-edit="${i}">
          <div class="line1">
            <span class="dealer">Donne ${i + 1} · distrib. <b>${esc(dealerName(i))}</b></span>
            <span class="num">#${i + 1}</span>
          </div>
          <div class="line2">
            <div class="contract">
              ${
                passe
                  ? `<span class="muted">Personne ne prend</span> <span class="tag passe">Passe</span>`
                  : `${suitTag}
              <span class="taker t${d.preneur}">${esc(takerName)}</span>
              ${contractText}
              ${capotTag} ${modeTag} ${resTag} ${belTag}`
              }
            </div>
            <div class="pts">
              <div class="p t0"><div class="d">+${r.pts[0]}</div><div class="c">${cum[i][0]}</div></div>
              <div class="p t1"><div class="d">+${r.pts[1]}</div><div class="c">${cum[i][1]}</div></div>
            </div>
          </div>
        </div>`;
      })
      .reverse()
      .join("");

    wrap.querySelectorAll("[data-edit]").forEach((row) =>
      row.addEventListener("click", () => openDonneModal(Number(row.dataset.edit)))
    );
  }

  // ---------------------------------------------------------
  // Graphe d'évolution (SVG maison)
  // ---------------------------------------------------------
  function renderChart(host) {
    const n = game.donnes.length;
    if (n < 1) {
      host.innerHTML = "";
      return;
    }
    const cum = cumulatives();
    const W = 700,
      H = 220,
      padL = 38,
      padR = 12,
      padT = 12,
      padB = 22;
    const maxY = Math.max(game.target, cum[cum.length - 1][0], cum[cum.length - 1][1]);
    const x = (i) => padL + (i / Math.max(1, n)) * (W - padL - padR);
    const y = (v) => H - padB - (v / maxY) * (H - padT - padB);

    const path = (idx) => {
      let dstr = `M ${x(0).toFixed(1)} ${y(0).toFixed(1)}`;
      cum.forEach((c, i) => (dstr += ` L ${x(i + 1).toFixed(1)} ${y(c[idx]).toFixed(1)}`));
      return dstr;
    };
    const dots = (idx, color) =>
      cum
        .map((c, i) => `<circle cx="${x(i + 1).toFixed(1)}" cy="${y(c[idx]).toFixed(1)}" r="2.6" fill="${color}"/>`)
        .join("");

    // graduations horizontales
    const step = maxY <= 1500 ? 500 : 500;
    let grid = "";
    for (let v = 0; v <= maxY; v += step) {
      const yy = y(v).toFixed(1);
      grid += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="var(--line)" stroke-width="1"/>
               <text x="4" y="${(y(v) + 4).toFixed(1)}" font-size="11" fill="var(--muted)">${v}</text>`;
    }
    // ligne cible
    const yt = y(game.target).toFixed(1);
    const targetLine = `<line x1="${padL}" y1="${yt}" x2="${W - padR}" y2="${yt}" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="5 4"/>`;

    const c1 = "var(--team1)",
      c2 = "var(--team2)";

    host.innerHTML = `
      <div class="panel" style="padding:.8rem">
        <div class="chart-wrap">
          <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Évolution des scores">
            ${grid}
            ${targetLine}
            <path d="${path(0)}" fill="none" stroke="${c1}" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="${path(1)}" fill="none" stroke="${c2}" stroke-width="2.5" stroke-linejoin="round"/>
            ${dots(0, c1)}
            ${dots(1, c2)}
          </svg>
        </div>
        <div class="chart-legend">
          <span><span class="dot" style="background:${c1}"></span>${esc(game.teams[0])}</span>
          <span><span class="dot" style="background:${c2}"></span>${esc(game.teams[1])}</span>
          <span><span class="dot" style="background:var(--gold)"></span>Objectif ${game.target}</span>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------
  // Modale : ajout / édition d'une donne
  // ---------------------------------------------------------
  const backdrop = $("#modal-backdrop");
  const modal = $("#modal");

  function closeModal() {
    backdrop.hidden = true;
    modal.innerHTML = "";
  }
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });

  function openDonneModal(editIndex) {
    const isEdit = editIndex !== null && editIndex !== undefined;
    const nextNum = isEdit ? editIndex + 1 : game.donnes.length + 1;
    const draft = isEdit
      ? Object.assign(
          { pointsSide: "preneur", couleur: "pique" },
          game.donnes[editIndex]
        )
      : {
          preneur: 0,
          contrat: 90,
          points: "",
          pointsSide: "preneur",
          belote: -1,
          mode: "normal",
          couleur: "pique",
        };

    // Cumul des autres donnes (hors celle en cours d'édition), pour
    // afficher les scores actuels et le total après cette donne.
    const baseTotals = (function () {
      let a = 0,
        b = 0;
      game.donnes.forEach((dd, idx) => {
        if (isEdit && idx === editIndex) return;
        const rr = scoreDonne(dd);
        a += rr.pts[0];
        b += rr.pts[1];
      });
      return [a, b];
    })();

    function facteurOf() {
      return draft.mode === "surcontre" ? 4 : draft.mode === "contre" ? 2 : 1;
    }
    const pointsVides = () => draft.points === "" || draft.points == null;
    function noteText(r) {
      if (draft.contrat === "capot")
        return (
          "Capot annoncé (" +
          500 * facteurOf() +
          " pts) — " +
          (r.realise ? "réussi ✅" : "chuté ❌")
        );
      if (r.capot === "realise") return "Capot ! (contrat + 250)";
      if (pointsVides()) return "Points à saisir…";
      return "Contrat " + (r.realise ? "réussi ✅" : "chuté ❌");
    }
    function noteColor(r) {
      if (draft.contrat !== "capot" && r.capot !== "realise" && pointsVides())
        return "var(--muted)";
      return r.capot === "realise" || r.realise ? "var(--good)" : "var(--bad)";
    }

    // Valeurs de contrat proposées dans le menu déroulant.
    const CONTRATS = [80, 90, 100, 110, 120, 130, 140, 150, 160];

    function draw() {
      const r = scoreDonne(draft);
      const isPasse = draft.contrat === "passe"; // personne ne prend
      const rawEmpty = draft.points === "" || draft.points == null;
      const enteredNow = Math.max(0, Math.min(162, Number(draft.points) || 0));
      const isCapotNow = r.capot === "realise" || r.capot === "annonce";
      const complement = rawEmpty
        ? "—"
        : enteredNow === 162
        ? 0
        : Math.max(0, BASE - enteredNow);
      const otherTeam =
        draft.pointsSide === "defense"
          ? game.teams[draft.preneur]
          : game.teams[1 - draft.preneur];
      // Ligne récap du contrat, ex. « 90 ♥ cœur · contré ».
      const suit = SUITS[draft.couleur];
      const contratLabel = draft.contrat === "capot" ? "Capot" : draft.contrat;
      const modeLabel =
        draft.mode === "contre" ? "contré" : draft.mode === "surcontre" ? "surcontré" : "normal";
      const recap = `
        <div class="recap">
          <b>${esc(String(contratLabel))}</b>
          ${suit ? `<span class="suit-tag ${suit.red ? "red" : ""}">${suit.sym}</span> ${suit.label.toLowerCase()}` : ""}
          · ${modeLabel}
        </div>`;
      modal.innerHTML = `
        <div class="modal-head">
          <h2>${isEdit ? "Modifier la donne " + nextNum : "Donne " + nextNum}</h2>
          <button class="modal-close" id="mclose" aria-label="Fermer">✕</button>
        </div>
        <p class="muted" style="margin:.1rem 0 .5rem;font-size:.85rem">Distribution : <b>${esc(dealerName(nextNum - 1))}</b></p>

        <div class="cur-scores">
          <span class="cs t0">${esc(game.teams[0])} <b>${baseTotals[0]}</b></span>
          <span class="cs-sep">—</span>
          <span class="cs t1"><b>${baseTotals[1]}</b> ${esc(game.teams[1])}</span>
        </div>

        ${
          isPasse
            ? ""
            : `<label>Qui prend ?</label>
        <div class="seg team" id="preneur">
          <button data-team="0" data-v="0" class="${draft.preneur === 0 ? "on" : ""}">${esc(game.teams[0])}</button>
          <button data-team="1" data-v="1" class="${draft.preneur === 1 ? "on" : ""}">${esc(game.teams[1])}</button>
        </div>`
        }

        <label>Contrat</label>
        <select id="contrat">
          <option value="passe" ${isPasse ? "selected" : ""}>Passe (personne ne prend)</option>
          ${CONTRATS.map(
            (n) =>
              `<option value="${n}" ${Number(draft.contrat) === n ? "selected" : ""}>${n}</option>`
          ).join("")}
          <option value="capot" ${draft.contrat === "capot" ? "selected" : ""}>Capot (annoncé)</option>
        </select>

        ${
          isPasse
            ? `<div class="result-note" style="color:var(--muted)">Personne ne prend — donne passée (0 – 0). La distribution passe au joueur suivant.</div>`
            : `<label>Couleur (atout)</label>
        <div class="seg suits" id="couleur">
          ${Object.keys(SUITS)
            .map(
              (k) =>
                `<button data-v="${k}" class="${draft.couleur === k ? "on" : ""} ${SUITS[k].red ? "red" : ""}">${SUITS[k].sym}</button>`
            )
            .join("")}
        </div>

        <label>Enchère</label>
        <div class="seg" id="mode">
          <button data-v="normal" class="${draft.mode === "normal" ? "on" : ""}">Normale</button>
          <button data-v="contre" class="${draft.mode === "contre" ? "on" : ""}">Contré</button>
          <button data-v="surcontre" class="${draft.mode === "surcontre" ? "on" : ""}">Surcontré</button>
        </div>

        ${recap}

        <label>Points de cartes réalisés — je saisis ceux de&nbsp;:</label>
        <div class="seg" id="side">
          <button data-v="preneur" class="${draft.pointsSide !== "defense" ? "on" : ""}">le preneur</button>
          <button data-v="defense" class="${draft.pointsSide === "defense" ? "on" : ""}">la défense</button>
        </div>
        <div class="field-row" style="margin-top:.5rem;align-items:flex-end">
          <div>
            <input type="number" id="points" value="${draft.points}" min="0" max="162" step="1" inputmode="numeric" placeholder="0 – 162">
          </div>
          <div style="flex:0 0 auto;padding-bottom:.6rem;color:var(--muted);font-size:.85rem" id="other-side">
            → ${esc(otherTeam)} : <b>${complement}</b>${isCapotNow ? " · capot 🃏" : ""}
          </div>
        </div>

        <label>Belote (Roi + Dame d'atout)</label>
        <div class="seg" id="belote">
          <button data-v="-1" class="${draft.belote === -1 ? "on" : ""}">Aucune</button>
          <button data-v="0" class="${draft.belote === 0 ? "on" : ""}">${esc(game.teams[0])}</button>
          <button data-v="1" class="${draft.belote === 1 ? "on" : ""}">${esc(game.teams[1])}</button>
        </div>

        <div class="result-note" style="color:${noteColor(r)}">
          ${noteText(r)}
        </div>`
        }

        <div class="btn-row" style="margin-top:1rem">
          <button class="btn block" id="msave">${isEdit ? "Enregistrer" : "Ajouter la donne"}</button>
        </div>
        ${
          isEdit
            ? `<button class="btn danger block" id="mdel" style="margin-top:.6rem">Supprimer cette donne</button>`
            : ""
        }
      `;

      $("#mclose").addEventListener("click", closeModal);
      // Champs masqués en mode « Passe » — on protège chaque écouteur.
      const on = (sel, ev, fn) => {
        const el = $(sel);
        if (el) el.addEventListener(ev, fn);
      };
      on("#preneur", "click", (e) => pick(e, "preneur", true));
      on("#couleur", "click", (e) => pick(e, "couleur", false));
      on("#side", "click", (e) => pick(e, "pointsSide", false));
      on("#belote", "click", (e) => pick(e, "belote", true));
      on("#mode", "click", (e) => pick(e, "mode", false));
      // Contrat = menu déroulant ("passe" et "capot" sont des cas spéciaux).
      $("#contrat").addEventListener("change", (e) => {
        const v = e.target.value;
        draft.contrat = v === "capot" || v === "passe" ? v : Number(v);
        draw();
      });
      on("#points", "input", (e) => {
        draft.points = e.target.value; // valeur brute (permet le champ vide)
        refreshPreview();
      });
      $("#msave").addEventListener("click", saveDonne);
      if (isEdit) $("#mdel").addEventListener("click", delDonne);
    }

    function pick(e, field, numeric) {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      draft[field] = numeric ? Number(b.dataset.v) : b.dataset.v;
      draw(); // redessine (met à jour l'aperçu + les états « on »)
    }

    // Met à jour seulement l'aperçu sans perdre le focus des champs nombre
    function refreshPreview() {
      const r = scoreDonne(draft);
      const note = modal.querySelector(".result-note");
      if (note) {
        note.textContent = noteText(r);
        note.style.color = noteColor(r);
      }
      // Met à jour le complément affiché (points de l'autre camp).
      const other = modal.querySelector("#other-side");
      if (other) {
        const rawEmpty = draft.points === "" || draft.points == null;
        const entered = Math.max(0, Math.min(162, Number(draft.points) || 0));
        const complement = rawEmpty
          ? "—"
          : entered === 162
          ? 0
          : Math.max(0, BASE - entered);
        const otherTeam =
          draft.pointsSide === "defense"
            ? game.teams[draft.preneur]
            : game.teams[1 - draft.preneur];
        other.innerHTML =
          "→ " + esc(otherTeam) + " : <b>" + complement + "</b>" +
          (r.capot === "realise" || r.capot === "annonce" ? " · capot 🃏" : "");
      }
    }

    function saveDonne() {
      if (draft.contrat !== "capot" && draft.contrat !== "passe") {
        const c = Number(draft.contrat);
        if (!c || c < 80) {
          alert("Le contrat doit être d'au moins 80.");
          return;
        }
        draft.contrat = c;
      }
      draft.points = Math.max(0, Math.min(162, Number(draft.points) || 0));
      if (isEdit) game.donnes[editIndex] = draft;
      else game.donnes.push(draft);
      persist();
      closeModal();
      render();
    }

    function delDonne() {
      if (!confirm("Supprimer cette donne ?")) return;
      game.donnes.splice(editIndex, 1);
      persist();
      closeModal();
      render();
    }

    draw();
    backdrop.hidden = false;
  }

  // ---------------------------------------------------------
  // Menu (annuler dernière donne, réglages, nouvelle partie…)
  // ---------------------------------------------------------
  function openMenu() {
    modal.innerHTML = `
      <div class="modal-head">
        <h2>Menu</h2>
        <button class="modal-close" id="mclose" aria-label="Fermer">✕</button>
      </div>
      <div class="btn-row" style="flex-direction:column;gap:.6rem">
        <button class="btn secondary block" id="undo" ${game.donnes.length ? "" : "disabled"}>↩︎ Annuler la dernière donne</button>
        <button class="btn secondary block" id="revanche2">🔁 Revanche (mêmes équipes)</button>
        <button class="btn secondary block" id="rename">✏️ Renommer les équipes / joueurs</button>
        <button class="btn secondary block" id="hist">📚 Historique des parties (${history.length})</button>
        ${
          series.wins[0] + series.wins[1] > 0
            ? `<button class="btn secondary block" id="resetseries">🏆 Remettre les victoires à 0 (${series.wins[0]}–${series.wins[1]})</button>`
            : ""
        }
        <button class="btn danger block" id="newgame">＋ Nouvelle partie (sans archiver)</button>
      </div>
    `;
    $("#mclose").addEventListener("click", closeModal);
    $("#undo").addEventListener("click", () => {
      if (!game.donnes.length) return;
      game.donnes.pop();
      persist();
      closeModal();
      render();
    });
    $("#revanche2").addEventListener("click", revanche);
    const rs = $("#resetseries");
    if (rs) rs.addEventListener("click", resetSeries);
    $("#rename").addEventListener("click", openRename);
    $("#hist").addEventListener("click", () => {
      closeModal();
      renderHistory();
    });
    $("#newgame").addEventListener("click", () => {
      if (!confirm("Démarrer une nouvelle partie ? La partie en cours ne sera pas archivée.")) return;
      game = null;
      setupDraft = null;
      persist();
      closeModal();
      render();
    });
    backdrop.hidden = false;
  }

  function openRename() {
    modal.innerHTML = `
      <div class="modal-head">
        <h2>Équipes &amp; joueurs</h2>
        <button class="modal-close" id="mclose" aria-label="Fermer">✕</button>
      </div>
      <div class="field-row">
        <div><label style="color:var(--team1)">Équipe 1</label><input type="text" id="rt0" value="${esc(game.teams[0])}" maxlength="18"></div>
        <div><label style="color:var(--team2)">Équipe 2</label><input type="text" id="rt1" value="${esc(game.teams[1])}" maxlength="18"></div>
      </div>
      <h3>Joueurs (ordre de distribution)</h3>
      <div id="rplayers"></div>
      <button class="btn block" id="rsave" style="margin-top:1rem">Enregistrer</button>
    `;
    const rp = $("#rplayers");
    rp.innerHTML = game.players
      .map(
        (p, i) => `
      <div class="player-row">
        <span class="idx">${i + 1}</span>
        <input type="text" value="${esc(p.name)}" maxlength="14" data-rn="${i}">
        <div class="team-pick" data-rtp="${i}">
          <button data-team="0" class="${p.team === 0 ? "on" : ""}">1</button>
          <button data-team="1" class="${p.team === 1 ? "on" : ""}">2</button>
        </div>
      </div>`
      )
      .join("");
    rp.querySelectorAll("[data-rtp]").forEach((grp) =>
      grp.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-team]");
        if (!b) return;
        const i = Number(grp.dataset.rtp);
        game.players[i].team = Number(b.dataset.team);
        openRename();
      })
    );
    $("#mclose").addEventListener("click", closeModal);
    $("#rsave").addEventListener("click", () => {
      game.teams[0] = ($("#rt0").value.trim() || "Nous");
      game.teams[1] = ($("#rt1").value.trim() || "Eux");
      rp.querySelectorAll("[data-rn]").forEach((inp) => {
        const i = Number(inp.dataset.rn);
        game.players[i].name = inp.value.trim() || "Joueur " + (i + 1);
      });
      persist();
      closeModal();
      render();
    });
    backdrop.hidden = false;
  }

  // ---------------------------------------------------------
  // Terminer / archiver la partie
  // ---------------------------------------------------------
  // Archive la partie en cours dans l'historique. Compte les points de
  // manche seulement si l'objectif a été DÉPASSÉ (vraie victoire).
  function archiveCurrent() {
    const [a, b] = totals();
    const w = a === b ? -1 : a > b ? 0 : 1;
    const reached = Math.max(a, b) > game.target;
    const counted = w >= 0 && reached;
    const pts = counted ? manchePoints(w === 0 ? a : b, w === 0 ? b : a) : 0;
    history.unshift(
      Object.assign({}, game, {
        finishedAt: new Date().toISOString(),
        final: [a, b],
        winner: w,
        counted,
        manchePoints: pts,
      })
    );
    if (history.length > 50) history = history.slice(0, 50);
    if (counted) {
      series.wins[w] += pts;
      series.teams = game.teams.slice();
    }
    return w;
  }

  function finishGame() {
    if (!game.donnes.length) {
      if (!confirm("Aucune donne jouée. Abandonner cette partie ?")) return;
      game = null;
      persist();
      render();
      return;
    }
    if (!confirm("Terminer et archiver cette partie ?")) return;
    archiveCurrent();
    game = null;
    setupDraft = null;
    persist();
    render();
  }

  // Revanche : archive la partie puis en relance une avec les mêmes
  // équipes et joueurs. Le compteur de manches continue.
  function revanche() {
    const cfg = game;
    if (cfg.donnes.length) archiveCurrent();
    game = {
      target: cfg.target,
      teams: cfg.teams.slice(),
      players: cfg.players.map((p) => ({ name: p.name, team: p.team })),
      donnes: [],
      startedAt: new Date().toISOString(),
    };
    setupDraft = null;
    persist();
    closeModal();
    render();
  }

  // ---------------------------------------------------------
  // Historique des parties terminées
  // ---------------------------------------------------------
  function renderHistory() {
    const back = () => (game ? renderGame() : renderSetup());
    screen.innerHTML = `
      <div class="panel">
        <div class="modal-head">
          <h2>Historique des parties</h2>
          <button class="btn ghost" id="back">← Retour</button>
        </div>
        ${
          history.length === 0
            ? `<div class="empty">Aucune partie archivée pour l'instant.</div>`
            : `<div id="hlist"></div>
               <button class="btn danger" id="clearhist" style="margin-top:.5rem">Vider l'historique</button>`
        }
      </div>
    `;
    $("#back").addEventListener("click", back);

    if (history.length) {
      $("#hlist").innerHTML = history
        .map((g, i) => {
          const d = new Date(g.finishedAt || g.startedAt);
          const date = d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          const mp = g.manchePoints || (g.counted ? 1 : 0);
          const wname =
            g.winner === -1
              ? "Égalité"
              : "🏆 " + esc(g.teams[g.winner]) + (mp ? ` +${mp}` : "");
          return `
          <div class="hist-game">
            <div class="h1">
              <span>${esc(g.teams[0])} <b style="color:var(--team1)">${g.final[0]}</b> — <b style="color:var(--team2)">${g.final[1]}</b> ${esc(g.teams[1])}</span>
              <span>${wname}</span>
            </div>
            <div class="meta">Partie en ${g.target} · ${g.donnes.length} donnes · ${date}</div>
          </div>`;
        })
        .join("");
      $("#clearhist").addEventListener("click", () => {
        if (!confirm("Supprimer définitivement tout l'historique ?")) return;
        history = [];
        persist();
        renderHistory();
      });
    }
  }

  // ---------------------------------------------------------
  // Retour à l'accueil via le logo
  // ---------------------------------------------------------
  document.querySelector('[data-action="home"]').addEventListener("click", () => {
    closeModal();
    render();
  });

  // ---------------------------------------------------------
  // Démarrage
  // ---------------------------------------------------------
  render();
})();
