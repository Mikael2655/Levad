/* app.js — Interface du tournoi de belote (administrateur unique).
 *
 * L'organisateur saisit les noms d'équipes (tirage au sort automatique de la
 * poule et du numéro), puis tous les scores. Une vue « Classement » publique
 * affiche les poules et le tableau final.
 */
(function () {
  'use strict';

  var L = window.BeloteLogic;
  var CFG = window.APP_CONFIG;
  var tid = new URLSearchParams(location.search).get('t') || CFG.defaultTournamentId;

  var store = { config: null, teams: [], matches: [], loaded: 0 };
  var me = { uid: null, mode: null };
  var ui = { poolTab: 'A', adminTab: 'equipes', lastDraw: null, draftTeam: '' };
  var screen = document.getElementById('screen');
  var pendingRender = false;

  /* ---- Utilitaires ------------------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function teamById(id) {
    for (var i = 0; i < store.teams.length; i++) if (store.teams[i].id === id) return store.teams[i];
    return null;
  }
  function teamName(t) {
    if (!t) return '—';
    return t.name ? esc(t.name) : '<span class="muted">Équipe ' + t.slot + ' (vide)</span>';
  }
  function teamTag(id) { var t = teamById(id); return t ? (t.pool + t.slot) : '?'; }
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
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }
  function toast(msg) {
    var f = document.getElementById('foot-info');
    f.textContent = msg;
    setTimeout(function () { f.textContent = footNote(); }, 2600);
  }
  function footNote() {
    var m = me.mode === 'local' ? 'Données locales (cet appareil)' : 'Synchro temps réel';
    return (store.config ? esc(store.config.name) + ' · ' : '') + m;
  }

  /* ---- Fenêtres modales (remplacent prompt/confirm natifs, bloqués en
   *      iframe sandboxée et peu ergonomiques sur mobile). --------------- */
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
        if (e.key === 'Enter') { e.preventDefault(); done(true); }
        else if (e.key === 'Escape') done(false);
      });
    });
  }

  /* ---- Navigation -------------------------------------------------- */
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  window.addEventListener('hashchange', render);

  function subscribe() {
    DB.watchTournament(tid, function (c) { store.config = c; store.loaded |= 1; render(); });
    DB.watchTeams(tid, function (t) { store.teams = t; store.loaded |= 2; render(); });
    DB.watchMatches(tid, function (m) { store.matches = m; store.loaded |= 4; render(); });
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
    if (me.mode === 'local' && !CFG.firebaseReady) {
      chip.hidden = false; chip.textContent = 'LOCAL'; chip.classList.add('warn');
    } else { chip.hidden = true; }

    var route = (location.hash || '#/').split('?')[0];
    if (route === '#/classement') return renderStandings();
    if (route === '#/admin') return renderAdmin();
    renderHome();
  }

  /* ---- Accueil ----------------------------------------------------- */
  function renderHome() {
    var c = store.config;
    var head = c
      ? '<div class="card center"><h2>' + esc(c.name) + '</h2>' +
        '<p class="sub">' + c.numPools + ' poules · ' + phaseLabel(c.phase) + '</p></div>'
      : '<div class="notice">Aucun tournoi n\'a encore été créé. Ouvrez <b>Administration</b> pour commencer.</div>';
    screen.innerHTML = head +
      '<div class="menu-grid">' +
        tile('#/classement', '📊', 'Classement &amp; tableau', 'Suivre les poules et le tableau final') +
        tile('#/admin', '🔧', 'Administration', 'Saisir les équipes et les scores') +
      '</div>';
  }
  function tile(hash, emoji, title, sub) {
    return '<a class="menu-tile" data-nav="' + hash + '"><span class="emoji">' + emoji + '</span>' +
      '<span><b>' + title + '</b><span>' + sub + '</span></span></a>';
  }
  function phaseLabel(p) {
    return { setup: 'Saisie des équipes', pools: 'Phase de poules', bracket: 'Phase finale', done: 'Terminé' }[p] || 'Saisie des équipes';
  }
  function back() { return '<a class="back" data-nav="#/">← Accueil</a>'; }

  /* ---- Classement & tableau (public) ------------------------------- */
  function renderStandings() {
    var c = store.config;
    if (!c) { screen.innerHTML = back() + '<div class="notice">Aucun tournoi en cours.</div>'; return; }
    var standings = L.allStandings(c.numPools, store.teams, store.matches);
    var pools = poolList(c);
    if (pools.indexOf(ui.poolTab) < 0) ui.poolTab = pools[0];

    var tabs = poolTabs(pools);
    var html = back() + '<div class="card"><h2>Classement des poules</h2>' + tabs +
      standingsTable(standings[ui.poolTab]) +
      '<div class="legend">' +
        '<span><i style="background:var(--green)"></i>1er (qualifié)</span>' +
        '<span><i style="background:var(--gold)"></i>2e (qualifié)</span>' +
        '<span><i style="background:#9aa5a0"></i>3e (repêchable)</span>' +
      '</div>' +
      '<p class="sub" style="margin-top:8px">Départage : points, puis goal-average (différence), puis total de points marqués.</p>' +
      '</div>';

    var q = L.qualifiers(c.numPools, standings);
    if (q.thirdsNeeded > 0 && q.allThirds.length) {
      html += '<div class="card"><h2>Meilleurs 3es</h2>' +
        '<p class="sub">Les ' + q.thirdsNeeded + ' meilleurs 3es complètent le tableau à ' + q.size + '.</p>' +
        thirdsTable(q) + '</div>';
    }

    if (c.phase === 'bracket' && c.bracket) {
      html += '<div class="card"><h2>Tableau final</h2>' + bracketView(c.bracket) + '</div>';
    } else {
      var prog = L.poolProgress(c.numPools, store.matches);
      html += '<div class="card"><h2>Tableau final</h2><p class="sub">Il s\'affichera après la clôture des poules (' +
        prog.done + '/' + prog.total + ' matchs joués).</p></div>';
    }
    screen.innerHTML = html;
  }

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

  /* ---- Tableau final (bracket) ------------------------------------- */
  function bracketView(bracket) {
    var resolved = L.resolveBracket(bracket, store.teams, koResults());
    var cols = resolved.rounds.map(function (rd) {
      var title = rd.key === 'final' ? 'Finale' : L.roundLabel(rd.key);
      var inner = rd.key === 'final' ? finalColumn(resolved)
        : rd.matches.map(function (m) { return bmatch(m.teamA, m.teamB, m.result, m.winner); }).join('');
      return '<div class="bround"><h4>' + title + '</h4>' + inner + '</div>';
    }).join('');
    var extra = '';
    if (resolved.thirdPlace) {
      var tp = resolved.thirdPlace;
      extra += '<h3>Petite finale (3e place) — ' + tp.target + ' pts</h3>' +
        '<div class="bracket"><div class="bround">' + bmatch(tp.teamA, tp.teamB, tp.result, tp.winner) + '</div></div>';
    }
    var champ = resolved.champion
      ? '<div class="champion">🏆 Vainqueur : ' + teamName(teamById(resolved.champion)) + '</div>' : '';
    return '<div class="bracket-scroll"><div class="bracket">' + cols + '</div></div>' + extra + champ;
  }
  function bmatch(a, b, res, winner) {
    var sc = L.scoreOf(res);
    return '<div class="bmatch">' +
      bteamRow(a, sc ? sc.a : null, winner === a && a) +
      bteamRow(b, sc ? sc.b : null, winner === b && b) + '</div>';
  }
  function bteamRow(id, score, isWin) {
    var t = id ? teamById(id) : null;
    var nm = t ? (teamTag(id) + ' ' + (t.name ? esc(t.name) : 'Éq.' + t.slot)) : '<span>à définir</span>';
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
      teamTag(f.teamA) + ' <b>' + f.winsA + '</b> – <b>' + f.winsB + '</b> ' + teamTag(f.teamB) + '</div>';
    return rows;
  }
  function legHasScore(res) { return !!L.scoreOf(res); }

  /* ---- Fiche de saisie d'un match (admin) -------------------------- */
  function matchCard(m, titleOverride) {
    var ta = teamById(m.teamA), tb = teamById(m.teamB);
    var canPlay = m.teamA && m.teamB;
    var prop = m.proposal;
    var status, statusCls;
    if (m.validated) { status = '✓ Enregistré'; statusCls = 'valid'; }
    else { status = 'À jouer'; statusCls = 'pending'; }
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
      (prop ? '<button class="btn danger small" data-act="admin-clear" data-match="' + m.id + '">Effacer</button>' : '') +
      '</div>';
    return '<div class="match">' + head + teams + editor + '</div>';
  }
  function labelName(t, id) { return (t && t.name) ? esc(t.name) : (id ? esc(teamTag(id)) : '?'); }

  /* ---- Administration ---------------------------------------------- */
  function isAdminUnlocked() { return sessionStorage.getItem('bt:admin:' + tid) === '1'; }
  function renderAdmin() {
    var c = store.config;
    if (!c) return renderAdminSetup();
    if (!isAdminUnlocked()) return renderAdminLogin();
    renderAdminDash(c);
  }
  function renderAdminSetup() {
    screen.innerHTML = back() +
      '<div class="card"><h2>Créer le tournoi</h2>' +
      '<p class="sub">Configurez le tournoi. Un code confidentiel protègera l\'administration.</p>' +
      '<label>Nom du tournoi</label><input id="t-name" placeholder="Ex. Tournoi de belote du club" value="Tournoi de belote">' +
      '<label>Nombre de poules (4 équipes chacune)</label><input id="t-pools" type="number" min="2" max="26" value="6">' +
      '<p class="sub" id="t-preview"></p>' +
      '<label>Code administrateur (à retenir)</label><input id="t-pin" type="password" placeholder="Code secret">' +
      '<div style="height:12px"></div>' +
      '<button class="btn primary block" data-act="admin-create">Créer le tournoi</button></div>';
    updatePreview();
    var pools = document.getElementById('t-pools');
    if (pools) pools.addEventListener('input', updatePreview);
  }
  function updatePreview() {
    var el = document.getElementById('t-preview'); if (!el) return;
    var n = Math.max(2, parseInt(document.getElementById('t-pools').value, 10) || 0);
    var size = L.bracketSizeFor(n);
    var thirds = size - 2 * n;
    var firstRound = L.resolveBracket({ size: size, slots: [] }, [], {}).rounds[0].key;
    el.innerHTML = n + ' poules → ' + (4 * n) + ' équipes. Tableau à <b>' + size + '</b> (' + L.roundLabel(firstRound) + ') : ' +
      '2 premiers de chaque poule' + (thirds > 0 ? ' + ' + thirds + ' meilleurs 3es' : '') + '.';
  }
  function renderAdminLogin() {
    screen.innerHTML = back() +
      '<div class="card"><h2>Administration</h2><p class="sub">Entrez le code administrateur.</p>' +
      '<label>Code</label><input id="a-pin" type="password" placeholder="Code secret">' +
      '<div style="height:10px"></div>' +
      '<button class="btn primary block" data-act="admin-unlock">Déverrouiller</button></div>';
  }
  function renderAdminDash(c) {
    var standings = L.allStandings(c.numPools, store.teams, store.matches);
    var prog = L.poolProgress(c.numPools, store.matches);
    var assigned = store.teams.filter(function (t) { return t.assigned; }).length;

    var tabs = ['equipes', 'poules', 'tableau', 'reglages'];
    var labels = { equipes: 'Équipes', poules: 'Poules', tableau: 'Tableau', reglages: 'Réglages' };
    var nav = '<div class="pool-tabs">' + tabs.map(function (tb) {
      return '<span class="pill ' + (ui.adminTab === tb ? 'active' : '') + '" data-act="admin-tab" data-tab="' + tb + '">' + labels[tb] + '</span>';
    }).join('') + '</div>';

    var head = '<div class="card"><h2>' + esc(c.name) + '</h2>' +
      '<p class="sub">' + c.numPools + ' poules · ' + assigned + '/' + store.teams.length + ' équipes · poules ' + prog.done + '/' + prog.total + ' matchs</p>' + nav + '</div>';

    var body;
    if (ui.adminTab === 'equipes') body = adminEquipes(c, assigned);
    else if (ui.adminTab === 'poules') body = adminPoules(c, standings);
    else if (ui.adminTab === 'tableau') body = adminTableau(c, standings, prog);
    else body = adminReglages(c);

    screen.innerHTML = back() + head + body;
    var input = document.getElementById('new-team');
    if (input) input.focus();
  }

  function adminEquipes(c, assigned) {
    var full = assigned >= store.teams.length;
    var draw = '';
    if (ui.lastDraw) {
      draw = '<div class="notice info">🎲 <b>' + esc(ui.lastDraw.name) + '</b> → Poule <b>' +
        ui.lastDraw.pool + '</b>, Équipe <b>' + ui.lastDraw.slot + '</b></div>';
    }
    var form = full
      ? '<div class="notice">Toutes les places sont attribuées (' + store.teams.length + '). Passez à l\'onglet <b>Poules</b>.</div>'
      : draw + '<label>Nom de l\'équipe</label>' +
        '<div class="field-2"><div style="flex:2"><input id="new-team" placeholder="Ex. Les Atouts" autocomplete="off" value="' + esc(ui.draftTeam) + '"></div>' +
        '<button class="btn primary" data-act="add-team" style="flex:1">🎲 Tirer</button></div>' +
        '<p class="sub">La poule et le numéro sont tirés au sort à la saisie. ' + (store.teams.length - assigned) + ' place(s) restante(s).</p>';

    var grid = '';
    for (var p = 0; p < c.numPools; p++) {
      var P = L.poolLabel(p);
      var cells = store.teams.filter(function (t) { return t.pool === P; })
        .sort(function (a, b) { return a.slot - b.slot; })
        .map(function (t) {
          return '<div class="match" style="padding:8px;margin:0">' +
            '<div class="match-meta"><span class="rk">' + t.pool + t.slot + '</span>' +
            (t.assigned ? '<span class="btn-row" style="gap:6px">' +
              '<button class="pill" data-act="rename-team" data-team="' + t.id + '">✎</button>' +
              '<button class="pill" data-act="remove-team" data-team="' + t.id + '">🗑</button></span>' : '') +
            '</div><b>' + (t.assigned ? teamName(t) : '<span class="sub">libre</span>') + '</b></div>';
        }).join('');
      grid += '<h3>Poule ' + P + '</h3><div class="grid-teams">' + cells + '</div>';
    }
    return '<div class="card"><h2>Saisie des équipes</h2>' + form + '</div>' +
      '<div class="card"><h2>Composition des poules</h2>' + grid + '</div>';
  }

  function adminPoules(c, standings) {
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
    html += '</div>';
    return html;
  }

  function adminTableau(c, standings, prog) {
    if (c.phase !== 'bracket' || !c.bracket) {
      var q = L.qualifiers(c.numPools, standings);
      return '<div class="card"><h2>Lancer la phase finale</h2>' +
        '<p class="sub">Poules jouées : ' + prog.done + '/' + prog.total + '.' +
        (prog.complete ? ' ✅ Toutes les rencontres sont saisies.' : ' ⚠️ Toutes les rencontres ne sont pas terminées.') + '</p>' +
        '<p class="sub">Le tableau à ' + q.size + ' réunira les 2 premiers de chaque poule' +
        (q.thirdsNeeded > 0 ? ' et les ' + q.thirdsNeeded + ' meilleurs 3es' : '') + '.</p>' +
        '<div class="notice">Une fois lancé, le tirage des têtes de série est figé (vous pourrez toujours corriger les scores).</div>' +
        '<button class="btn primary block" data-act="start-bracket">Clôturer les poules &amp; générer le tableau</button></div>';
    }
    var resolved = L.resolveBracket(c.bracket, store.teams, koResults());
    var html = '<div class="card"><h2>Tableau final</h2>' + bracketView(c.bracket) + '</div>';
    html += '<div class="card"><h2>Saisie des scores — phase finale</h2>';
    var list = L.bracketMatchList(resolved).filter(function (e) {
      if (e.id === 'final-2') return resolved.final && resolved.final.needBelle;
      return true;
    });
    list.forEach(function (e) {
      if (!e.teamA || !e.teamB) return;
      var m = Object.assign({}, matchById(e.id) || {}, { id: e.id, teamA: e.teamA, teamB: e.teamB, target: e.target, phase: 'ko', roundKey: e.key });
      html += matchCard(m, koTitle(e));
    });
    html += '</div>';
    return html;
  }
  function koTitle(e) {
    if (e.key === 'final') return 'Finale — ' + (e.leg === 0 ? 'Aller' : (e.leg === 1 ? 'Retour' : 'Belle'));
    return L.roundLabel(e.key);
  }

  function adminReglages(c) {
    return '<div class="card"><h2>Réglages</h2>' +
      '<p class="sub">Tournoi « ' + esc(c.name) + ' ».</p>' +
      '<label>Phase</label>' +
      '<div class="btn-row">' +
      '<button class="btn small" data-act="set-phase" data-phase="pools">Poules</button>' +
      '<button class="btn small" data-act="set-phase" data-phase="bracket">Phase finale</button>' +
      '<button class="btn small" data-act="set-phase" data-phase="done">Terminé</button></div>' +
      '<div style="height:16px"></div>' +
      '<button class="btn small block" data-act="lock-admin">Verrouiller l\'administration</button>' +
      '<div style="height:20px"></div>' +
      '<h3>Zone dangereuse</h3>' +
      '<p class="sub">Réinitialiser efface toutes les équipes, scores et réglages.</p>' +
      '<button class="btn danger block" data-act="reset">Réinitialiser le tournoi</button></div>';
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
  });
  screen.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.id === 'new-team') { ev.preventDefault(); handleAction('add-team'); }
  });
  screen.addEventListener('focusout', function () {
    setTimeout(function () { if (pendingRender) render(); }, 50);
  });

  function readScores(mid) {
    return {
      sa: parseInt((document.getElementById('sa-' + mid) || {}).value, 10),
      sb: parseInt((document.getElementById('sb-' + mid) || {}).value, 10)
    };
  }
  function matchBase(mid) {
    var m = matchById(mid);
    if (m && m.phase === 'pool') return { phase: 'pool', pool: m.pool, slotA: m.slotA, slotB: m.slotB, teamA: m.teamA, teamB: m.teamB, target: m.target };
    var c = store.config, resolved = L.resolveBracket(c.bracket, store.teams, koResults());
    var e = L.bracketMatchList(resolved).filter(function (x) { return x.id === mid; })[0];
    return e ? { phase: 'ko', teamA: e.teamA, teamB: e.teamB, target: e.target, roundKey: e.key } : { phase: 'ko' };
  }

  function handleAction(act, a, mid) {
    if (act === 'add-team') {
      var inp = document.getElementById('new-team');
      var name = ((inp && inp.value) || ui.draftTeam || '').trim();
      if (!name) { toast('Saisissez un nom d\'équipe.'); return; }
      ui.draftTeam = '';
      DB.addTeam(tid, name).then(function (t) {
        ui.lastDraw = { name: t.name, pool: t.pool, slot: t.slot };
        toast(name + ' → Poule ' + t.pool + ', Équipe ' + t.slot);
        render(true);
        var i = document.getElementById('new-team'); if (i) i.focus();
      }).catch(function () { toast('Toutes les places sont prises.'); });
      return;
    }
    if (act === 'rename-team') {
      var t2 = teamById(a.getAttribute('data-team')); if (!t2) return;
      modalPrompt('Nouveau nom de l\'équipe ' + t2.pool + t2.slot + ' :', t2.name || '').then(function (nn) {
        if (nn != null && nn.trim()) DB.renameTeam(tid, t2.id, nn.trim()).then(function () { toast('Équipe renommée.'); });
      });
      return;
    }
    if (act === 'remove-team') {
      var t3 = teamById(a.getAttribute('data-team')); if (!t3) return;
      modalConfirm('Retirer l\'équipe « ' + (t3.name || t3.pool + t3.slot) + ' » ? Sa place redeviendra libre.', 'Retirer').then(function (ok) {
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
    if (act === 'admin-create') return adminCreate();
    if (act === 'admin-unlock') return adminUnlock();
    if (act === 'start-bracket') return startBracket();
    if (act === 'set-phase') { DB.setPhase(tid, a.getAttribute('data-phase')).then(function () { toast('Phase mise à jour.'); }); return; }
    if (act === 'lock-admin') { sessionStorage.removeItem('bt:admin:' + tid); go('#/'); return; }
    if (act === 'reset') {
      modalConfirm('Réinitialiser TOUT le tournoi (équipes, scores, réglages) ? Action irréversible.', 'Réinitialiser').then(function (ok) {
        if (!ok) return;
        DB.resetTournament(tid).then(function () { sessionStorage.removeItem('bt:admin:' + tid); toast('Tournoi réinitialisé.'); go('#/admin'); });
      });
      return;
    }
  }

  function adminCreate() {
    var name = document.getElementById('t-name').value.trim() || 'Tournoi de belote';
    var numPools = Math.max(2, Math.min(26, parseInt(document.getElementById('t-pools').value, 10) || 6));
    var pin = document.getElementById('t-pin').value;
    if (!pin || pin.length < 3) { toast('Choisissez un code d\'au moins 3 caractères.'); return; }
    sha256(pin).then(function (hash) {
      return DB.createTournament(tid, { name: name, numPools: numPools, phase: 'setup', adminHash: hash });
    }).then(function () {
      sessionStorage.setItem('bt:admin:' + tid, '1');
      ui.adminTab = 'equipes';
      toast('Tournoi créé !');
      render();
    });
  }
  function adminUnlock() {
    var pin = document.getElementById('a-pin').value;
    sha256(pin).then(function (hash) {
      if (store.config && hash === store.config.adminHash) { sessionStorage.setItem('bt:admin:' + tid, '1'); render(); }
      else toast('Code incorrect.');
    });
  }
  function startBracket() {
    var c = store.config;
    var standings = L.allStandings(c.numPools, store.teams, store.matches);
    var q = L.qualifiers(c.numPools, standings);
    var enough = q.winners.length + q.runners.length + q.thirds.length >= q.size;
    var ask = enough ? Promise.resolve(true)
      : modalConfirm('Toutes les places qualificatives ne sont pas encore déterminées (poules incomplètes). Générer le tableau quand même ?', 'Générer');
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
    subscribe();
    if (!location.hash) location.hash = '#/';
    render();
  }).catch(function (e) {
    screen.innerHTML = '<div class="notice">Erreur de connexion : ' + esc(e && e.message) + '.</div>';
  });
})();
