/* app.js — Interface du tournoi de belote (administrateur unique).
 *
 * Plusieurs tournois enregistrés (liste d'accueil). Trois formats :
 *   • pools      : poules + phase finale (tableau).
 *   • poolsonly  : poules seulement (classement, sans tableau).
 *   • ko         : élimination directe (tableau tiré au sort, sans poules).
 * L'organisateur saisit les équipes (tirage au sort) puis tous les scores.
 */
(function () {
  'use strict';

  var L = window.BeloteLogic;
  var CFG = window.APP_CONFIG;

  var store = { config: null, teams: [], matches: [] };
  var me = { uid: null, mode: null };
  var state = { tid: null };
  var subs = [];
  var ui = { poolTab: 'A', adminTab: 'equipes', lastDraw: null, draftTeam: '',
             newFormat: 'pools', newName: '', newPin: '', newPools: 6, newSize: 4, newTeams: 16,
             tourList: null };
  var screen = document.getElementById('screen');
  var pendingRender = false;

  /* ---- Utilitaires ------------------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt() { return (store.config && store.config.format) || 'pools'; }
  function poolSize() { return (store.config && store.config.poolSize) || 4; }
  function formatLabel(f) {
    return { pools: 'Poules + tableau', poolsonly: 'Poules seulement', ko: 'Élimination directe' }[f] || 'Poules + tableau';
  }
  function currentBracket() {
    if (fmt() === 'ko') return L.koBracket(store.config.numTeams || store.teams.length, store.teams);
    return store.config && store.config.bracket;
  }
  function teamById(id) {
    for (var i = 0; i < store.teams.length; i++) if (store.teams[i].id === id) return store.teams[i];
    return null;
  }
  function slotNum(t) { return t.slot != null ? t.slot : (t.pos != null ? t.pos + 1 : '?'); }
  function teamName(t) {
    if (!t) return '—';
    if (t.name) return esc(t.name);
    return '<span class="muted">Équipe ' + slotNum(t) + ' (vide)</span>';
  }
  function teamTag(id) { var t = teamById(id); return (t && t.pool != null) ? (t.pool + t.slot) : ''; }
  function matchById(id) {
    for (var i = 0; i < store.matches.length; i++) if (store.matches[i].id === id) return store.matches[i];
    return null;
  }
  function koResults() {
    var map = {};
    store.matches.forEach(function (m) { if (m.phase === 'ko') map[m.id] = m; });
    return map;
  }
  function sha256(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function newTid(name) {
    var s = (name || 'tournoi').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'tournoi';
    return s + '-' + Math.random().toString(36).slice(2, 6);
  }
  function toast(msg) {
    var f = document.getElementById('foot-info');
    f.textContent = msg;
    setTimeout(function () { f.textContent = footNote(); }, 2600);
  }
  function footNote() {
    var m = (me.mode === 'local' && !CFG.firebaseReady) ? 'Données locales (cet appareil)' : 'Synchro temps réel';
    return (store.config ? esc(store.config.name) + ' · ' : '') + m;
  }

  /* ---- Fenêtres modales -------------------------------------------- */
  function openModal(html) {
    var o = document.createElement('div');
    o.className = 'modal-overlay';
    o.innerHTML = '<div class="modal">' + html + '</div>';
    document.body.appendChild(o);
    return o;
  }
  function modalConfirm(msg, okLabel) {
    return new Promise(function (res) {
      var o = openModal('<p>' + esc(msg) + '</p><div class="btn-row">' +
        '<button class="btn small" data-m="0">Annuler</button>' +
        '<button class="btn primary small" data-m="1">' + esc(okLabel || 'Confirmer') + '</button></div>');
      function done(v) { if (o.parentNode) document.body.removeChild(o); res(v); }
      o.addEventListener('click', function (e) {
        if (e.target === o) return done(false);
        var b = e.target.closest('[data-m]'); if (b) done(b.getAttribute('data-m') === '1');
      });
    });
  }
  function modalPrompt(msg, initial) {
    return new Promise(function (res) {
      var o = openModal('<p>' + esc(msg) + '</p><input id="modal-input" value="' + esc(initial || '') + '">' +
        '<div class="btn-row"><button class="btn small" data-m="0">Annuler</button>' +
        '<button class="btn primary small" data-m="1">Valider</button></div>');
      var inp = o.querySelector('#modal-input'); inp.focus(); inp.select();
      function done(ok) { var v = inp.value; if (o.parentNode) document.body.removeChild(o); res(ok ? v : null); }
      o.addEventListener('click', function (e) {
        if (e.target === o) return done(false);
        var b = e.target.closest('[data-m]'); if (b) done(b.getAttribute('data-m') === '1');
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') done(false);
      });
    });
  }

  /* ---- Navigation & abonnements ------------------------------------ */
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  window.addEventListener('hashchange', render);

  function openTournament(tid) {
    if (state.tid === tid) return;
    subs.forEach(function (u) { if (u) u(); });
    subs = [];
    store = { config: null, teams: [], matches: [] };
    state.tid = tid;
    if (!tid) return;
    localStorage.setItem('bt:lastTid', tid);
    subs.push(DB.watchTournament(tid, function (c) { store.config = c; render(); }));
    subs.push(DB.watchTeams(tid, function (t) { store.teams = t; render(); }));
    subs.push(DB.watchMatches(tid, function (m) { store.matches = m; render(); }));
  }

  /* ================================================================= *
   *  RENDU                                                            *
   * ================================================================= */
  function render(force) {
    if (!force && screen.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') {
      pendingRender = true; return;
    }
    pendingRender = false;
    document.getElementById('foot-info').textContent = footNote();
    var chip = document.getElementById('mode-chip');
    if (me.mode === 'local' && !CFG.firebaseReady) { chip.hidden = false; chip.textContent = 'LOCAL'; chip.classList.add('warn'); }
    else { chip.hidden = true; }

    var route = (location.hash || '#/').split('?')[0];
    if (route === '#/' || route === '') { openTournament(null); return renderList(); }
    if (route === '#/new') return renderCreate();
    if (!state.tid) { go('#/'); return; }
    if (state.tid && !store.config) { screen.innerHTML = backList() + '<div class="loading">Chargement…</div>'; return; }
    if (route === '#/classement') return renderStandings();
    if (route === '#/admin') return renderAdmin();
    renderList();
  }
  function backList() { return '<a class="back" data-nav="#/">← Mes tournois</a>'; }

  /* ---- Accueil : liste des tournois -------------------------------- */
  function renderList() {
    DB.listTournaments().then(function (list) { ui.tourList = list; paintList(); });
    paintList();
  }
  function paintList() {
    var list = ui.tourList || [];
    var cards = list.length ? list.map(function (c) {
      var meta = c.format === 'ko'
        ? (c.numTeams + ' équipes · ' + formatLabel('ko'))
        : (c.numPools + ' poule(s) de ' + (c.poolSize || 4) + ' · ' + formatLabel(c.format || 'pools'));
      return '<div class="menu-tile" style="justify-content:space-between">' +
        '<span data-act="open-tour" data-id="' + esc(c.id) + '" style="flex:1;cursor:pointer">' +
        '<b>' + esc(c.name) + '</b><span>' + meta + '</span></span>' +
        '<button class="pill" data-act="del-tour" data-id="' + esc(c.id) + '" title="Supprimer">🗑</button></div>';
    }).join('') : '<p class="sub">Aucun tournoi enregistré pour l\'instant.</p>';
    screen.innerHTML = '<div class="card"><h2>Mes tournois</h2>' + cards +
      '<div style="height:12px"></div>' +
      '<button class="btn primary block" data-act="new-tour">＋ Nouveau tournoi</button></div>';
  }

  /* ---- Création d'un tournoi --------------------------------------- */
  function renderCreate() {
    var f = ui.newFormat || 'pools';
    var pill = function (val, lab) {
      return '<span class="pill ' + (f === val ? 'active' : '') + '" data-act="new-format" data-f="' + val + '">' + lab + '</span>';
    };
    var specific;
    if (f === 'ko') {
      var opts = [4, 8, 16, 32].map(function (n) {
        return '<option ' + (ui.newTeams === n ? 'selected' : '') + '>' + n + '</option>';
      }).join('');
      specific = '<label>Nombre d\'équipes (tableau)</label><select id="c-teams">' + opts + '</select>';
    } else {
      specific = '<div class="field-2">' +
        '<div><label>Nombre de poules</label><input id="c-pools" type="number" min="1" max="26" value="' + ui.newPools + '"></div>' +
        '<div><label>Équipes / poule</label><input id="c-size" type="number" min="2" max="10" value="' + ui.newSize + '"></div></div>';
    }
    screen.innerHTML = backList() +
      '<div class="card"><h2>Nouveau tournoi</h2>' +
      '<label>Nom</label><input id="c-name" placeholder="Ex. Tournoi du club" value="' + esc(ui.newName) + '">' +
      '<label>Format</label><div class="pool-tabs">' +
        pill('pools', 'Poules + tableau') + pill('poolsonly', 'Poules seules') + pill('ko', 'Élimination directe') +
      '</div>' + specific +
      '<p class="sub" id="c-preview"></p>' +
      '<label>Code administrateur (à retenir)</label><input id="c-pin" type="password" placeholder="Code secret" value="' + esc(ui.newPin) + '">' +
      '<div style="height:12px"></div>' +
      '<button class="btn primary block" data-act="do-create">Créer le tournoi</button></div>';
    updateCreatePreview();
    ['c-pools', 'c-size', 'c-teams'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.addEventListener('input', updateCreatePreview);
    });
  }
  function stashCreate() {
    var g = function (id) { var e = document.getElementById(id); return e ? e.value : null; };
    if (g('c-name') != null) ui.newName = g('c-name');
    if (g('c-pin') != null) ui.newPin = g('c-pin');
    if (g('c-pools') != null) ui.newPools = Math.max(1, Math.min(26, parseInt(g('c-pools'), 10) || 1));
    if (g('c-size') != null) ui.newSize = Math.max(2, Math.min(10, parseInt(g('c-size'), 10) || 4));
    if (g('c-teams') != null) ui.newTeams = parseInt(g('c-teams'), 10) || 16;
  }
  function updateCreatePreview() {
    var el = document.getElementById('c-preview'); if (!el) return;
    stashCreate();
    var f = ui.newFormat;
    if (f === 'ko') {
      var first = L.resolveBracket({ size: ui.newTeams, slots: [] }, [], {}).rounds[0].key;
      el.innerHTML = ui.newTeams + ' équipes tirées au sort en <b>' + L.roundLabel(first) + '</b>, jusqu\'à la finale.';
    } else if (f === 'poolsonly') {
      el.innerHTML = ui.newPools + ' poule(s) de ' + ui.newSize + ' = <b>' + (ui.newPools * ui.newSize) + ' équipes</b>. Classement, sans tableau final.';
    } else {
      var n = ui.newPools, size = L.bracketSizeFor(n), thirds = size - 2 * n;
      var fr = L.resolveBracket({ size: size, slots: [] }, [], {}).rounds[0].key;
      el.innerHTML = n + ' poule(s) de ' + ui.newSize + ' = ' + (n * ui.newSize) + ' équipes. Tableau à <b>' + size +
        '</b> (' + L.roundLabel(fr) + ') : 2 premiers' + (thirds > 0 ? ' + ' + thirds + ' meilleurs 3es' : '') + '.';
    }
  }

  /* ---- Classement & tableau (public) ------------------------------- */
  function renderStandings() {
    var c = store.config;
    if (fmt() === 'ko') {
      screen.innerHTML = backList() + '<div class="card"><h2>' + esc(c.name) + ' — Tableau</h2>' +
        bracketView(currentBracket()) + '</div>' + adminLink();
      return;
    }
    var standings = L.allStandings(c.numPools, store.teams, store.matches);
    var pools = poolList(c);
    if (pools.indexOf(ui.poolTab) < 0) ui.poolTab = pools[0];

    var html = backList() + '<div class="card"><h2>' + esc(c.name) + ' — Classement</h2>' + poolTabs(pools) +
      standingsTable(standings[ui.poolTab]) +
      '<div class="legend">' +
        '<span><i style="background:var(--green)"></i>1er</span>' +
        '<span><i style="background:var(--gold)"></i>2e</span>' +
        '<span><i style="background:#9aa5a0"></i>3e</span>' +
      '</div>' +
      '<p class="sub" style="margin-top:8px">Départage : points, puis goal-average, puis total de points marqués.</p></div>';

    if (fmt() === 'pools') {
      var q = L.qualifiers(c.numPools, standings);
      if (q.thirdsNeeded > 0 && q.allThirds.length) {
        html += '<div class="card"><h2>Meilleurs 3es</h2>' +
          '<p class="sub">Les ' + q.thirdsNeeded + ' meilleurs 3es complètent le tableau à ' + q.size + '.</p>' + thirdsTable(q) + '</div>';
      }
      if (c.bracket) html += '<div class="card"><h2>Tableau final</h2>' + bracketView(c.bracket) + '</div>';
      else {
        var prog = L.poolProgress(c.numPools, store.matches, poolSize());
        html += '<div class="card"><h2>Tableau final</h2><p class="sub">Il s\'affichera après la clôture des poules (' +
          prog.done + '/' + prog.total + ' matchs joués).</p></div>';
      }
    }
    screen.innerHTML = html + adminLink();
  }
  function adminLink() { return '<a class="back" data-nav="#/admin" style="margin-top:8px">🔧 Administration</a>'; }
  function poolList(c) { var a = []; for (var p = 0; p < c.numPools; p++) a.push(L.poolLabel(p)); return a; }
  function poolTabs(pools) {
    return '<div class="pool-tabs">' + pools.map(function (P) {
      return '<span class="pill ' + (P === ui.poolTab ? 'active' : '') + '" data-act="pool-tab" data-pool="' + P + '">Poule ' + P + '</span>';
    }).join('') + '</div>';
  }
  function standingsTable(rows) {
    if (!rows || !rows.length) return '<p class="sub">Aucune équipe.</p>';
    var body = rows.map(function (r) {
      return '<tr class="qual-' + (r.rank <= 3 ? r.rank : 0) + '">' +
        '<td class="rankbadge">' + r.rank + '</td>' +
        '<td class="name">' + teamName(r.team) + '<small>' + r.pool + r.slot + '</small></td>' +
        '<td>' + r.played + '</td><td>' + r.wins + '</td>' +
        '<td class="pts-col">' + r.pts + '</td>' +
        '<td>' + (r.ga > 0 ? '+' : '') + r.ga + '</td><td>' + r.pf + '</td></tr>';
    }).join('');
    return '<table class="standings"><thead><tr>' +
      '<th>#</th><th style="text-align:left">Équipe</th><th>J</th><th>V</th><th>Pts</th><th>GA</th><th>Marqués</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>';
  }
  function thirdsTable(q) {
    var body = q.allThirds.map(function (r, i) {
      var inn = i < q.thirdsNeeded;
      return '<tr class="' + (inn ? 'qual-1' : '') + '">' +
        '<td class="rankbadge">' + (i + 1) + '</td>' +
        '<td class="name">' + teamName(r.team) + '<small>Poule ' + r.pool + '</small></td>' +
        '<td class="pts-col">' + r.pts + '</td>' +
        '<td>' + (r.ga > 0 ? '+' : '') + r.ga + '</td><td>' + r.pf + '</td>' +
        '<td>' + (inn ? '✅' : '—') + '</td></tr>';
    }).join('');
    return '<table class="standings"><thead><tr><th>#</th><th style="text-align:left">Équipe</th><th>Pts</th><th>GA</th><th>Marqués</th><th>Qual.</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  /* ---- Tableau (bracket) ------------------------------------------- */
  function bracketView(bracket) {
    if (!bracket) return '<p class="sub">Tableau indisponible.</p>';
    var resolved = L.resolveBracket(bracket, store.teams, koResults());
    var cols = resolved.rounds.map(function (rd) {
      var title = rd.key === 'final' ? 'Finale' : L.roundLabel(rd.key);
      var inner = rd.key === 'final' ? finalColumn(resolved)
        : rd.matches.map(function (m) { return bmatch(m.teamA, m.teamB, m.result, m.winner, m.bye); }).join('');
      return '<div class="bround"><h4>' + title + '</h4>' + inner + '</div>';
    }).join('');
    var extra = '';
    if (resolved.thirdPlace) {
      var tp = resolved.thirdPlace;
      extra += '<h3>Petite finale (3e place) — ' + tp.target + ' pts</h3>' +
        '<div class="bracket"><div class="bround">' + bmatch(tp.teamA, tp.teamB, tp.result, tp.winner) + '</div></div>';
    }
    var champ = resolved.champion ? '<div class="champion">🏆 Vainqueur : ' + teamName(teamById(resolved.champion)) + '</div>' : '';
    return '<div class="bracket-scroll"><div class="bracket">' + cols + '</div></div>' + extra + champ;
  }
  function bmatch(a, b, res, winner, bye) {
    var sc = L.scoreOf(res);
    var empty = bye ? 'Exempt' : 'à définir';
    return '<div class="bmatch">' +
      bteamRow(a, bye ? null : (sc ? sc.a : null), winner === a && a, empty) +
      bteamRow(b, bye ? null : (sc ? sc.b : null), winner === b && b, empty) + '</div>';
  }
  function bteamRow(id, score, isWin, empty) {
    var t = id ? teamById(id) : null;
    var tag = (t && t.pool != null) ? teamTag(id) + ' ' : '';
    var nm = t ? (tag + (t.name ? esc(t.name) : 'Éq.' + slotNum(t))) : '<span>' + (empty || 'à définir') + '</span>';
    return '<div class="bteam ' + (isWin ? 'w' : '') + (id ? '' : ' tbd') + '">' +
      '<span class="nm">' + nm + '</span><span class="sc">' + (score == null ? '' : score) + '</span></div>';
  }
  function finalColumn(resolved) {
    var f = resolved.final; if (!f) return '';
    var rows = '';
    for (var i = 0; i < 3; i++) {
      if (i === 2 && !(f.needBelle || legHasScore(f.legs[2]))) continue;
      var res = f.legs[i];
      var w = res ? L.winnerOf(res, f.teamA, f.teamB) : null;
      var lbl = i === 0 ? 'Aller' : (i === 1 ? 'Retour' : 'Belle');
      rows += '<div style="font-size:.72rem;color:var(--muted);margin:2px 0">' + lbl + '</div>' + bmatch(f.teamA, f.teamB, res, w);
    }
    rows += '<div style="text-align:center;font-size:.8rem;margin-top:4px">' +
      (teamTag(f.teamA) || 'A') + ' <b>' + f.winsA + '</b> – <b>' + f.winsB + '</b> ' + (teamTag(f.teamB) || 'B') + '</div>';
    return rows;
  }
  function legHasScore(res) { return !!L.scoreOf(res); }

  /* ---- Fiche de saisie d'un match (admin) -------------------------- */
  function matchCard(m, titleOverride) {
    var ta = teamById(m.teamA), tb = teamById(m.teamB);
    var canPlay = m.teamA && m.teamB;
    var prop = m.proposal;
    var status = m.validated ? '✓ Enregistré' : 'À jouer';
    var statusCls = m.validated ? 'valid' : 'pending';
    var sA = prop ? prop.scoreA : '', sB = prop ? prop.scoreB : '';
    var win = (m.validated && prop) ? (prop.scoreA > prop.scoreB ? 'a' : (prop.scoreB > prop.scoreA ? 'b' : '')) : '';

    var head = '<div class="match-meta"><span class="rk">' +
      (titleOverride ? esc(titleOverride) : ('Poule ' + (m.pool || '') + ' · ' + m.target + ' pts')) +
      '</span><span class="status ' + statusCls + '">' + status + '</span></div>';
    var teams = '<div class="teams">' +
      '<span class="team ' + (win === 'a' ? 'win' : '') + '">' + teamName(ta) + '</span>' +
      '<span class="vs">contre</span>' +
      '<span class="team b ' + (win === 'b' ? 'win' : '') + '">' + teamName(tb) + '</span></div>';
    if (!canPlay) return '<div class="match">' + head + teams + '<p class="sub">En attente des équipes qualifiées.</p></div>';

    var editor = '<div class="field-2" style="margin-top:10px">' +
      '<div><label>Points ' + labelName(ta, m.teamA) + '</label>' +
        '<input type="number" inputmode="numeric" id="sa-' + m.id + '" value="' + sA + '" placeholder="0"></div>' +
      '<div><label>Points ' + labelName(tb, m.teamB) + '</label>' +
        '<input type="number" inputmode="numeric" id="sb-' + m.id + '" value="' + sB + '" placeholder="0"></div></div>' +
      '<div class="btn-row" style="margin-top:10px">' +
      '<button class="btn primary small" data-act="admin-set" data-match="' + m.id + '">Enregistrer</button>' +
      (prop ? '<button class="btn danger small" data-act="admin-clear" data-match="' + m.id + '">Effacer</button>' : '') + '</div>';
    return '<div class="match">' + head + teams + editor + '</div>';
  }
  function labelName(t, id) { return (t && t.name) ? esc(t.name) : (id ? (esc(teamTag(id)) || 'Éq.') : '?'); }
  function koTitle(e) {
    if (e.key === 'final') return 'Finale — ' + (e.leg === 0 ? 'Aller' : (e.leg === 1 ? 'Retour' : 'Belle'));
    return L.roundLabel(e.key);
  }

  /* ---- Administration ---------------------------------------------- */
  function isAdminUnlocked() { return sessionStorage.getItem('bt:admin:' + state.tid) === '1'; }
  function renderAdmin() {
    if (!isAdminUnlocked()) return renderAdminLogin();
    renderAdminDash(store.config);
  }
  function renderAdminLogin() {
    screen.innerHTML = backList() +
      '<div class="card"><h2>Administration — ' + esc(store.config.name) + '</h2><p class="sub">Entrez le code administrateur.</p>' +
      '<label>Code</label><input id="a-pin" type="password" placeholder="Code secret">' +
      '<div style="height:10px"></div>' +
      '<button class="btn primary block" data-act="admin-unlock">Déverrouiller</button></div>';
  }
  function renderAdminDash(c) {
    var assigned = store.teams.filter(function (t) { return t.assigned; }).length;
    var tabs = fmt() === 'poolsonly' ? ['equipes', 'poules', 'reglages']
      : fmt() === 'ko' ? ['equipes', 'tableau', 'reglages']
      : ['equipes', 'poules', 'tableau', 'reglages'];
    var labels = { equipes: 'Équipes', poules: 'Poules', tableau: 'Tableau', reglages: 'Réglages' };
    if (tabs.indexOf(ui.adminTab) < 0) ui.adminTab = 'equipes';
    var nav = '<div class="pool-tabs">' + tabs.map(function (tb) {
      return '<span class="pill ' + (ui.adminTab === tb ? 'active' : '') + '" data-act="admin-tab" data-tab="' + tb + '">' + labels[tb] + '</span>';
    }).join('') + '</div>';

    var meta = fmt() === 'ko' ? (formatLabel('ko') + ' · ' + assigned + '/' + store.teams.length + ' équipes')
      : (c.numPools + ' poule(s) de ' + poolSize() + ' · ' + assigned + '/' + store.teams.length + ' équipes');
    var head = '<div class="card"><h2>' + esc(c.name) + '</h2><p class="sub">' + formatLabel(fmt()) + ' · ' + meta + '</p>' + nav + '</div>';

    var body;
    if (ui.adminTab === 'equipes') body = adminEquipes(c, assigned);
    else if (ui.adminTab === 'poules') body = adminPoules(c);
    else if (ui.adminTab === 'tableau') body = adminTableau(c);
    else body = adminReglages(c);

    screen.innerHTML = backList() + head + body;
    var input = document.getElementById('new-team');
    if (input) input.focus();
  }

  function adminEquipes(c, assigned) {
    var full = assigned >= store.teams.length;
    var isKo = fmt() === 'ko';
    var draw = ui.lastDraw
      ? '<div class="notice info">🎲 <b>' + esc(ui.lastDraw.name) + '</b>' +
        (isKo ? ' est entrée dans le tableau' : ' → Poule <b>' + ui.lastDraw.pool + '</b>, Équipe <b>' + ui.lastDraw.slot + '</b>') + '</div>'
      : '';
    var form = full
      ? '<div class="notice">Toutes les places sont attribuées (' + store.teams.length + '). ' +
        (isKo ? 'Allez à l\'onglet <b>Tableau</b>.' : 'Passez à l\'onglet <b>Poules</b>.') + '</div>'
      : draw + '<label>Nom de l\'équipe</label>' +
        '<div class="field-2"><div style="flex:2"><input id="new-team" placeholder="Ex. Les Atouts" autocomplete="off" value="' + esc(ui.draftTeam) + '"></div>' +
        '<button class="btn primary" data-act="add-team" style="flex:1">🎲 Tirer</button></div>' +
        '<p class="sub">' + (isKo ? 'Tirage au sort de la place dans le tableau. ' : 'La poule et le numéro sont tirés au sort. ') +
        (store.teams.length - assigned) + ' place(s) restante(s).</p>';

    var grid = '';
    if (isKo) {
      var cells = store.teams.slice().sort(function (a, b) { return a.pos - b.pos; }).map(teamCell).join('');
      grid = '<div class="grid-teams">' + cells + '</div>';
    } else {
      for (var p = 0; p < c.numPools; p++) {
        var P = L.poolLabel(p);
        var cc = store.teams.filter(function (t) { return t.pool === P; })
          .sort(function (a, b) { return a.slot - b.slot; }).map(teamCell).join('');
        grid += '<h3>Poule ' + P + '</h3><div class="grid-teams">' + cc + '</div>';
      }
    }
    return '<div class="card"><h2>Saisie des équipes</h2>' + form + '</div>' +
      '<div class="card"><h2>' + (isKo ? 'Équipes' : 'Composition des poules') + ' (' + assigned + '/' + store.teams.length + ')</h2>' + grid + '</div>';
  }
  function teamCell(t) {
    var label = t.pool != null ? (t.pool + t.slot) : ('Place ' + (t.pos + 1));
    return '<div class="match" style="padding:8px;margin:0"><div class="match-meta"><span class="rk">' + label + '</span>' +
      (t.assigned ? '<span class="btn-row" style="gap:6px">' +
        '<button class="pill" data-act="rename-team" data-team="' + t.id + '">✎</button>' +
        '<button class="pill" data-act="remove-team" data-team="' + t.id + '">🗑</button></span>' : '') +
      '</div><b>' + (t.assigned ? teamName(t) : '<span class="sub">libre</span>') + '</b></div>';
  }

  function adminPoules(c) {
    var standings = L.allStandings(c.numPools, store.teams, store.matches);
    var pools = poolList(c);
    if (pools.indexOf(ui.poolTab) < 0) ui.poolTab = pools[0];
    var tabs = '<div class="pool-tabs">' + pools.map(function (P) {
      return '<span class="pill ' + (P === ui.poolTab ? 'active' : '') + '" data-act="pool-tab" data-pool="' + P + '">' + P + '</span>';
    }).join('') + '</div>';
    var P = ui.poolTab;
    var html = '<div class="card"><h2>Poule ' + P + '</h2>' + tabs + standingsTable(standings[P]) + '</div>';
    var pm = store.matches.filter(function (m) { return m.phase === 'pool' && m.pool === P; })
      .sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    html += '<div class="card"><h2>Matchs de la poule ' + P + '</h2>' +
      '<p class="sub">Saisissez le score de chaque rencontre (en ' + L.POOL_TARGET + ' points).</p>';
    pm.forEach(function (m) { html += matchCard(m); });
    return html + '</div>';
  }

  function adminTableau(c) {
    if (fmt() === 'ko') {
      var assigned = store.teams.filter(function (t) { return t.assigned; }).length;
      var br = currentBracket();
      var html = '<div class="card"><h2>Tableau</h2>' +
        (assigned < store.teams.length ? '<div class="notice">Le tableau se complète au fur et à mesure (' + assigned + '/' + store.teams.length + ' équipes).</div>' : '') +
        bracketView(br) + '</div>';
      return html + koScoreCard(br);
    }
    // Format « poules + tableau »
    var standings = L.allStandings(c.numPools, store.teams, store.matches);
    var prog = L.poolProgress(c.numPools, store.matches, poolSize());
    if (!c.bracket) {
      var q = L.qualifiers(c.numPools, standings);
      return '<div class="card"><h2>Lancer la phase finale</h2>' +
        '<p class="sub">Poules jouées : ' + prog.done + '/' + prog.total + '.' +
        (prog.complete ? ' ✅ Toutes les rencontres sont saisies.' : ' ⚠️ Toutes les rencontres ne sont pas terminées.') + '</p>' +
        '<p class="sub">Le tableau à ' + q.size + ' réunira les 2 premiers de chaque poule' +
        (q.thirdsNeeded > 0 ? ' et les ' + q.thirdsNeeded + ' meilleurs 3es' : '') +
        '. Aucun affrontement de même poule au 1er tour.</p>' +
        '<div class="notice">Une fois lancé, le tirage est figé (les scores restent corrigeables).</div>' +
        '<button class="btn primary block" data-act="start-bracket">Clôturer les poules &amp; générer le tableau</button></div>';
    }
    return '<div class="card"><h2>Tableau final</h2>' + bracketView(c.bracket) + '</div>' + koScoreCard(c.bracket);
  }
  function koScoreCard(br) {
    var resolved = L.resolveBracket(br, store.teams, koResults());
    var html = '<div class="card"><h2>Saisie des scores — phase finale</h2>';
    var list = L.bracketMatchList(resolved).filter(function (e) {
      if (e.id === 'final-2') return resolved.final && resolved.final.needBelle;
      return true;
    });
    var any = false;
    list.forEach(function (e) {
      if (!e.teamA || !e.teamB) return;
      any = true;
      var m = Object.assign({}, matchById(e.id) || {}, { id: e.id, teamA: e.teamA, teamB: e.teamB, target: e.target, phase: 'ko', roundKey: e.key });
      html += matchCard(m, koTitle(e));
    });
    if (!any) html += '<p class="sub">Aucun match jouable pour l\'instant.</p>';
    return html + '</div>';
  }

  function adminReglages(c) {
    var phases = fmt() === 'ko'
      ? '<button class="btn small" data-act="set-phase" data-phase="ko">En cours</button><button class="btn small" data-act="set-phase" data-phase="done">Terminé</button>'
      : '<button class="btn small" data-act="set-phase" data-phase="pools">Poules</button>' +
        (fmt() === 'pools' ? '<button class="btn small" data-act="set-phase" data-phase="bracket">Phase finale</button>' : '') +
        '<button class="btn small" data-act="set-phase" data-phase="done">Terminé</button>';
    return '<div class="card"><h2>Réglages</h2>' +
      '<p class="sub">« ' + esc(c.name) + ' » — ' + formatLabel(fmt()) + '.</p>' +
      '<label>Phase</label><div class="btn-row">' + phases + '</div>' +
      '<div style="height:16px"></div>' +
      '<button class="btn small block" data-act="lock-admin">Verrouiller l\'administration</button>' +
      '<div style="height:20px"></div><h3>Zone dangereuse</h3>' +
      '<p class="sub">Réinitialiser efface ce tournoi (équipes, scores, réglages).</p>' +
      '<button class="btn danger block" data-act="reset">Supprimer ce tournoi</button></div>';
  }

  /* ================================================================= *
   *  ACTIONS                                                          *
   * ================================================================= */
  screen.addEventListener('click', function (ev) {
    var nav = ev.target.closest('[data-nav]');
    if (nav) { ev.preventDefault(); go(nav.getAttribute('data-nav')); return; }
    var a = ev.target.closest('[data-act]');
    if (!a) return;
    handleAction(a.getAttribute('data-act'), a, a.getAttribute('data-match'));
  });
  screen.addEventListener('input', function (ev) { if (ev.target.id === 'new-team') ui.draftTeam = ev.target.value; });
  screen.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.id === 'new-team') { ev.preventDefault(); handleAction('add-team'); }
  });
  screen.addEventListener('focusout', function () { setTimeout(function () { if (pendingRender) render(); }, 50); });

  function readScores(mid) {
    return { sa: parseInt((document.getElementById('sa-' + mid) || {}).value, 10),
             sb: parseInt((document.getElementById('sb-' + mid) || {}).value, 10) };
  }
  function matchBase(mid) {
    var m = matchById(mid);
    if (m && m.phase === 'pool') return { phase: 'pool', pool: m.pool, slotA: m.slotA, slotB: m.slotB, teamA: m.teamA, teamB: m.teamB, target: m.target };
    var resolved = L.resolveBracket(currentBracket(), store.teams, koResults());
    var e = L.bracketMatchList(resolved).filter(function (x) { return x.id === mid; })[0];
    return e ? { phase: 'ko', teamA: e.teamA, teamB: e.teamB, target: e.target, roundKey: e.key } : { phase: 'ko' };
  }

  function handleAction(act, a, mid) {
    var tid = state.tid;
    if (act === 'new-tour') { ui.newFormat = 'pools'; ui.newName = ''; ui.newPin = ''; ui.lastDraw = null; go('#/new'); return; }
    if (act === 'open-tour') { ui.adminTab = 'equipes'; ui.poolTab = 'A'; openTournament(a.getAttribute('data-id')); go('#/classement'); return; }
    if (act === 'del-tour') {
      var id = a.getAttribute('data-id');
      modalConfirm('Supprimer ce tournoi ? Action irréversible.', 'Supprimer').then(function (ok) {
        if (!ok) return;
        sessionStorage.removeItem('bt:admin:' + id);
        DB.resetTournament(id).then(function () { if (state.tid === id) openTournament(null); ui.tourList = null; toast('Tournoi supprimé.'); renderList(); });
      });
      return;
    }
    if (act === 'new-format') { stashCreate(); ui.newFormat = a.getAttribute('data-f'); render(); return; }
    if (act === 'do-create') return doCreate();

    if (act === 'add-team') {
      var inp = document.getElementById('new-team');
      var name = ((inp && inp.value) || ui.draftTeam || '').trim();
      if (!name) { toast('Saisissez un nom d\'équipe.'); return; }
      ui.draftTeam = '';
      DB.addTeam(tid, name).then(function (t) {
        ui.lastDraw = { name: t.name, pool: t.pool, slot: t.slot };
        toast(name + (t.pool != null ? ' → Poule ' + t.pool + ', Équipe ' + t.slot : ' entre dans le tableau'));
        render(true);
        var i = document.getElementById('new-team'); if (i) i.focus();
      }).catch(function () { toast('Toutes les places sont prises.'); });
      return;
    }
    if (act === 'rename-team') {
      var t2 = teamById(a.getAttribute('data-team')); if (!t2) return;
      modalPrompt('Nouveau nom de l\'équipe :', t2.name || '').then(function (nn) {
        if (nn != null && nn.trim()) DB.renameTeam(tid, t2.id, nn.trim()).then(function () { toast('Équipe renommée.'); });
      });
      return;
    }
    if (act === 'remove-team') {
      var t3 = teamById(a.getAttribute('data-team')); if (!t3) return;
      modalConfirm('Retirer l\'équipe « ' + (t3.name || slotNum(t3)) + ' » ? Sa place redeviendra libre.', 'Retirer').then(function (ok) {
        if (ok) DB.removeTeam(tid, t3.id).then(function () { toast('Équipe retirée.'); });
      });
      return;
    }
    if (act === 'admin-set') {
      var s = readScores(mid);
      if (isNaN(s.sa) || isNaN(s.sb)) { toast('Saisissez les deux scores.'); return; }
      if (s.sa === s.sb) { toast('Un match ne peut pas être nul.'); return; }
      DB.adminSet(tid, mid, matchBase(mid), s.sa, s.sb).then(function () { toast('Score enregistré.'); });
      return;
    }
    if (act === 'admin-clear') { DB.adminClear(tid, mid).then(function () { toast('Score effacé.'); }); return; }
    if (act === 'pool-tab') { ui.poolTab = a.getAttribute('data-pool'); render(); return; }
    if (act === 'admin-tab') { ui.adminTab = a.getAttribute('data-tab'); ui.lastDraw = null; render(); return; }
    if (act === 'admin-unlock') return adminUnlock();
    if (act === 'start-bracket') return startBracket();
    if (act === 'set-phase') { DB.setPhase(tid, a.getAttribute('data-phase')).then(function () { toast('Phase mise à jour.'); }); return; }
    if (act === 'lock-admin') { sessionStorage.removeItem('bt:admin:' + tid); go('#/classement'); return; }
    if (act === 'reset') {
      modalConfirm('Supprimer définitivement ce tournoi ?', 'Supprimer').then(function (ok) {
        if (!ok) return;
        sessionStorage.removeItem('bt:admin:' + tid);
        DB.resetTournament(tid).then(function () { openTournament(null); ui.tourList = null; toast('Tournoi supprimé.'); go('#/'); });
      });
      return;
    }
  }

  function doCreate() {
    stashCreate();
    var name = (ui.newName || '').trim() || 'Tournoi de belote';
    var pin = ui.newPin;
    if (!pin || pin.length < 3) { toast('Choisissez un code d\'au moins 3 caractères.'); return; }
    var f = ui.newFormat;
    var config = { name: name, format: f };
    if (f === 'ko') { config.numTeams = ui.newTeams; config.phase = 'ko'; }
    else { config.numPools = ui.newPools; config.poolSize = ui.newSize; config.phase = 'setup'; }
    var tid = newTid(name);
    sha256(pin).then(function (hash) {
      config.adminHash = hash;
      return DB.createTournament(tid, config);
    }).then(function () {
      openTournament(tid);
      sessionStorage.setItem('bt:admin:' + tid, '1');
      ui.adminTab = 'equipes'; ui.tourList = null;
      toast('Tournoi créé !');
      go('#/admin');
    });
  }
  function adminUnlock() {
    var pin = document.getElementById('a-pin').value;
    sha256(pin).then(function (hash) {
      if (store.config && hash === store.config.adminHash) { sessionStorage.setItem('bt:admin:' + state.tid, '1'); render(); }
      else toast('Code incorrect.');
    });
  }
  function startBracket() {
    var c = store.config, tid = state.tid;
    var standings = L.allStandings(c.numPools, store.teams, store.matches);
    var q = L.qualifiers(c.numPools, standings);
    var enough = q.winners.length + q.runners.length + q.thirds.length >= q.size;
    var ask = enough ? Promise.resolve(true)
      : modalConfirm('Toutes les places qualificatives ne sont pas encore déterminées. Générer le tableau quand même ?', 'Générer');
    ask.then(function (ok) {
      if (!ok) return;
      var bracket = L.seedBracket(c.numPools, standings);
      DB.startBracket(tid, bracket).then(function () { ui.adminTab = 'tableau'; toast('Tableau généré !'); render(); });
    });
  }

  /* ---- Thème ------------------------------------------------------- */
  (function theme() {
    var saved = localStorage.getItem('bt:theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    var btn = document.getElementById('theme-toggle');
    function sync() { btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'; }
    sync();
    btn.addEventListener('click', function () {
      var d = document.documentElement.getAttribute('data-theme') === 'dark' ? '' : 'dark';
      if (d) document.documentElement.setAttribute('data-theme', d);
      else document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('bt:theme', d); sync();
    });
  })();
  document.querySelector('.logo').addEventListener('click', function () { go('#/'); });

  /* ---- Démarrage --------------------------------------------------- */
  DB.init().then(function (info) {
    me.uid = info.uid; me.mode = info.mode;
    var urlT = new URLSearchParams(location.search).get('t');
    if (urlT) { openTournament(urlT); if (!location.hash || location.hash === '#/') location.hash = '#/classement'; }
    if (!location.hash) location.hash = '#/';
    render();
  }).catch(function (e) {
    screen.innerHTML = '<div class="notice">Erreur de connexion : ' + esc(e && e.message) + '.</div>';
  });
})();
