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
             newFormat: 'pools', newName: '', newPin: '', newPools: 6, newTeams: 16,
             bracketChoice: null, tourList: null, poolSearch: '', scoreSearch: '' };
  var screen = document.getElementById('screen');
  var pendingRender = false;
  var lastRenderRoute = null;

  /* ---- Utilitaires ------------------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Minuscule + sans accents, pour une recherche tolérante.
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function fmt() { return (store.config && store.config.format) || 'pools'; }
  function rules() { return (store.config && store.config.rules) || null; }
  function poolSize() { return (store.config && store.config.poolSize) || 4; }
  // Une phase a-t-elle démarré ? (au moins une manche validée)
  // key : 'pool' pour les poules, sinon une clé de tour (qf, sf, final, p3, r16…).
  function roundKeyOfId(id) { return String(id).replace(/_m\d+$/, '').split('-')[0]; }
  function poolStarted() { return store.matches.some(function (m) { return m.validated && m.phase === 'pool'; }); }
  function roundStarted(key) {
    return store.matches.some(function (m) { return m.validated && m.phase === 'ko' && roundKeyOfId(m.id) === key; });
  }
  function ordinalFr(n) { return n === 1 ? '1er' : (n + 'e'); } // 1er, 2e, 3e…
  // Nombre d'équipes placées dans une poule (tailles variables).
  function poolSizeOf(P) { return store.teams.filter(function (t) { return t.pool === P && t.assigned; }).length; }
  // Nombre total d'équipes placées (après tirage).
  function teamCount() { return store.teams.filter(function (t) { return t.assigned; }).length; }
  // Avancement des poules (rencontres tranchées / total), selon la config.
  function poolProg() {
    var c = store.config;
    if (!c) return { done: 0, total: 0, complete: false };
    return L.poolProgress(c.numPools, store.teams, store.matches, rules());
  }
  // Nom du tour pour une taille de tableau (2 → Finale, 4 → 1/2, 8 → 1/4…).
  function roundNameForSize(size) {
    var r = L.resolveBracket({ size: size, slots: [] }, [], {}).rounds[0];
    return r ? L.roundLabel(r.key) : '';
  }
  // Tour de départ choisi : config.bracketSize si valide pour `total` équipes,
  // sinon le plus grand tableau possible (« Auto »).
  function chosenBracketSize(total) {
    var sizes = L.validBracketSizes(total);
    if (!sizes.length) return 0;
    var pref = store.config && store.config.bracketSize;
    return (sizes.indexOf(pref) >= 0) ? pref : sizes[sizes.length - 1];
  }
  // Décrit la qualification : « les 4 1ers + les 4 2es + les 2 meilleurs 3es ».
  function describeQual(rankCounts) {
    var parts = [];
    Object.keys(rankCounts).map(Number).sort(function (a, b) { return a - b; }).forEach(function (rk) {
      var n = rankCounts[rk];
      parts.push('les ' + n + ' ' + (rk <= 2 ? ordinalFr(rk) + 's' : 'meilleurs ' + ordinalFr(rk) + 's'));
    });
    return parts.join(' + ');
  }
  // Ensemble des équipes qualifiées pour le tableau (selon le tour de départ
  // choisi). null si pas de tableau (poules seules / élimination directe).
  function qualSet() {
    var c = store.config;
    if (!c || fmt() !== 'pools') return null;
    var size = chosenBracketSize(teamCount());
    if (!size) return null;
    var standings = L.allStandings(c.numPools, store.teams, store.matches, rules());
    var set = {};
    L.qualifyFor(c.numPools, standings, size).seeds.forEach(function (r) { if (r) set[r.teamId] = true; });
    return set;
  }
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
  // Un joueur : prénom normal, nom(s) de famille en gras (1er mot = prénom).
  function playerNameHtml(s) {
    s = (s || '').trim();
    if (!s) return '';
    var parts = s.split(/\s+/);
    if (parts.length < 2) return esc(s);
    return esc(parts[0]) + ' <b>' + esc(parts.slice(1).join(' ')) + '</b>';
  }
  // Nom d'équipe sur UNE seule ligne : « / » sépare les 2 joueurs (prénom
  // normal, nom de famille en gras) — pour le classement condensé.
  function teamNameLines(t) {
    if (!t) return '—';
    if (!t.name) return '<span class="muted">Équipe ' + slotNum(t) + ' (vide)</span>';
    return t.name.split('/').map(playerNameHtml).join(' / ');
  }
  function teamTag(id) { var t = teamById(id); return (t && t.pool != null) ? (t.pool + t.slot) : ''; }
  // Liste des équipes saisies (avant/après tirage).
  function rosterList() {
    var c = store.config;
    if (c && Array.isArray(c.roster)) return c.roster;
    return store.teams.filter(function (t) { return t.assigned; })
      .slice().sort(function (a, b) { return (a.assignedAt || 0) - (b.assignedAt || 0); })
      .map(function (t) { return { id: t.rid || t.id, name: t.name }; });
  }
  // Le tournoi a-t-il vraiment démarré ? = au moins un score validé.
  // Tant qu'aucun point n'est saisi, tout reste modifiable (liste, tirage,
  // réglages, tableau de test) même si un tableau a été généré pour voir.
  function hasStarted() {
    return store.matches.some(function (m) { return m.validated; });
  }
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
  // Affiche un indicateur « en cours » le temps d'une opération, puis confirme.
  function runBusy(label, promise, doneMsg) {
    var o = openModal('<div class="spinner"></div><p>' + esc(label) + '</p>');
    var box = o.querySelector('.modal'); if (box) box.classList.add('busy');
    function close() { if (o.parentNode) document.body.removeChild(o); }
    var minWait = new Promise(function (r) { setTimeout(r, 350); });
    return Promise.all([Promise.resolve(promise), minWait]).then(function (res) {
      close(); render(true); if (doneMsg) toast('✓ ' + doneMsg); return res[0];
    }, function (e) { close(); throw e; });
  }

  /* ---- Accès équipe (QR / lien par équipe) ------------------------- */
  function bindTeam(tid, teamId) {
    try { localStorage.setItem('bt:teamBind:' + tid, teamId); } catch (e) {}
    try { localStorage.setItem('bt:lastTid', tid); } catch (e) {}
  }
  function boundTeam(tid) {
    try { return localStorage.getItem('bt:teamBind:' + tid); } catch (e) { return null; }
  }
  function teamLink(tid, teamId) {
    var base = location.origin + location.pathname;
    return base + '?t=' + encodeURIComponent(tid) + '&eq=' + encodeURIComponent(teamId) + '#/equipe';
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
  function modalPrompt(msg, initial, isPassword) {
    return new Promise(function (res) {
      var o = openModal('<p>' + esc(msg) + '</p><input id="modal-input" type="' + (isPassword ? 'password' : 'text') + '" value="' + esc(initial || '') + '">' +
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
    // Conserve la position de défilement quand on re-rend la même vue (ex. mise
    // à jour temps réel d'un score) : sinon l'écran « remonte » tout seul.
    var keepScroll = (route === lastRenderRoute);
    var y = keepScroll ? (window.scrollY || window.pageYOffset || 0) : 0;
    screen.classList.remove('standings-full'); // réactivé par le classement condensé
    renderRoute(route);
    lastRenderRoute = route;
    if (keepScroll && y) window.scrollTo(0, y);
  }
  function renderRoute(route) {
    if (route === '#/' || route === '') return renderList();
    if (route === '#/new') return renderCreate();
    if (!state.tid) { go('#/'); return; }
    if (state.tid && !store.config) { screen.innerHTML = backList() + '<div class="loading">Chargement…</div>'; return; }
    if (route === '#/equipe') return renderTeam();
    if (route === '#/saisie') return renderScore();
    if (route === '#/classement') return renderStandings();
    if (route === '#/admin') return renderAdmin();
    renderList();
  }
  function backList() { return '<a class="back" data-nav="#/">← Mes tournois</a>'; }

  /* ---- Accueil : liste des tournois -------------------------------- */
  function renderList() {
    DB.listTournaments().then(
      function (list) { ui.tourList = list; ui.listError = null; paintList(); },
      function (e) { ui.listError = (e && e.message) || 'erreur de chargement'; paintList(); });
    paintList();
  }
  function paintList() {
    var list = ui.tourList || [];
    var err = ui.listError ? '<div class="notice">⚠️ Impossible de charger la liste : ' + esc(ui.listError) + '</div>' : '';
    var cards = list.length ? list.map(function (c) {
      var meta = c.format === 'ko'
        ? (c.numTeams + ' équipes · ' + formatLabel('ko'))
        : (c.numPools + ' poule(s) de ' + (c.poolSize || 4) + ' · ' + formatLabel(c.format || 'pools'));
      return '<div class="menu-tile" style="justify-content:space-between">' +
        '<span data-act="open-tour" data-id="' + esc(c.id) + '" style="flex:1;cursor:pointer">' +
        '<b>' + esc(c.name) + '</b><span>' + meta + '</span></span>' +
        '<button class="pill" data-act="admin-tour" data-id="' + esc(c.id) + '" title="Administration">🔧</button>' +
        '<button class="pill" data-act="del-tour" data-id="' + esc(c.id) + '" title="Supprimer">🗑</button></div>';
    }).join('') : (ui.tourList === null
      ? '<p class="sub">Chargement…</p>'
      : '<p class="sub">Aucun tournoi enregistré pour l\'instant.</p>');
    screen.innerHTML = '<div class="card"><h2>Mes tournois</h2>' + err + cards +
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
      specific = '<label>Nombre de poules</label>' +
        '<input id="c-pools" type="number" min="1" max="26" value="' + ui.newPools + '">';
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
      '<button class="btn primary block" id="do-create-btn" data-act="do-create">Créer le tournoi</button></div>';
    updateCreatePreview();
    ['c-pools', 'c-teams'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.addEventListener('input', updateCreatePreview);
    });
  }
  function stashCreate() {
    var g = function (id) { var e = document.getElementById(id); return e ? e.value : null; };
    if (g('c-name') != null) ui.newName = g('c-name');
    if (g('c-pin') != null) ui.newPin = g('c-pin');
    if (g('c-pools') != null) ui.newPools = Math.max(1, Math.min(26, parseInt(g('c-pools'), 10) || 1));
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
      el.innerHTML = '<b>' + ui.newPools + ' poule(s)</b>. Les équipes inscrites seront réparties au hasard, en poules de tailles équilibrées (ex. 22 en 4 poules → 6, 6, 5, 5). Classement, sans tableau final.';
    } else {
      el.innerHTML = '<b>' + ui.newPools + ' poule(s)</b>. Les équipes inscrites seront réparties au hasard, en poules de tailles équilibrées (ex. 22 en 4 poules → 6, 6, 5, 5). Le <b>tour de départ du tableau</b> (1/16, 1/8, 1/4, 1/2 ou finale) se choisit à la <b>clôture des poules</b>.';
    }
  }

  /* ---- Classement & tableau (public) ------------------------------- */
  function renderStandings() {
    var c = store.config;
    if (fmt() === 'ko') {
      screen.innerHTML = backList() + '<div class="card bracket-card"><h2>' + esc(c.name) + ' — Tableau</h2>' +
        bracketView(currentBracket()) + '</div>' + adminLink();
      return;
    }
    var standings = L.allStandings(c.numPools, store.teams, store.matches, rules());
    var pools = poolList(c);
    if (pools.indexOf(ui.poolTab) < 0) ui.poolTab = pools[0];
    var view = ui.standView || 'detail';

    var viewToggle = '<div class="pool-tabs">' +
      '<span class="pill ' + (view === 'detail' ? 'active' : '') + '" data-act="stand-view" data-v="detail">Détaillé</span>' +
      '<span class="pill ' + (view === 'condense' ? 'active' : '') + '" data-act="stand-view" data-v="condense">Condensé (toutes poules)</span></div>';

    var qual = qualSet();
    var legend = '';
    if (qual) {
      var qSize = chosenBracketSize(teamCount());
      var qLabel = qSize === 2 ? 'la finale' : 'les ' + roundNameForSize(qSize);
      legend = '<div class="legend"><span><i style="background:var(--green)"></i>Qualifié pour ' + qLabel + '</span></div>';
    }
    var body;
    if (view === 'condense') {
      screen.classList.add('standings-full'); // pleine largeur pour cette vue
      body = '<div class="standings-grid">' + pools.map(function (P) {
        return '<div class="mini-pool"><h4>Poule ' + P + '</h4>' + compactStandingsTable(standings[P], qual) + '</div>';
      }).join('') + '</div>' + legend;
    } else {
      body = poolTabs(pools) + standingsTable(standings[ui.poolTab], qual) + legend +
        '<p class="sub" style="margin-top:8px">Départage : points, puis +/- (différence de points), puis total de points marqués (non affiché).</p>';
    }
    var html = backList() + '<div class="card"><h2>' + esc(c.name) + ' — Classement</h2>' + viewToggle + body + '</div>';

    if (fmt() === 'pools') {
      if (c.bracket) html += '<div class="card bracket-card"><h2>Tableau final</h2>' + bracketView(c.bracket) + '</div>';
      else {
        var prog = poolProg();
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
  function rowQualClass(r, qual) {
    if (qual) return qual[r.teamId] ? 'qual-in' : '';
    return 'qual-' + (r.rank <= 3 ? r.rank : 0); // pas de tableau : couleur par rang
  }
  function standingsTable(rows, qual) {
    if (!rows || !rows.length) return '<p class="sub">Aucune équipe.</p>';
    var body = rows.map(function (r) {
      return '<tr class="' + rowQualClass(r, qual) + '">' +
        '<td class="rankbadge">' + r.rank + '</td>' +
        '<td class="name">' + teamName(r.team) + '<small>' + r.pool + r.slot + '</small></td>' +
        '<td>' + r.played + '</td><td>' + r.wins + '</td>' +
        '<td class="pts-col">' + r.pts + '</td>' +
        '<td>' + (r.ga > 0 ? '+' : '') + r.ga + '</td></tr>';
    }).join('');
    return '<table class="standings">' +
      '<colgroup><col class="c-rank"><col><col class="c-n"><col class="c-n"><col class="c-n"><col class="c-diff"></colgroup>' +
      '<thead><tr>' +
      '<th>#</th><th style="text-align:left">Équipe</th><th>J</th><th>V</th><th>Pts</th><th>+/-</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>';
  }
  function compactStandingsTable(rows, qual) {
    if (!rows || !rows.length) return '<p class="sub">—</p>';
    var body = rows.map(function (r) {
      return '<tr class="' + rowQualClass(r, qual) + '">' +
        '<td class="rankbadge">' + r.rank + '</td>' +
        '<td class="name">' + teamNameLines(r.team) + '</td>' +
        '<td>' + r.played + '</td>' +
        '<td class="pts-col">' + r.pts + '</td>' +
        '<td>' + (r.ga > 0 ? '+' : '') + r.ga + '</td></tr>';
    }).join('');
    return '<table class="standings compact">' +
      '<colgroup><col class="c-rank"><col><col class="c-n"><col class="c-n"><col class="c-diff"></colgroup>' +
      '<thead><tr>' +
      '<th>#</th><th style="text-align:left">Équipe</th><th>J</th><th>Pts</th><th>+/-</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>';
  }
  /* ---- Tableau (bracket) ------------------------------------------- */
  function bracketView(bracket) {
    if (!bracket) return '<p class="sub">Tableau indisponible.</p>';
    var resolved = L.resolveBracket(bracket, store.teams, koResults(), rules());
    var cols = resolved.rounds.map(function (rd) {
      var title = (rd.key === 'final' ? 'Finale' : L.roundLabel(rd.key)) + ' · ' + rd.target + ' pts';
      var inner = rd.matches.map(bmatch).join('');
      // La petite finale (3e place) se place sous la finale, dans la même colonne.
      if (rd.key === 'final' && resolved.thirdPlace) {
        inner += '<div class="bround-sub">Petite finale (3e place) · ' + resolved.thirdPlace.target + ' pts</div>' +
          bmatch(resolved.thirdPlace);
      }
      return '<div class="bround"><h4>' + title + '</h4>' + inner + '</div>';
    }).join('');
    var champ = resolved.champion ? '<div class="champion">🏆 Vainqueur : ' + teamName(teamById(resolved.champion)) + '</div>' : '';
    return '<div class="bracket-scroll"><div class="bracket">' + cols + '</div></div>' + champ;
  }
  // Une rencontre du tableau : noms + (pour les matchs à manches) le détail des
  // manches et le nombre de manches gagnées, vainqueur en surbrillance.
  function bmatch(m) {
    var multi = !!(m.manches && m.manches.length && !m.manches[0].single);
    var detail = '';
    if (m.teamA && m.teamB && m.manches && m.manches.length) {
      var parts = m.manches.map(function (mm) {
        var sc = mm.score;
        var lbl = mm.belle ? 'Belle' : (mm.single ? '' : 'M' + mm.no + ' ');
        return lbl + (sc ? (sc.a + '–' + sc.b) : '…');
      });
      if (parts.join('').replace(/[^0-9]/g, '')) detail = '<div class="bmanches">' + esc(parts.join(' · ')) + '</div>';
    }
    return '<div class="bmatch">' +
      bteamRow(m.teamA, multi ? m.wonA : null, m.winner === m.teamA && m.teamA, m.bye ? 'Exempt' : 'à définir') +
      bteamRow(m.teamB, multi ? m.wonB : null, m.winner === m.teamB && m.teamB, m.bye ? 'Exempt' : 'à définir') +
      detail + '</div>';
  }
  function bteamRow(id, score, isWin, empty) {
    var t = id ? teamById(id) : null;
    var tag = (t && t.pool != null) ? teamTag(id) + ' ' : '';
    var nm = t ? (tag + (t.name ? esc(t.name) : 'Éq.' + slotNum(t))) : '<span>' + (empty || 'à définir') + '</span>';
    return '<div class="bteam ' + (isWin ? 'w' : '') + (id ? '' : ' tbd') + '">' +
      '<span class="nm">' + nm + '</span><span class="sc">' + (score == null ? '' : score) + '</span></div>';
  }

  /* ---- Écran ÉQUIPE (saisie depuis le téléphone de l'équipe) -------- */
  function renderTeam() {
    var myId = boundTeam(state.tid);
    var t = myId ? teamById(myId) : null;
    if (!t) {
      screen.innerHTML = backList() + '<div class="notice">Cet accès équipe n\'est plus disponible. Demandez le lien (ou le QR) à l\'organisateur.</div>';
      return;
    }
    var badge = t.pool != null ? ('Poule ' + t.pool + ' · Équipe ' + t.slot) : 'Tableau';
    var html = '<div class="card"><span class="tag">' + badge + '</span>' +
      '<h2 style="margin-top:8px">' + teamName(t) + '</h2>' +
      '<p class="sub">Saisissez vos scores : l\'équipe adverse valide, et tout remonte à l\'organisateur.</p></div>';

    var mine = [];
    var c = store.config;
    if (c && c.numPools) {
      L.poolMatchList(c.numPools, store.teams, store.matches, rules()).forEach(function (e) {
        if (!(e.teamA === myId || e.teamB === myId)) return;
        var m = Object.assign({}, matchById(e.id) || {}, { id: e.id, teamA: e.teamA, teamB: e.teamB,
          target: e.target, phase: 'pool', pool: e.pool, slotA: e.slotA, slotB: e.slotB });
        mine.push({ m: m, title: poolEntryTitle(e) });
      });
    }
    var br = currentBracket();
    if (br) {
      var resolved = L.resolveBracket(br, store.teams, koResults(), rules());
      L.bracketMatchList(resolved).forEach(function (e) {
        if (!(e.teamA === myId || e.teamB === myId) || !e.teamA || !e.teamB) return;
        var m = Object.assign({}, matchById(e.id) || {}, { id: e.id, teamA: e.teamA, teamB: e.teamB, target: e.target, phase: 'ko', roundKey: e.key });
        mine.push({ m: m, title: koTitle(e) + ' · ' + e.target + ' pts' });
      });
    }
    if (!mine.length) {
      html += '<div class="card"><p class="sub">Aucun match à saisir pour le moment. Revenez quand vos adversaires seront connus.</p></div>';
    } else {
      html += '<div class="card"><h2>Mes matchs</h2>';
      mine.forEach(function (x) { html += teamMatchCard(x.m, myId, x.title); });
      html += '</div>';
    }
    html += '<a class="back" data-act="exit-team" style="cursor:pointer">Ce n\'est pas votre équipe ? Accès organisateur</a>';
    screen.innerHTML = html;
  }

  function teamMatchCard(m, myId, titleOverride) {
    var ta = teamById(m.teamA), tb = teamById(m.teamB);
    var prop = m.proposal;
    var status = m.validated ? '✓ Validé' : (prop ? 'À valider' : 'À jouer');
    var cls = m.validated ? 'valid' : (prop ? 'proposed' : 'pending');
    var sA = prop ? prop.scoreA : '', sB = prop ? prop.scoreB : '';
    var win = (m.validated && prop) ? (prop.scoreA > prop.scoreB ? 'a' : (prop.scoreB > prop.scoreA ? 'b' : '')) : '';
    var head = '<div class="match-meta"><span class="rk">' +
      (titleOverride ? esc(titleOverride) : ('Poule ' + (m.pool || '') + ' · ' + m.target + ' pts')) +
      '</span><span class="status ' + cls + '">' + status + '</span></div>';
    var teams = '<div class="teams">' +
      '<span class="team ' + (win === 'a' ? 'win' : '') + '">' + teamName(ta) + '</span>' +
      '<span class="vs">contre</span>' +
      '<span class="team b ' + (win === 'b' ? 'win' : '') + '">' + teamName(tb) + '</span></div>';
    var controls = '<div class="field-2" style="margin-top:10px">' +
      '<div><label>Points ' + labelName(ta, m.teamA) + '</label>' +
        '<input type="number" inputmode="numeric" id="sa-' + m.id + '" value="' + sA + '" placeholder="0"></div>' +
      '<div><label>Points ' + labelName(tb, m.teamB) + '</label>' +
        '<input type="number" inputmode="numeric" id="sb-' + m.id + '" value="' + sB + '" placeholder="0"></div></div>';
    var canValidate = prop && !m.validated && prop.byTeamId !== myId;
    var waiting = prop && !m.validated && prop.byTeamId === myId;
    if (waiting) {
      controls += '<p class="sub" style="margin-top:8px">⏳ En attente de validation par l\'équipe adverse. Vous pouvez corriger puis re-proposer.</p>' +
        '<button class="btn small block" data-act="team-propose" data-match="' + m.id + '">Corriger &amp; re-proposer</button>';
    } else if (canValidate) {
      controls += '<p class="sub" style="margin-top:8px">L\'équipe adverse propose ce score. Vérifiez puis validez.</p>' +
        '<div class="btn-row"><button class="btn primary small" data-act="team-validate" data-match="' + m.id + '">✓ Valider</button>' +
        '<button class="btn small" data-act="team-propose" data-match="' + m.id + '">Corriger</button></div>';
    } else if (m.validated) {
      controls += '<button class="btn small block" data-act="team-propose" data-match="' + m.id + '" style="margin-top:8px">Modifier le score</button>';
    } else {
      controls += '<button class="btn primary small block" data-act="team-propose" data-match="' + m.id + '" style="margin-top:10px">Proposer le score</button>';
    }
    return '<div class="match">' + head + teams + controls + '</div>';
  }

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
    var base = e.key === 'final' ? 'Finale'
      : (e.key === 'p3' ? 'Petite finale (3e place)' : L.roundLabel(e.key));
    if (e.belle) return base + ' · Belle';
    if (e.manche) return base + ' · Manche ' + e.manche;
    return base;
  }
  // Titre d'une entrée de saisie de poule (avec manche/belle + points cible).
  function poolEntryTitle(e) {
    var base = 'Poule ' + e.pool;
    if (e.belle) base += ' · Belle';
    else if (e.manche) base += ' · Manche ' + e.manche;
    return base + ' · ' + e.target + ' pts';
  }

  /* ---- Saisie des scores (accès co-admin) -------------------------- *
   * Un co-admin ne fait QUE saisir les scores des matchs. Il déverrouille
   * avec un « code de saisie » (config.coadminHash) OU le code admin. L'écran
   * liste uniquement les rencontres jouables NON encore enregistrées : dès
   * qu'un score est validé, la rencontre disparaît de la liste.             */
  function isCoadminUnlocked() {
    return isAdminUnlocked() || sessionStorage.getItem('bt:coadmin:' + state.tid) === '1';
  }
  function coadminLink(tid) {
    return location.origin + location.pathname + '?t=' + encodeURIComponent(tid) + '#/saisie';
  }
  // Toutes les rencontres jouables et NON encore enregistrées (poules + tableau),
  // ordonnées : poules (par poule puis ordre de match) puis phase finale.
  function pendingMatches() {
    var out = [];
    var c = store.config;
    if (c && c.numPools) {
      L.poolMatchList(c.numPools, store.teams, store.matches, rules()).forEach(function (e) {
        if (!e.teamA || !e.teamB) return;
        var existing = matchById(e.id);
        if (existing && existing.validated) return;
        var m = Object.assign({}, existing || {}, { id: e.id, teamA: e.teamA, teamB: e.teamB,
          target: e.target, phase: 'pool', pool: e.pool, slotA: e.slotA, slotB: e.slotB });
        out.push({ m: m, title: poolEntryTitle(e), sort: '1' + e.pool + e.slotA + e.slotB + (e.manche || 0) });
      });
    }
    var br = currentBracket();
    if (br) {
      var resolved = L.resolveBracket(br, store.teams, koResults(), rules());
      L.bracketMatchList(resolved).forEach(function (e) {
        if (!e.teamA || !e.teamB) return;
        var existing = matchById(e.id);
        if (existing && existing.validated) return;
        var m = Object.assign({}, existing || {}, { id: e.id, teamA: e.teamA, teamB: e.teamB, target: e.target, phase: 'ko', roundKey: e.key });
        out.push({ m: m, title: koTitle(e) + ' · ' + e.target + ' pts', sort: '2' + e.id });
      });
    }
    out.sort(function (a, b) { return a.sort < b.sort ? -1 : (a.sort > b.sort ? 1 : 0); });
    return out;
  }
  function renderScore() {
    if (!isCoadminUnlocked()) return renderScoreLogin();
    renderScoreDash();
  }
  function renderScoreLogin() {
    var c = store.config;
    screen.innerHTML = backList() +
      '<div class="card"><h2>Saisie des scores — ' + esc(c.name) + '</h2>' +
      '<p class="sub">Accès réservé à la saisie des scores. Entrez le code de saisie (ou le code administrateur).</p>' +
      (c.coadminHash ? '' : '<div class="notice">L\'organisateur n\'a pas encore activé d\'accès saisie. Le code administrateur fonctionne néanmoins.</div>') +
      '<label>Code</label><input id="sc-pin" type="password" placeholder="Code">' +
      '<div style="height:10px"></div>' +
      '<button class="btn primary block" data-act="score-unlock">Déverrouiller</button></div>';
  }
  function renderScoreDash() {
    var pend = pendingMatches();
    var search = '<div style="position:relative;margin-top:4px">' +
      '<input id="score-search" placeholder="🔎 Rechercher une rencontre (équipe, A1, poule B, finale…)" autocomplete="off" value="' + esc(ui.scoreSearch || '') + '">' +
      '<span id="score-count" class="sub" style="display:block;margin-top:6px"></span></div>';
    var cards = pend.map(function (e) {
      var m = e.m, ta = teamById(m.teamA), tb = teamById(m.teamB);
      var hay = norm([(ta && ta.name) || '', (tb && tb.name) || '', teamTag(m.teamA), teamTag(m.teamB),
        m.pool ? 'poule ' + m.pool : '', e.title || '', m.phase === 'ko' ? 'tableau finale' : ''].join(' '));
      return '<div class="pool-match-row" data-search="' + esc(hay) + '">' + matchCard(m, e.title || undefined) + '</div>';
    }).join('');
    var empty = pend.length ? '' :
      '<div class="card"><p class="sub">✅ Toutes les rencontres jouables sont enregistrées. Rien à saisir pour l\'instant.</p></div>';
    screen.innerHTML = backList() +
      '<div class="card"><h2>Saisie des scores — ' + esc(store.config.name) + '</h2>' +
      '<p class="sub">Saisissez le score d\'une rencontre puis « Enregistrer » : elle disparaît aussitôt de la liste. ' +
      'Seules les rencontres pas encore enregistrées apparaissent ici.</p>' +
      search +
      '<div id="score-list">' + cards + '</div>' +
      '<p id="score-none" class="sub center hidden">Aucune rencontre ne correspond à « <span id="score-none-q"></span> ».</p>' +
      '</div>' + empty +
      '<a class="back" data-act="lock-score" style="margin-top:8px;cursor:pointer">🔒 Quitter la saisie</a>';
    applyScoreFilter();
  }
  // Filtre la liste de saisie selon la recherche (sans re-rendu, focus conservé).
  function applyScoreFilter() {
    var list = document.getElementById('score-list');
    if (!list) return;
    var raw = (ui.scoreSearch || '').trim();
    var nraw = norm(raw);
    var poolOnly = nraw.match(/^poule\s+([a-z])$/);
    var tokens = nraw.split(/\s+/).filter(Boolean);
    var rows = list.querySelectorAll('.pool-match-row');
    var shown = 0;
    Array.prototype.forEach.call(rows, function (el) {
      var hay = el.getAttribute('data-search');
      var ok;
      if (!tokens.length) ok = true;
      else if (poolOnly) ok = hay.indexOf('poule ' + poolOnly[1]) >= 0;
      else ok = tokens.every(function (tk) { return hay.indexOf(tk) >= 0; });
      el.classList.toggle('hidden', !ok);
      if (ok) shown++;
    });
    var none = document.getElementById('score-none');
    if (none) {
      none.classList.toggle('hidden', !(tokens.length && shown === 0));
      var nq = document.getElementById('score-none-q'); if (nq) nq.textContent = raw;
    }
    var cnt = document.getElementById('score-count');
    if (cnt) cnt.textContent = tokens.length
      ? (shown + ' rencontre(s) trouvée(s) sur ' + rows.length)
      : (rows.length + ' rencontre(s) à saisir');
  }
  function scoreUnlock() {
    var el = document.getElementById('sc-pin'); if (!el) return;
    sha256(el.value).then(function (hash) {
      var c = store.config;
      if (c && (hash === c.coadminHash || hash === c.adminHash)) {
        sessionStorage.setItem('bt:coadmin:' + state.tid, '1'); render();
      } else toast('Code incorrect.');
    });
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
    var row1 = ['reglages', 'equipes', 'acces'];
    var row2 = fmt() === 'poolsonly' ? ['poules'] : fmt() === 'ko' ? ['tableau'] : ['poules', 'tableau'];
    var labels = { equipes: 'Équipes', poules: 'Poules', tableau: 'Tableau', acces: 'Accès', reglages: 'Réglages' };
    if (row1.concat(row2).indexOf(ui.adminTab) < 0) ui.adminTab = 'equipes';
    function navRow(list) {
      return '<div class="pool-tabs">' + list.map(function (tb) {
        return '<span class="pill ' + (ui.adminTab === tb ? 'active' : '') + '" data-act="admin-tab" data-tab="' + tb + '">' + labels[tb] + '</span>';
      }).join('') + '</div>';
    }
    var nav = navRow(row1) + '<div style="height:6px"></div>' + navRow(row2);

    var nbRoster = rosterList().length;
    var meta = (fmt() === 'ko' ? formatLabel('ko') : (c.numPools + ' poule(s)')) +
      ' · ' + nbRoster + ' équipe(s)' + (teamCount() ? ' réparties' : '');
    var head = '<div class="card"><h2>' + esc(c.name) + '</h2><p class="sub">' + formatLabel(fmt()) + ' · ' + meta + '</p>' + nav + '</div>';

    var body;
    if (ui.adminTab === 'equipes') body = adminEquipes(c, assigned);
    else if (ui.adminTab === 'poules') body = adminPoules(c);
    else if (ui.adminTab === 'tableau') body = adminTableau(c);
    else if (ui.adminTab === 'acces') body = adminAcces(c);
    else body = adminReglages(c);

    screen.innerHTML = backList() + head + body;
    if (ui.adminTab === 'acces') { drawQRs(); applyAccesFilter(); }
    if (ui.adminTab === 'poules') applyPoolFilter();
    var input = document.getElementById('new-team');
    if (input) input.focus();
  }

  function adminEquipes(c, assigned) {
    var isKo = fmt() === 'ko';
    var roster = rosterList();
    var started = hasStarted();
    var drawn = assigned > 0;
    var changed = drawn && roster.length !== assigned; // liste modifiée depuis le tirage

    /* Carte 1 — liste des équipes saisies */
    var list = roster.length
      ? '<div class="grid-teams">' + roster.map(rosterCell).join('') + '</div>'
      : '<p class="sub">Aucune équipe saisie pour l\'instant.</p>';
    var card1 = '<div class="card"><h2>Équipes (' + roster.length + ')</h2>';
    if (started) {
      card1 += '<div class="notice info">Le tournoi a démarré : la liste est figée.</div>';
    } else {
      card1 += '<label>Nom de l\'équipe</label>' +
        '<div class="field-2"><div style="flex:2"><input id="new-team" placeholder="Ex. Les Atouts" autocomplete="off" value="' + esc(ui.draftTeam) + '"></div>' +
        '<button class="btn primary" data-act="add-roster" style="flex:1">+ Ajouter</button></div>' +
        '<p class="sub">Saisissez toutes vos équipes, puis lancez le tirage : elles seront réparties au hasard dans les ' +
        c.numPools + ' poule(s).</p>';
    }
    card1 += list + '</div>';

    /* Carte 2 — tirage et placements */
    var card2 = '<div class="card"><h2>' + (isKo ? 'Tirage du tableau' : 'Tirage des poules') + '</h2>';
    if (!drawn) {
      card2 += '<p class="sub">' + (roster.length ? 'Prêt à répartir ' + roster.length + ' équipe(s) dans ' + c.numPools + ' poule(s).' : 'Ajoutez d\'abord des équipes.') + '</p>' +
        '<button class="btn primary block" data-act="draw-teams"' + (roster.length ? '' : ' disabled') +
        '>🎲 Tirer au sort la répartition</button>';
    } else {
      if (changed && !started)
        card2 += '<div class="notice">La liste a changé depuis le dernier tirage. Relancez-le pour répartir à nouveau.</div>';
      card2 += placementGrid(c, isKo);
      if (!started) {
        card2 += '<div class="btn-row" style="margin-top:12px">' +
          '<button class="btn" data-act="draw-teams">🔁 Relancer</button>' +
          '<button class="btn danger" data-act="clear-draw">🧹 Effacer le tirage</button></div>' +
          '<p class="sub">Vous pouvez relancer ou effacer le tirage tant que le tournoi n\'a pas démarré. ' +
          (isKo ? 'Passez à l\'onglet <b>Tableau</b> quand c\'est bon.' : 'Passez à l\'onglet <b>Poules</b> quand c\'est bon.') + '</p>';
      }
    }
    card2 += '</div>';
    return card1 + card2;
  }
  // Un élément de la liste des équipes saisies (renommable / supprimable).
  function rosterCell(r) {
    var started = hasStarted();
    return '<div class="match" style="padding:8px;margin:0"><div class="match-meta">' +
      '<b style="overflow-wrap:anywhere">' + esc(r.name) + '</b>' +
      (started ? '' : '<span class="btn-row" style="gap:6px">' +
        '<button class="pill" data-act="rename-roster" data-rid="' + esc(r.id) + '">✎</button>' +
        '<button class="pill" data-act="remove-roster" data-rid="' + esc(r.id) + '">🗑</button></span>') +
      '</div></div>';
  }
  // Affichage (lecture seule) des placements après tirage.
  function placementGrid(c, isKo) {
    if (isKo) {
      return '<div class="grid-teams">' +
        store.teams.slice().sort(function (a, b) { return a.pos - b.pos; }).map(placeCell).join('') + '</div>';
    }
    var g = '';
    for (var p = 0; p < c.numPools; p++) {
      var P = L.poolLabel(p);
      var members = store.teams.filter(function (t) { return t.pool === P; }).sort(function (a, b) { return a.slot - b.slot; });
      g += '<h3>Poule ' + P + ' (' + members.length + ')</h3><div class="grid-teams">' + members.map(placeCell).join('') + '</div>';
    }
    return g;
  }
  function placeCell(t) {
    var label = t.pool != null ? (t.pool + t.slot) : ('Place ' + (t.pos + 1));
    return '<div class="match" style="padding:8px;margin:0"><div class="match-meta"><span class="rk">' + label + '</span></div><b>' +
      (t.assigned ? esc(t.name) : '<span class="sub">libre</span>') + '</b></div>';
  }

  function adminPoules(c) {
    var standings = L.allStandings(c.numPools, store.teams, store.matches, rules());
    var pools = poolList(c);
    if (pools.indexOf(ui.poolTab) < 0) ui.poolTab = pools[0];
    var tabs = '<div class="pool-tabs">' + pools.map(function (P) {
      return '<span class="pill ' + (P === ui.poolTab ? 'active' : '') + '" data-act="pool-tab" data-pool="' + P + '">' + P + '</span>';
    }).join('') + '</div>';
    var P = ui.poolTab;
    var html = '<div class="card"><h2>Poule ' + P + '</h2>' + tabs + standingsTable(standings[P], qualSet()) + '</div>';

    // Toutes les rencontres de toutes les poules, chacune présente une seule
    // fois dans le DOM (identifiants de saisie uniques). Par défaut on n'affiche
    // que la poule sélectionnée ci-dessus ; la recherche permet de saisir dans
    // n'importe quel ordre, sur l'ensemble des poules.
    var plist = L.poolMatchList(c.numPools, store.teams, store.matches, rules());
    var byPool = {};
    plist.forEach(function (e) { (byPool[e.pool] = byPool[e.pool] || []).push(e); });
    var cards = pools.map(function (PP) {
      return (byPool[PP] || []).map(function (e) {
        var m = Object.assign({}, matchById(e.id) || {}, { id: e.id, teamA: e.teamA, teamB: e.teamB,
          target: e.target, phase: 'pool', pool: e.pool, slotA: e.slotA, slotB: e.slotB });
        var ta = teamById(e.teamA), tb = teamById(e.teamB);
        var hay = norm([(ta && ta.name) || '', (tb && tb.name) || '',
          teamTag(e.teamA), teamTag(e.teamB), 'poule ' + e.pool].join(' '));
        return '<div class="pool-match-row" data-search="' + esc(hay) + '" data-pool="' + esc(norm(e.pool)) + '">' +
          matchCard(m, poolEntryTitle(e)) + '</div>';
      }).join('');
    }).join('');

    var search = '<div style="position:relative;margin-top:4px">' +
      '<input id="pool-search" placeholder="🔎 Rechercher une rencontre (équipe, A1, poule B…)" autocomplete="off" value="' + esc(ui.poolSearch || '') + '">' +
      '<span id="pool-search-count" class="sub" style="display:block;margin-top:6px"></span></div>';

    html += '<div class="card"><h2>Rencontres des poules</h2>' +
      '<p class="sub">Saisissez le score de chaque rencontre (en ' + L.targetFor(rules(), 'pool') + ' points). ' +
      'Par défaut : la poule sélectionnée ci-dessus. Si les matchs ne se jouent pas dans l\'ordre, ' +
      'cherchez une équipe pour saisir directement, toutes poules confondues.</p>' +
      search +
      '<div id="pool-match-list">' + cards + '</div>' +
      '<p id="pool-search-none" class="sub center hidden">Aucune rencontre ne correspond à « <span id="pool-search-none-q"></span> ».</p>' +
      '</div>';
    return html;
  }
  // Filtre les rencontres de poule selon la recherche (sans re-rendu, focus
  // conservé). Recherche vide → seule la poule sélectionnée est affichée.
  function applyPoolFilter() {
    var list = document.getElementById('pool-match-list');
    if (!list) return;
    var raw = (ui.poolSearch || '').trim();
    var nraw = norm(raw);
    var poolOnly = nraw.match(/^poule\s+([a-z])$/);
    var tokens = nraw.split(/\s+/).filter(Boolean);
    var activePool = norm(ui.poolTab || '');
    var rows = list.querySelectorAll('.pool-match-row');
    var shown = 0;
    Array.prototype.forEach.call(rows, function (el) {
      var ok;
      if (!tokens.length) {
        ok = el.getAttribute('data-pool') === activePool;
      } else if (poolOnly) {
        ok = el.getAttribute('data-pool') === poolOnly[1];
      } else {
        var hay = el.getAttribute('data-search');
        ok = tokens.every(function (tk) { return hay.indexOf(tk) >= 0; });
      }
      el.classList.toggle('hidden', !ok);
      if (ok) shown++;
    });
    var none = document.getElementById('pool-search-none');
    if (none) {
      none.classList.toggle('hidden', !(tokens.length && shown === 0));
      var nq = document.getElementById('pool-search-none-q'); if (nq) nq.textContent = raw;
    }
    var cnt = document.getElementById('pool-search-count');
    if (cnt) cnt.textContent = tokens.length
      ? (shown + ' rencontre(s) trouvée(s) sur ' + rows.length)
      : (shown + ' rencontre(s) · poule ' + (ui.poolTab || '') + ' (recherchez pour saisir dans une autre poule)');
  }

  function adminTableau(c) {
    if (fmt() === 'ko') {
      var assigned = store.teams.filter(function (t) { return t.assigned; }).length;
      var br = currentBracket();
      var html = '<div class="card bracket-card"><h2>Tableau</h2>' +
        (assigned < store.teams.length ? '<div class="notice">Le tableau se complète au fur et à mesure (' + assigned + '/' + store.teams.length + ' équipes).</div>' : '') +
        bracketView(br) + '</div>';
      return html + koScoreCard(br);
    }
    // Format « poules + tableau »
    var standings = L.allStandings(c.numPools, store.teams, store.matches, rules());
    var prog = poolProg();
    if (!c.bracket) {
      var total = teamCount();
      var sizes = L.validBracketSizes(total);
      if (!sizes.length) {
        return '<div class="card"><h2>Lancer la phase finale</h2>' +
          '<p class="sub">Répartissez d\'abord les équipes (onglet Équipes) : il en faut au moins 2.</p></div>';
      }
      var choice = chosenBracketSize(total);
      var opts = sizes.map(function (s) {
        return '<option value="' + s + '"' + (s === choice ? ' selected' : '') + '>' + roundNameForSize(s) + ' — ' + s + ' équipes</option>';
      }).join('');
      var qf = L.qualifyFor(c.numPools, standings, choice);
      return '<div class="card"><h2>Lancer la phase finale</h2>' +
        '<p class="sub">Poules jouées : ' + prog.done + '/' + prog.total + '.' +
        (prog.complete ? ' ✅ Toutes les rencontres sont saisies.' : ' ⚠️ Toutes les rencontres ne sont pas terminées.') + '</p>' +
        '<label>Tour de départ du tableau <span class="sub">(défini aussi dans les Réglages)</span></label>' +
        '<select id="bracket-size">' + opts + '</select>' +
        '<p class="sub">Qualifiés : <b>' + describeQual(qf.rankCounts) + '</b>. Aucun affrontement de même poule au 1er tour ; les 1ers tombent sur une équipe moins bien classée.</p>' +
        '<div class="notice">Vous pourrez annuler le tableau tant qu\'aucun score de phase finale n\'est saisi.</div>' +
        '<button class="btn primary block" data-act="start-bracket">Clôturer les poules &amp; générer le tableau</button></div>';
    }
    var undo = !hasStarted()
      ? '<div class="card"><p class="sub">Tableau généré. Tant qu\'aucun score de phase finale n\'est saisi, vous pouvez l\'annuler pour revenir aux poules (modifier les réglages, re-tirer, etc.).</p>' +
        '<button class="btn danger block" data-act="clear-bracket">↩️ Annuler le tableau</button></div>'
      : '';
    return '<div class="card bracket-card"><h2>Tableau final</h2>' + bracketView(c.bracket) + '</div>' + undo + koScoreCard(c.bracket);
  }
  function koScoreCard(br) {
    var resolved = L.resolveBracket(br, store.teams, koResults(), rules());
    var html = '<div class="card"><h2>Saisie des scores — phase finale</h2>';
    var list = L.bracketMatchList(resolved);
    var any = false;
    list.forEach(function (e) {
      if (!e.teamA || !e.teamB) return;
      any = true;
      var m = Object.assign({}, matchById(e.id) || {}, { id: e.id, teamA: e.teamA, teamB: e.teamB, target: e.target, phase: 'ko', roundKey: e.key });
      html += matchCard(m, koTitle(e) + ' · ' + e.target + ' pts');
    });
    if (!any) html += '<p class="sub">Aucun match jouable pour l\'instant.</p>';
    return html + '</div>';
  }

  function adminAcces(c) {
    var teams = store.teams.filter(function (t) { return t.assigned; }).slice();
    var sort = ui.accesSort || 'poule';
    if (sort === 'saisie') {
      teams.sort(function (a, b) { return (b.assignedAt || 0) - (a.assignedAt || 0); });
    } else {
      teams.sort(function (a, b) {
        var ka = a.pool != null ? (a.pool + a.slot) : ('Z' + ('00' + a.pos).slice(-3));
        var kb = b.pool != null ? (b.pool + b.slot) : ('Z' + ('00' + b.pos).slice(-3));
        return ka < kb ? -1 : (ka > kb ? 1 : 0);
      });
    }
    if (!teams.length) return '<div class="card"><p class="sub">Saisissez d\'abord les équipes (onglet Équipes).</p></div>';
    var toggle = '<div class="pool-tabs">' +
      '<span class="pill ' + (sort === 'poule' ? 'active' : '') + '" data-act="acces-sort" data-s="poule">Par poule</span>' +
      '<span class="pill ' + (sort === 'saisie' ? 'active' : '') + '" data-act="acces-sort" data-s="saisie">Dernière saisie en 1er</span></div>';
    var search = '<div style="position:relative;margin-bottom:12px">' +
      '<input id="acces-q" placeholder="🔎 Rechercher une équipe (nom, poule, A1…)" autocomplete="off" value="' + esc(ui.accesQ || '') + '">' +
      '<span id="acces-count" class="sub" style="display:block;margin-top:6px"></span></div>';
    var cards = teams.map(function (t) {
      var link = teamLink(state.tid, t.id);
      var tag = t.pool != null ? (t.pool + t.slot) : ('Place ' + (t.pos + 1));
      var hay = norm((t.name || '') + ' ' + tag);
      var poolKey = t.pool != null ? norm(t.pool) : '';
      return '<div class="card acces-card" data-search="' + esc(hay) + '" data-pool="' + esc(poolKey) + '" style="text-align:center"><span class="tag">' + tag + '</span>' +
        '<h3 style="margin:8px 0">' + teamName(t) + '</h3>' +
        '<div class="qr-box" data-qr="' + esc(link) + '"></div>' +
        '<button class="btn small block" data-act="copy-link" data-link="' + esc(link) + '" style="margin-top:8px">Copier le lien</button></div>';
    }).join('');
    return '<div class="card"><h2>Accès équipes (QR)</h2>' +
      '<p class="sub">Chaque équipe scanne son QR (ou reçoit son lien) : elle saisit ses scores depuis son téléphone, l\'adversaire valide, et tout remonte ici automatiquement.</p>' +
      (CFG.firebaseReady ? '' : '<div class="notice">⚠️ Mode local : la saisie multi-téléphone ne fonctionnera qu\'une fois Firebase configuré (voir README).</div>') +
      toggle + search + '</div>' +
      '<div id="acces-list">' + cards + '</div>' +
      '<p id="acces-none" class="sub center hidden">Aucune équipe ne correspond à « <span id="acces-none-q"></span> ».</p>';
  }
  // Filtre les cartes d'accès selon la recherche (sans re-rendu, QR conservés).
  function applyAccesFilter() {
    var raw = (ui.accesQ || '').trim();
    var nraw = norm(raw);
    // Intention « poule X » : on filtre sur la poule, pas sur le texte.
    var poolOnly = nraw.match(/^poule\s+([a-z])$/);
    var tokens = nraw.split(/\s+/).filter(Boolean);
    var cards = document.querySelectorAll('#acces-list [data-search]');
    var shown = 0;
    Array.prototype.forEach.call(cards, function (el) {
      var ok;
      if (poolOnly) {
        ok = el.getAttribute('data-pool') === poolOnly[1];
      } else {
        var hay = el.getAttribute('data-search');
        ok = tokens.every(function (tk) { return hay.indexOf(tk) >= 0; });
      }
      el.classList.toggle('hidden', !ok);
      if (ok) shown++;
    });
    var none = document.getElementById('acces-none');
    if (none) {
      none.classList.toggle('hidden', !(tokens.length && shown === 0));
      var nq = document.getElementById('acces-none-q'); if (nq) nq.textContent = raw;
    }
    var cnt = document.getElementById('acces-count');
    if (cnt) cnt.textContent = tokens.length
      ? (shown + ' équipe(s) sur ' + cards.length)
      : (cards.length + ' équipe(s)');
  }
  function drawQRs() {
    if (typeof qrcode === 'undefined') return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-qr]'), function (box) {
      try {
        var qr = qrcode(0, 'M'); qr.addData(box.getAttribute('data-qr')); qr.make();
        box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      } catch (e) { box.textContent = 'QR indisponible'; }
    });
  }

  // Libellé d'une phase pour l'éditeur de règles.
  function phaseLabel(key) {
    if (key === 'pool') return 'Poules';
    if (key === 'final') return 'Finale';
    if (key === 'p3') return 'Petite finale';
    return L.roundLabel(key);
  }
  function ruleRow(key, locked) {
    var r = L.ruleFor(rules(), key);
    var fmtOpts = Object.keys(L.FORMATS).map(function (fk) {
      return '<option value="' + fk + '"' + (r.format === fk ? ' selected' : '') + '>' + esc(L.FORMATS[fk].label) + '</option>';
    }).join('');
    var dis = locked ? ' disabled' : '';
    return '<div class="rule-row">' +
      '<div class="rule-name">' + phaseLabel(key) + (locked ? ' <span class="sub">· démarré</span>' : '') + '</div>' +
      '<div class="rule-fields">' +
      '<input class="rule-pts" type="number" min="100" step="10" id="rz-pts-' + key + '" value="' + r.target + '"' + dis + ' aria-label="Points ' + esc(phaseLabel(key)) + '">' +
      '<select class="rule-fmt" id="rz-fmt-' + key + '"' + dis + ' aria-label="Format ' + esc(phaseLabel(key)) + '">' + fmtOpts + '</select>' +
      '</div></div>';
  }
  // Éditeur « points & format » par phase (poule + chaque tour du tableau).
  function rulesEditor(c) {
    var keys = [];
    if (fmt() === 'pools' || fmt() === 'poolsonly') keys.push('pool');
    if (fmt() === 'pools') {
      // Affiche directement les tours du tableau, même avant le tirage : taille
      // réelle selon les équipes placées, sinon le réglage (défaut 1/4 = 8).
      var size = chosenBracketSize(teamCount()) || c.bracketSize || 8;
      if (size >= 2) keys = keys.concat(L.roundKeysForSize(size));
    } else if (fmt() === 'ko') {
      keys = keys.concat(L.roundKeysForSize(c.numTeams || teamCount()));
    }
    if (!keys.length) return '';
    var rowsHtml = keys.map(function (k) {
      return ruleRow(k, (k === 'pool') ? poolStarted() : roundStarted(k));
    }).join('');
    return '<div style="height:20px"></div><h3>Points &amp; format des rencontres</h3>' +
      '<p class="sub">Réglez les <b>points par match</b> et le <b>nombre de manches</b>, phase par phase. ' +
      'Modifiable tant que la phase n\'a pas démarré (dès qu\'un score y est saisi, elle se verrouille).</p>' +
      '<div class="rule-row rule-head"><div class="rule-name">Phase</div><div class="rule-fields"><span>Points</span><span>Format</span></div></div>' +
      rowsHtml;
  }

  function adminReglages(c) {
    var phases = fmt() === 'ko'
      ? '<button class="btn small" data-act="set-phase" data-phase="ko">En cours</button><button class="btn small" data-act="set-phase" data-phase="done">Terminé</button>'
      : '<button class="btn small" data-act="set-phase" data-phase="pools">Poules</button>' +
        (fmt() === 'pools' ? '<button class="btn small" data-act="set-phase" data-phase="bracket">Phase finale</button>' : '') +
        '<button class="btn small" data-act="set-phase" data-phase="done">Terminé</button>';
    var resize = '';
    if (fmt() !== 'ko' && !hasStarted()) {
      resize = '<div style="height:20px"></div><h3>Nombre de poules</h3>' +
        '<p class="sub">Modifiable tant qu\'aucun score n\'est saisi. Les équipes seront re-réparties (relancez le tirage).</p>' +
        '<label>Nombre de poules</label><input id="rz-pools" type="number" min="1" max="26" value="' + c.numPools + '">' +
        '<div class="notice">Appliquer efface le tirage et un éventuel tableau : à re-tirer ensuite.</div>' +
        '<button class="btn small block" data-act="resize" style="margin-top:8px">Appliquer</button>';
    } else if (fmt() === 'pools' && hasStarted()) {
      resize = '<div style="height:20px"></div><h3>Nombre de poules</h3>' +
        '<p class="sub">Des scores sont déjà saisis : le nombre de poules ne peut plus être modifié.</p>';
    }
    // Tour de départ du tableau (format poules + tableau), tant que le tableau
    // n'est pas généré et qu'aucun score n'est saisi.
    if (fmt() === 'pools' && !c.bracket && !hasStarted()) {
      var pref = c.bracketSize || 0;
      var rounds = [32, 16, 8, 4, 2];
      var opts = '<option value="0"' + (pref ? '' : ' selected') + '>Auto (le plus grand possible)</option>' +
        rounds.map(function (s) {
          return '<option value="' + s + '"' + (pref === s ? ' selected' : '') + '>' + roundNameForSize(s) + ' (' + s + ' équipes)</option>';
        }).join('');
      resize += '<div style="height:20px"></div><h3>Tour de départ du tableau</h3>' +
        '<p class="sub">Phase à la sortie des poules. « Auto » prend le plus grand tableau que permet le nombre d\'équipes. ' +
        'Un tableau plus petit qualifie moins d\'équipes (les mieux classées).</p>' +
        '<select id="rz-bracket">' + opts + '</select>';
    }
    return '<div class="card"><h2>Réglages</h2>' +
      '<p class="sub">« ' + esc(c.name) + ' » — ' + formatLabel(fmt()) + '.</p>' +
      '<label>Phase</label><div class="btn-row">' + phases + '</div>' +
      resize +
      rulesEditor(c) +
      '<div style="height:20px"></div><h3>Accès saisie (co-admin)</h3>' +
      '<p class="sub">Donnez ce lien et ce code à une personne de confiance : elle pourra <b>uniquement saisir les scores</b> des matchs (aucun autre réglage, aucune suppression). ' +
      (c.coadminHash ? 'Un code de saisie est actuellement défini.' : 'Aucun code de saisie n\'est défini pour l\'instant.') + '</p>' +
      '<label>Code de saisie</label>' +
      '<input id="rz-coadmin" type="text" autocomplete="off" placeholder="' +
      (c.coadminHash ? 'Nouveau code (laisser vide = inchangé)' : 'Choisir un code (min. 3 caractères)') + '">' +
      '<button class="btn small block" data-act="set-coadmin" style="margin-top:8px">' +
      (c.coadminHash ? 'Modifier le code de saisie' : 'Activer l\'accès saisie') + '</button>' +
      (c.coadminHash
        ? '<div style="margin-top:12px"><label>Lien de saisie</label>' +
          '<input readonly value="' + esc(coadminLink(state.tid)) + '" onclick="this.select()">' +
          '<button class="btn small block" data-act="copy-link" data-link="' + esc(coadminLink(state.tid)) + '" style="margin-top:6px">Copier le lien de saisie</button></div>'
        : '') +
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
  screen.addEventListener('input', function (ev) {
    if (ev.target.id === 'new-team') ui.draftTeam = ev.target.value;
    if (ev.target.id === 'acces-q') { ui.accesQ = ev.target.value; applyAccesFilter(); }
    if (ev.target.id === 'pool-search') { ui.poolSearch = ev.target.value; applyPoolFilter(); }
    if (ev.target.id === 'score-search') { ui.scoreSearch = ev.target.value; applyScoreFilter(); }
  });
  screen.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.id === 'new-team') { ev.preventDefault(); handleAction('add-roster'); }
  });
  screen.addEventListener('change', function (ev) {
    // Les deux sélecteurs (Réglages / clôture) écrivent le même réglage persistant.
    if (ev.target.id === 'bracket-size' || ev.target.id === 'rz-bracket') {
      DB.updateConfig(state.tid, { bracketSize: parseInt(ev.target.value, 10) || 0 })
        .then(function () { if (ev.target.id === 'rz-bracket') { toast('Tour de départ enregistré.'); render(); } });
    }
    if (/^rz-(pts|fmt)-/.test(ev.target.id)) onRuleChange(ev.target);
  });
  // Enregistre un réglage points/format d'une phase, en préservant les autres.
  function onRuleChange(el) {
    var m = el.id.match(/^rz-(pts|fmt)-(.+)$/);
    if (!m) return;
    var field = m[1] === 'pts' ? 'target' : 'format', key = m[2];
    var val = field === 'target' ? Math.max(100, parseInt(el.value, 10) || L.POOL_TARGET) : el.value;
    var cur = (store.config && store.config.rules) || {};
    var next = {};
    Object.keys(cur).forEach(function (k) { next[k] = Object.assign({}, cur[k]); });
    next[key] = Object.assign({}, next[key]); next[key][field] = val;
    runBusy('Enregistrement…', DB.updateConfig(state.tid, { rules: next }), 'Réglage enregistré')
      .then(function () { render(); }, function (e) { toast('Erreur : ' + ((e && e.message) || '')); });
  }
  screen.addEventListener('focusout', function () {
    setTimeout(function () {
      if (!pendingRender) return;
      // Ne pas re-rendre tant qu'une saisie est en cours (ex. passage d'un
      // champ de score à l'autre) : sinon on effacerait le score en cours.
      var ae = document.activeElement;
      if (ae && screen.contains(ae) && ae.tagName === 'INPUT') return;
      render();
    }, 50);
  });

  function readScores(mid) {
    return { sa: parseInt((document.getElementById('sa-' + mid) || {}).value, 10),
             sb: parseInt((document.getElementById('sb-' + mid) || {}).value, 10) };
  }
  function matchBase(mid) {
    var c = store.config;
    if (c && c.numPools) {
      var pe = L.poolMatchList(c.numPools, store.teams, store.matches, rules()).filter(function (x) { return x.id === mid; })[0];
      if (pe) return { phase: 'pool', pool: pe.pool, slotA: pe.slotA, slotB: pe.slotB, teamA: pe.teamA, teamB: pe.teamB, target: pe.target };
    }
    var resolved = L.resolveBracket(currentBracket(), store.teams, koResults(), rules());
    var e = L.bracketMatchList(resolved).filter(function (x) { return x.id === mid; })[0];
    return e ? { phase: 'ko', teamA: e.teamA, teamB: e.teamB, target: e.target, roundKey: e.key } : { phase: 'ko' };
  }

  function handleAction(act, a, mid) {
    var tid = state.tid;
    if (act === 'new-tour') { ui.newFormat = 'pools'; ui.newName = ''; ui.newPin = ''; ui.lastDraw = null; go('#/new'); return; }
    if (act === 'open-tour') { ui.adminTab = 'equipes'; ui.poolTab = 'A'; openTournament(a.getAttribute('data-id')); go('#/classement'); return; }
    if (act === 'admin-tour') { ui.adminTab = 'equipes'; ui.poolTab = 'A'; openTournament(a.getAttribute('data-id')); go('#/admin'); return; }
    if (act === 'del-tour') {
      var id = a.getAttribute('data-id');
      var cfg = (ui.tourList || []).filter(function (x) { return x.id === id; })[0];
      deleteTournament(id, cfg && cfg.adminHash);
      return;
    }
    if (act === 'new-format') { stashCreate(); ui.newFormat = a.getAttribute('data-f'); render(); return; }
    if (act === 'do-create') return doCreate();

    if (act === 'add-roster') {
      var inp = document.getElementById('new-team');
      var name = ((inp && inp.value) || ui.draftTeam || '').trim();
      if (!name) { toast('Saisissez un nom d\'équipe.'); return; }
      ui.draftTeam = '';
      DB.addRosterName(tid, name).then(function () {
        render(true);
        var i = document.getElementById('new-team'); if (i) { i.value = ''; i.focus(); }
        toast('✓ ' + name + ' ajoutée');
      }).catch(function (e) { toast('Erreur : ' + ((e && e.message) || 'ajout impossible')); });
      return;
    }
    if (act === 'rename-roster') {
      var rid = a.getAttribute('data-rid');
      var cur = rosterList().filter(function (r) { return r.id === rid; })[0];
      modalPrompt('Nouveau nom de l\'équipe :', (cur && cur.name) || '').then(function (nn) {
        if (nn != null && nn.trim()) runBusy('Modification…', DB.renameRosterName(tid, rid, nn.trim()), 'Équipe renommée')
          .catch(function (e) { toast('Erreur : ' + ((e && e.message) || '')); });
      });
      return;
    }
    if (act === 'remove-roster') {
      var rid2 = a.getAttribute('data-rid');
      var cur2 = rosterList().filter(function (r) { return r.id === rid2; })[0];
      modalConfirm('Retirer l\'équipe « ' + ((cur2 && cur2.name) || '') + ' » de la liste ?', 'Retirer').then(function (ok) {
        if (ok) runBusy('Suppression…', DB.removeRosterName(tid, rid2), 'Équipe retirée')
          .catch(function (e) { toast('Erreur : ' + ((e && e.message) || '')); });
      });
      return;
    }
    if (act === 'draw-teams') {
      modalConfirm('Tirer au sort le placement de toutes les équipes ? Les placements actuels seront remplacés.', 'Tirer').then(function (ok) {
        if (!ok) return;
        runBusy('Tirage en cours…', DB.drawTeams(tid), 'Tirage effectué !').catch(function (e) {
          var m = (e && e.message) || '';
          toast(/TROP_D_EQUIPES/.test(m) ? 'Trop d\'équipes pour le nombre de places.' : ('Erreur : ' + m));
        });
      });
      return;
    }
    if (act === 'clear-draw') {
      modalConfirm('Effacer le tirage ? Les équipes restent dans la liste mais ne seront plus placées dans les poules.', 'Effacer').then(function (ok) {
        if (!ok) return;
        runBusy('Effacement…', DB.clearDraw(tid), 'Tirage effacé')
          .catch(function (e) { toast('Erreur : ' + ((e && e.message) || '')); });
      });
      return;
    }
    if (act === 'admin-set') {
      var s = readScores(mid);
      if (isNaN(s.sa) || isNaN(s.sb)) { toast('Saisissez les deux scores.'); return; }
      if (s.sa === s.sb) { toast('Un match ne peut pas être nul.'); return; }
      runBusy('Enregistrement…', DB.adminSet(tid, mid, matchBase(mid), s.sa, s.sb), 'Score enregistré')
        .catch(function (e) { toast('Erreur : ' + ((e && e.message) || 'écriture refusée')); });
      return;
    }
    if (act === 'admin-clear') {
      runBusy('Effacement…', DB.adminClear(tid, mid), 'Score effacé')
        .catch(function (e) { toast('Erreur : ' + ((e && e.message) || '')); });
      return;
    }
    if (act === 'team-propose') {
      var ts = readScores(mid);
      if (isNaN(ts.sa) || isNaN(ts.sb)) { toast('Saisissez les deux scores.'); return; }
      if (ts.sa === ts.sb) { toast('Un match ne peut pas être nul.'); return; }
      runBusy('Envoi…', DB.propose(tid, mid, matchBase(mid), ts.sa, ts.sb, boundTeam(tid)), 'Score proposé. En attente de validation adverse.')
        .catch(function (e) { toast('Erreur : ' + ((e && e.message) || 'écriture refusée')); });
      return;
    }
    if (act === 'team-validate') {
      runBusy('Validation…', DB.validate(tid, mid), 'Score validé ✓')
        .catch(function (e) { toast('Erreur : ' + ((e && e.message) || 'écriture refusée')); });
      return;
    }
    if (act === 'exit-team') { try { localStorage.removeItem('bt:teamBind:' + tid); } catch (e) {} go('#/'); return; }
    if (act === 'copy-link') {
      var link = a.getAttribute('data-link');
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { toast('Lien copié.'); }, function () { toast('Copie impossible.'); });
      else toast('Copie non supportée.');
      return;
    }
    if (act === 'pool-tab') { ui.poolTab = a.getAttribute('data-pool'); ui.poolSearch = ''; render(); return; }
    if (act === 'stand-view') { ui.standView = a.getAttribute('data-v'); render(); return; }
    if (act === 'admin-tab') { ui.adminTab = a.getAttribute('data-tab'); ui.lastDraw = null; ui.poolSearch = ''; render(); return; }
    if (act === 'acces-sort') { ui.accesSort = a.getAttribute('data-s'); render(); return; }
    if (act === 'admin-unlock') return adminUnlock();
    if (act === 'start-bracket') return startBracket();
    if (act === 'clear-bracket') {
      modalConfirm('Annuler le tableau et revenir aux poules ? (possible tant qu\'aucun score de phase finale n\'est saisi)', 'Annuler le tableau').then(function (ok) {
        if (!ok) return;
        runBusy('Annulation…', DB.clearBracket(tid), 'Tableau annulé').then(function () { ui.adminTab = 'tableau'; render(); },
          function (e) { toast('Erreur : ' + ((e && e.message) || '')); });
      });
      return;
    }
    if (act === 'set-phase') { DB.setPhase(tid, a.getAttribute('data-phase')).then(function () { toast('Phase mise à jour.'); }); return; }
    if (act === 'resize') {
      var np = Math.max(1, Math.min(26, parseInt(document.getElementById('rz-pools').value, 10) || 1));
      runBusy('Mise à jour…', DB.setNumPools(tid, np), np + ' poule(s) — relancez le tirage').then(function () {
        ui.poolTab = 'A'; ui.adminTab = 'equipes'; render();
      }, function (e) { toast('Erreur : ' + ((e && e.message) || '')); });
      return;
    }
    if (act === 'score-unlock') return scoreUnlock();
    if (act === 'lock-score') { sessionStorage.removeItem('bt:coadmin:' + tid); go('#/classement'); return; }
    if (act === 'set-coadmin') {
      var ci = document.getElementById('rz-coadmin');
      var code = ((ci && ci.value) || '').trim();
      if (!code) { toast(store.config && store.config.coadminHash ? 'Code inchangé.' : 'Choisissez un code d\'au moins 3 caractères.'); return; }
      if (code.length < 3) { toast('Code trop court (min. 3 caractères).'); return; }
      sha256(code).then(function (hash) {
        return runBusy('Enregistrement…', DB.updateConfig(tid, { coadminHash: hash }), 'Accès saisie activé');
      }).then(function () { render(); }).catch(function (e) { toast('Erreur : ' + ((e && e.message) || '')); });
      return;
    }
    if (act === 'lock-admin') { sessionStorage.removeItem('bt:admin:' + tid); go('#/classement'); return; }
    if (act === 'reset') {
      deleteTournament(tid, store.config && store.config.adminHash);
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
    else { config.numPools = ui.newPools; config.phase = 'setup'; config.bracketSize = 8; } // défaut : départ en 1/4
    var tid = newTid(name);
    sha256(pin).then(function (hash) {
      config.adminHash = hash;
      return runBusy('Création…', DB.createTournament(tid, config), 'Tournoi créé !');
    }).then(function () {
      openTournament(tid);
      sessionStorage.setItem('bt:admin:' + tid, '1');
      ui.adminTab = 'equipes'; ui.tourList = null;
      go('#/admin');
    }).catch(function (e) { toast('Création impossible : ' + ((e && e.message) || 'erreur')); });
  }
  function adminUnlock() {
    var pin = document.getElementById('a-pin').value;
    sha256(pin).then(function (hash) {
      if (store.config && hash === store.config.adminHash) { sessionStorage.setItem('bt:admin:' + state.tid, '1'); render(); }
      else toast('Code incorrect.');
    });
  }
  function deleteTournament(tid, adminHash) {
    if (!tid) return;
    modalConfirm('Supprimer définitivement ce tournoi ? Toutes les équipes et tous les scores seront perdus.', 'Supprimer').then(function (ok) {
      if (!ok) return;
      var check = adminHash
        ? modalPrompt('Code administrateur pour confirmer la suppression :', '', true).then(function (code) {
            if (code === null) return false; // annulé
            return sha256(code).then(function (hash) {
              if (hash === adminHash) return true;
              toast('Code incorrect — suppression annulée.');
              return false;
            });
          })
        : Promise.resolve(true);
      check.then(function (go2) {
        if (!go2) return;
        runBusy('Suppression…', DB.resetTournament(tid), 'Tournoi supprimé').then(function () {
          sessionStorage.removeItem('bt:admin:' + tid);
          if (state.tid === tid) openTournament(null);
          ui.tourList = null;
          go('#/');
        }, function (e) {
          toast('Suppression impossible : ' + ((e && e.message) || 'erreur'));
        });
      });
    });
  }
  function startBracket() {
    var c = store.config, tid = state.tid;
    var total = teamCount();
    var size = chosenBracketSize(total);
    if (!size) { toast('Pas assez d\'équipes réparties pour un tableau.'); return; }
    var standings = L.allStandings(c.numPools, store.teams, store.matches, rules());
    var prog = poolProg();
    var ask = prog.complete ? Promise.resolve(true)
      : modalConfirm('Toutes les rencontres de poule ne sont pas terminées. Générer le tableau quand même ?', 'Générer');
    ask.then(function (ok) {
      if (!ok) return;
      var bracket = L.seedBracket(c.numPools, standings, size);
      runBusy('Génération du tableau…', DB.startBracket(tid, bracket), 'Tableau généré !')
        .then(function () { ui.adminTab = 'tableau'; render(); },
          function (e) { toast('Erreur : ' + ((e && e.message) || '')); });
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
    var params = new URLSearchParams(location.search);
    var urlT = params.get('t'), urlEq = params.get('eq');
    if (urlT && urlEq) {
      bindTeam(urlT, urlEq); openTournament(urlT); location.hash = '#/equipe';
    } else if (urlT) {
      openTournament(urlT);
      if (!location.hash || location.hash === '#/') location.hash = '#/classement';
    } else {
      // Appareil « équipe » : rouvrir directement l'écran de son équipe.
      var lastTid = localStorage.getItem('bt:lastTid');
      if ((!location.hash || location.hash === '#/') && lastTid && boundTeam(lastTid)) {
        openTournament(lastTid); location.hash = '#/equipe';
      }
    }
    if (!location.hash) location.hash = '#/';
    render();
  }).catch(function (e) {
    screen.innerHTML = '<div class="notice">⚠️ Connexion à la base impossible : ' + esc(e && e.message) +
      '.<br><br>Dans la console Firebase, vérifiez que <b>Authentication → Sign-in method → Anonyme</b> est <b>activé</b>, ' +
      'et que <b>Firestore Database</b> est bien créée (avec les règles publiées).</div>';
  });
})();
