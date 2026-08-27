/* app.js — Interface et navigation du tournoi de belote. */
(function () {
  'use strict';

  var L = window.BeloteLogic;
  var CFG = window.APP_CONFIG;
  var tid = new URLSearchParams(location.search).get('t') || CFG.defaultTournamentId;

  var store = { config: null, teams: [], matches: [], loaded: 0 };
  var me = { uid: null, mode: null };
  var ui = { poolTab: 'A', adminTab: 'apercu' };
  var screen = document.getElementById('screen');
  var pendingRender = false;

  /* ---- Petits utilitaires ------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function teamById(id) {
    for (var i = 0; i < store.teams.length; i++) if (store.teams[i].id === id) return store.teams[i];
    return null;
  }
  function myTeam() {
    for (var i = 0; i < store.teams.length; i++) if (store.teams[i].uid === me.uid) return store.teams[i];
    return null;
  }
  function teamNames(t) {
    if (!t) return '—';
    if (t.captainName) return esc(t.captainName) + (t.partnerName ? ' &amp; ' + esc(t.partnerName) : '');
    return 'Équipe ' + t.slot + ' (libre)';
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
  function joinUrl() {
    var base = location.origin + location.pathname;
    var q = (tid !== CFG.defaultTournamentId) ? ('?t=' + encodeURIComponent(tid)) : '';
    return base + q + '#/join';
  }
  function toast(msg) {
    var footInfo = document.getElementById('foot-info');
    footInfo.textContent = msg;
    setTimeout(function () { footInfo.textContent = footNote(); }, 2600);
  }
  function footNote() {
    var m = me.mode === 'local' ? 'Mode démo (données locales)' : 'Synchro temps réel';
    return (store.config ? esc(store.config.name) + ' · ' : '') + m;
  }

  /* ---- Navigation -------------------------------------------------- */
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  window.addEventListener('hashchange', render);

  /* ---- Abonnements aux données ------------------------------------- */
  function subscribe() {
    DB.watchTournament(tid, function (c) { store.config = c; store.loaded |= 1; render(); });
    DB.watchTeams(tid, function (t) { store.teams = t; store.loaded |= 2; render(); });
    DB.watchMatches(tid, function (m) { store.matches = m; store.loaded |= 4; render(); });
  }

  /* ================================================================= *
   *  RENDU                                                            *
   * ================================================================= */
  function render() {
    // Ne pas casser une saisie en cours.
    if (screen.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') {
      pendingRender = true; return;
    }
    pendingRender = false;
    document.getElementById('foot-info').textContent = footNote();
    var chip = document.getElementById('mode-chip');
    if (me.mode === 'local') { chip.hidden = false; chip.textContent = 'DÉMO'; chip.classList.add('warn'); }
    else { chip.hidden = true; }

    var route = (location.hash || '#/').split('?')[0];
    if (route === '#/' || route === '') return renderHome();
    if (route === '#/join') return renderJoin();
    if (route === '#/equipe') return renderTeam();
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
      : '<div class="notice">Aucun tournoi n\'a encore été créé. L\'organisateur doit passer par <b>Administration</b>.</div>';
    screen.innerHTML = head +
      '<div class="menu-grid">' +
        tile('#/join', '🃏', 'Je suis chef d\'équipe', 'Rejoindre le tournoi et saisir mes scores') +
        tile('#/classement', '📊', 'Classement &amp; tableau', 'Suivre les poules et le tableau final') +
        tile('#/admin', '🔧', 'Administration', 'Créer et gérer le tournoi (organisateur)') +
      '</div>';
  }
  function tile(hash, emoji, title, sub) {
    return '<a class="menu-tile" data-nav="' + hash + '"><span class="emoji">' + emoji + '</span>' +
      '<span><b>' + title + '</b><span>' + sub + '</span></span></a>';
  }
  function phaseLabel(p) {
    return { setup: 'Inscriptions', pools: 'Phase de poules', bracket: 'Phase finale', done: 'Terminé' }[p] || 'Inscriptions';
  }

  /* ---- Rejoindre (chef d'équipe) ----------------------------------- */
  function renderJoin() {
    var c = store.config;
    if (!c) { screen.innerHTML = back() + '<div class="notice">Le tournoi n\'est pas encore ouvert.</div>'; return; }
    var mine = myTeam();
    if (mine) { go('#/equipe'); return; }
    var free = store.teams.filter(function (t) { return !t.claimed; }).length;
    if (c.phase === 'bracket' || c.phase === 'done') {
      screen.innerHTML = back() + '<div class="notice">Les inscriptions sont closes (le tournoi a commencé).</div>';
      return;
    }
    if (free === 0) {
      screen.innerHTML = back() + '<div class="notice">Toutes les équipes ont déjà un chef. Contactez l\'organisateur.</div>';
      return;
    }
    screen.innerHTML = back() +
      '<div class="card center">' +
        '<h2>Bienvenue au tournoi&nbsp;!</h2>' +
        '<p class="sub">En rejoignant, une <b>poule</b> et une <b>place</b> vous seront attribuées au hasard. ' +
        'Vous deviendrez le <b>chef</b> de votre équipe et pourrez saisir vos scores.</p>' +
        '<p class="big-num">' + free + '</p><p class="sub">place(s) encore libre(s)</p>' +
        '<div style="height:10px"></div>' +
        '<button class="btn primary block" data-act="become-captain">Devenir chef d\'équipe</button>' +
      '</div>';
  }

  /* ---- Tableau de bord du chef d'équipe ---------------------------- */
  function renderTeam() {
    var c = store.config;
    var t = myTeam();
    if (!c) { screen.innerHTML = back() + '<div class="notice">Tournoi indisponible.</div>'; return; }
    if (!t) { go('#/join'); return; }

    var html = back() +
      '<div class="card">' +
        '<span class="tag">Poule ' + t.pool + ' · Équipe ' + t.slot + '</span>' +
        '<h2 style="margin-top:8px">Votre équipe</h2>' +
        '<label>Votre nom (chef)</label>' +
        '<input id="cap-name" value="' + esc(t.captainName) + '" placeholder="Votre prénom">' +
        '<label>Nom de votre partenaire</label>' +
        '<input id="cap-partner" value="' + esc(t.partnerName) + '" placeholder="Prénom du partenaire">' +
        '<div style="height:10px"></div>' +
        '<button class="btn primary block" data-act="save-names">Enregistrer les noms</button>' +
      '</div>';

    // Matchs de poule de mon équipe.
    var poolMatches = store.matches.filter(function (m) {
      return m.phase === 'pool' && (m.teamA === t.id || m.teamB === t.id);
    }).sort(function (a, b) { return a.id < b.id ? -1 : 1; });

    html += '<div class="card"><h2>Mes matchs de poule</h2>' +
      '<p class="sub">Match en ' + L.POOL_TARGET + ' points. Le score doit être validé par le chef adverse.</p>';
    if (!t.captainName) html += '<div class="notice">Renseignez d\'abord votre nom ci-dessus.</div>';
    poolMatches.forEach(function (m) { html += matchCard(m, t.id, false); });
    html += '</div>';

    // Matchs du tableau final concernant mon équipe.
    if (c.phase === 'bracket' && c.bracket) {
      var resolved = L.resolveBracket(c.bracket, store.teams, koResults());
      var list = L.bracketMatchList(resolved).filter(function (e) {
        return (e.teamA === t.id || e.teamB === t.id);
      });
      // La finale : ne montrer la belle que si nécessaire.
      list = filterFinalLegs(list, resolved);
      if (list.length) {
        html += '<div class="card"><h2>Mes matchs — phase finale</h2>';
        list.forEach(function (e) {
          var m = matchById(e.id) || { id: e.id, phase: 'ko', teamA: e.teamA, teamB: e.teamB, target: e.target };
          m.teamA = e.teamA; m.teamB = e.teamB; m.target = e.target; m.phase = 'ko'; m.roundKey = e.key;
          html += matchCard(m, t.id, false, koTitle(e, resolved));
        });
        html += '</div>';
      } else {
        html += '<div class="card"><h2>Phase finale</h2><p class="sub">Votre prochain match s\'affichera dès que votre adversaire sera connu.</p></div>';
      }
    }
    screen.innerHTML = html;
  }

  // Retire la belle (final-2) tant qu'elle n'est pas nécessaire.
  function filterFinalLegs(list, resolved) {
    var need = resolved.final && resolved.final.needBelle;
    return list.filter(function (e) { return !(e.id === 'final-2' && !need); });
  }
  function koTitle(e, resolved) {
    if (e.key === 'final') {
      var n = e.leg === 0 ? 'Aller' : (e.leg === 1 ? 'Retour' : 'Belle');
      return 'Finale — ' + n;
    }
    return L.roundLabel(e.key);
  }

  /* ---- Fiche d'un match (saisie + validation) ---------------------- */
  // perspectiveTeamId : équipe du chef qui regarde (null = admin).
  function matchCard(m, perspectiveTeamId, admin, titleOverride) {
    var ta = teamById(m.teamA), tb = teamById(m.teamB);
    var nameA = ta ? teamNames(ta) : (m.teamA ? teamTag(m.teamA) : '<span class="bteam tbd">à définir</span>');
    var nameB = tb ? teamNames(tb) : (m.teamB ? teamTag(m.teamB) : '<span class="bteam tbd">à définir</span>');
    var prop = m.proposal;
    var canPlay = m.teamA && m.teamB;
    var mine = perspectiveTeamId;
    var iAmInMatch = mine && (m.teamA === mine || m.teamB === mine);

    var status, statusCls;
    if (m.validated) { status = '✓ Validé'; statusCls = 'valid'; }
    else if (prop) { status = 'À valider'; statusCls = 'proposed'; }
    else { status = 'À jouer'; statusCls = 'pending'; }

    var scoreA = prop ? prop.scoreA : '';
    var scoreB = prop ? prop.scoreB : '';
    var win = (m.validated && prop) ? (prop.scoreA > prop.scoreB ? 'a' : (prop.scoreB > prop.scoreA ? 'b' : '')) : '';

    var head = '<div class="match-meta"><span class="rk">' +
      (titleOverride ? esc(titleOverride) : ('Poule ' + (m.pool || '') + ' · ' + m.target + ' pts')) +
      '</span><span class="status ' + statusCls + '">' + status + '</span></div>';

    var body = '<div class="teams">' +
      '<span class="team ' + (win === 'a' ? 'win' : '') + '">' + nameA + '</span>' +
      '<span class="vs">contre</span>' +
      '<span class="team b ' + (win === 'b' ? 'win' : '') + '">' + nameB + '</span></div>';

    if (!canPlay) return '<div class="match">' + head + body +
      '<p class="sub">En attente des équipes qualifiées.</p></div>';

    // Zone de saisie / validation.
    var controls = '';
    var showEditor = admin || (iAmInMatch);
    if (showEditor) {
      var canValidate = !admin && prop && !m.validated && prop.byTeamId !== mine;
      var waiting = !admin && prop && !m.validated && prop.byTeamId === mine;
      controls += '<div class="field-2" style="margin-top:10px">' +
        '<div><label>Points ' + shortName(ta, m.teamA) + '</label>' +
          '<input type="number" inputmode="numeric" id="sa-' + m.id + '" value="' + scoreA + '" placeholder="0"></div>' +
        '<div><label>Points ' + shortName(tb, m.teamB) + '</label>' +
          '<input type="number" inputmode="numeric" id="sb-' + m.id + '" value="' + scoreB + '" placeholder="0"></div>' +
      '</div>';

      if (admin) {
        controls += '<div class="btn-row" style="margin-top:10px">' +
          '<button class="btn primary small" data-act="admin-propose" data-match="' + m.id + '">Enregistrer</button>' +
          (prop ? '<button class="btn danger small" data-act="admin-clear" data-match="' + m.id + '">Effacer</button>' : '') +
        '</div>';
      } else if (waiting) {
        controls += '<p class="sub" style="margin-top:8px">⏳ En attente de validation par le chef adverse. Vous pouvez corriger le score puis re-proposer.</p>' +
          '<button class="btn small block" data-act="propose" data-match="' + m.id + '">Corriger &amp; re-proposer</button>';
      } else if (canValidate) {
        controls += '<p class="sub" style="margin-top:8px">Le chef adverse propose ce score. Vérifiez puis validez.</p>' +
          '<div class="btn-row">' +
          '<button class="btn primary small" data-act="validate" data-match="' + m.id + '">✓ Valider</button>' +
          '<button class="btn small" data-act="propose" data-match="' + m.id + '">Corriger</button></div>';
      } else if (m.validated) {
        controls += '<button class="btn small block" data-act="propose" data-match="' + m.id + '" style="margin-top:8px">Modifier le score</button>';
      } else {
        controls += '<button class="btn primary small block" data-act="propose" data-match="' + m.id + '" style="margin-top:10px">Proposer le score</button>';
      }
    } else if (m.validated) {
      body = '<div class="teams">' +
        '<span class="team ' + (win === 'a' ? 'win' : '') + '">' + nameA + '</span>' +
        '<span class="score">' + scoreA + '</span><span class="vs">–</span><span class="score">' + scoreB + '</span>' +
        '<span class="team b ' + (win === 'b' ? 'win' : '') + '">' + nameB + '</span></div>';
    }
    return '<div class="match">' + head + body + controls + '</div>';
  }
  function shortName(t, id) {
    if (t && t.captainName) return esc(t.captainName);
    return id ? esc(teamTag(id)) : '?';
  }

  /* ---- Classement & tableau (public) ------------------------------- */
  function renderStandings() {
    var c = store.config;
    if (!c) { screen.innerHTML = back() + '<div class="notice">Aucun tournoi en cours.</div>'; return; }
    var standings = L.allStandings(c.numPools, store.teams, store.matches);
    var pools = [];
    for (var p = 0; p < c.numPools; p++) pools.push(L.poolLabel(p));
    if (pools.indexOf(ui.poolTab) < 0) ui.poolTab = pools[0];

    var tabs = '<div class="pool-tabs">' + pools.map(function (P) {
      return '<span class="pill ' + (P === ui.poolTab ? 'active' : '') + '" data-act="pool-tab" data-pool="' + P + '">Poule ' + P + '</span>';
    }).join('') + '</div>';

    var html = back() + '<div class="card"><h2>Classement des poules</h2>' + tabs +
      standingsTable(standings[ui.poolTab]) +
      '<div class="legend">' +
        '<span><i style="background:var(--green)"></i>1er (qualifié)</span>' +
        '<span><i style="background:var(--gold)"></i>2e (qualifié)</span>' +
        '<span><i style="background:#9aa5a0"></i>3e (repêchable)</span>' +
      '</div>' +
      '<p class="sub" style="margin-top:8px">Départage : points, puis goal-average (différence), puis total de points marqués.</p>' +
      '</div>';

    // Meilleurs 3es.
    var q = L.qualifiers(c.numPools, standings);
    if (q.thirdsNeeded > 0 && q.allThirds.length) {
      html += '<div class="card"><h2>Meilleurs 3es</h2>' +
        '<p class="sub">Les ' + q.thirdsNeeded + ' meilleurs 3es complètent le tableau à ' + q.size + '.</p>' +
        thirdsTable(q) + '</div>';
    }

    // Tableau final.
    if (c.phase === 'bracket' && c.bracket) {
      html += '<div class="card"><h2>Tableau final</h2>' + bracketView(c.bracket) + '</div>';
    } else {
      var prog = L.poolProgress(c.numPools, store.matches);
      html += '<div class="card"><h2>Tableau final</h2><p class="sub">Il s\'affichera après la clôture des poules (' +
        prog.done + '/' + prog.total + ' matchs joués).</p></div>';
    }
    screen.innerHTML = html;
  }

  function standingsTable(rows) {
    if (!rows || !rows.length) return '<p class="sub">Aucune équipe.</p>';
    var body = rows.map(function (r) {
      return '<tr class="qual-' + (r.rank <= 3 ? r.rank : 0) + '">' +
        '<td class="rankbadge">' + r.rank + '</td>' +
        '<td class="name">' + teamNames(r.team) + '<small>' + r.pool + r.slot + '</small></td>' +
        '<td>' + r.played + '</td>' +
        '<td>' + r.wins + '</td>' +
        '<td class="pts-col">' + r.pts + '</td>' +
        '<td>' + (r.ga > 0 ? '+' : '') + r.ga + '</td>' +
        '<td>' + r.pf + '</td></tr>';
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
        '<td class="name">' + teamNames(r.team) + '<small>Poule ' + r.pool + '</small></td>' +
        '<td class="pts-col">' + r.pts + '</td>' +
        '<td>' + (r.ga > 0 ? '+' : '') + r.ga + '</td>' +
        '<td>' + r.pf + '</td>' +
        '<td>' + (inn ? '✅' : '—') + '</td></tr>';
    }).join('');
    return '<table class="standings"><thead><tr><th>#</th><th style="text-align:left">Équipe</th><th>Pts</th><th>GA</th><th>Marqués</th><th>Qual.</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  /* ---- Vue tableau final (bracket) --------------------------------- */
  function bracketView(bracket) {
    var resolved = L.resolveBracket(bracket, store.teams, koResults());
    var cols = resolved.rounds.map(function (rd) {
      var title = rd.key === 'final' ? 'Finale' : L.roundLabel(rd.key);
      var inner;
      if (rd.key === 'final') {
        inner = finalColumn(resolved);
      } else {
        inner = rd.matches.map(function (m) { return bmatch(m.teamA, m.teamB, m.result, m.winner); }).join('');
      }
      return '<div class="bround"><h4>' + title + '</h4>' + inner + '</div>';
    }).join('');

    var extra = '';
    if (resolved.thirdPlace) {
      var tp = resolved.thirdPlace;
      extra += '<h3>Petite finale (3e place) — ' + tp.target + ' pts</h3>' +
        '<div class="bracket"><div class="bround">' + bmatch(tp.teamA, tp.teamB, tp.result, tp.winner) + '</div></div>';
    }
    var champ = '';
    if (resolved.champion) {
      champ = '<div class="champion">🏆 Vainqueur : ' + teamNames(teamById(resolved.champion)) + '</div>';
    }
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
    var nm = t ? (teamTag(id) + ' ' + (t.captainName ? esc(t.captainName) : 'Éq.' + t.slot)) : '<span>à définir</span>';
    return '<div class="bteam ' + (isWin ? 'w' : '') + (id ? '' : ' tbd') + '">' +
      '<span class="nm">' + nm + '</span>' +
      '<span class="sc">' + (score == null ? '' : score) + '</span></div>';
  }
  function finalColumn(resolved) {
    var f = resolved.final;
    if (!f) return '';
    var rows = '';
    var legsToShow = f.needBelle || (f.winsA + f.winsB >= 2 && !f.winner) ? 3 : (f.winner ? countPlayedLegs(f) : 2);
    for (var i = 0; i < 3; i++) {
      if (i === 2 && !(f.needBelle || legHasScore(f.legs[2]))) continue;
      var res = f.legs[i];
      var sc = L.scoreOf(res);
      var w = res ? L.winnerOf(res, f.teamA, f.teamB) : null;
      var lbl = i === 0 ? 'Aller' : (i === 1 ? 'Retour' : 'Belle');
      rows += '<div style="font-size:.72rem;color:var(--muted);margin:2px 0">' + lbl + '</div>' +
        bmatch(f.teamA, f.teamB, res, w);
    }
    rows += '<div style="text-align:center;font-size:.8rem;margin-top:4px">' +
      teamTag(f.teamA) + ' <b>' + f.winsA + '</b> – <b>' + f.winsB + '</b> ' + teamTag(f.teamB) + '</div>';
    return rows;
  }
  function legHasScore(res) { return !!L.scoreOf(res); }
  function countPlayedLegs(f) { var n = 0; f.legs.forEach(function (l) { if (legHasScore(l)) n++; }); return n; }

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
      '<p class="sub">Configurez le tournoi. Un code confidentiel protègera l\'espace d\'administration.</p>' +
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
    el.innerHTML = n + ' poules → ' + (4 * n) + ' équipes. Tableau à <b>' + size + '</b> (' +
      L.roundLabel(L.resolveBracket({ size: size, slots: [] }, [], {}).rounds[0].key) + ') : ' +
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
    var claimed = store.teams.filter(function (t) { return t.claimed; }).length;

    var tabs = ['apercu', 'poules', 'tableau', 'reglages'];
    var labels = { apercu: 'Aperçu', poules: 'Poules', tableau: 'Tableau', reglages: 'Réglages' };
    var nav = '<div class="pool-tabs">' + tabs.map(function (tb) {
      return '<span class="pill ' + (ui.adminTab === tb ? 'active' : '') + '" data-act="admin-tab" data-tab="' + tb + '">' + labels[tb] + '</span>';
    }).join('') + '</div>';

    var head = '<div class="card"><h2>' + esc(c.name) + '</h2>' +
      '<p class="sub">' + c.numPools + ' poules · ' + phaseLabel(c.phase) + ' · ' +
      claimed + '/' + store.teams.length + ' équipes inscrites · poules ' + prog.done + '/' + prog.total + '</p>' + nav + '</div>';

    var body = '';
    if (ui.adminTab === 'apercu') body = adminApercu(c, prog, claimed);
    else if (ui.adminTab === 'poules') body = adminPoules(c, standings);
    else if (ui.adminTab === 'tableau') body = adminTableau(c, standings, prog);
    else body = adminReglages(c);

    screen.innerHTML = back() + head + body;
    if (ui.adminTab === 'apercu') drawQR();
  }
  function adminApercu(c, prog, claimed) {
    var teamsGrid = '';
    for (var p = 0; p < c.numPools; p++) {
      var P = L.poolLabel(p);
      var cells = store.teams.filter(function (t) { return t.pool === P; }).map(function (t) {
        return '<div class="match" style="padding:8px"><b>' + t.pool + t.slot + '</b> ' +
          (t.claimed ? teamNames(t) : '<span class="sub">libre</span>') + '</div>';
      }).join('');
      teamsGrid += '<h3>Poule ' + P + '</h3><div class="grid-teams">' + cells + '</div>';
    }
    return '<div class="card"><h2>QR code d\'inscription</h2>' +
      '<p class="sub">Les participants scannent ce QR : chacun devient chef d\'une équipe tirée au hasard.</p>' +
      '<div class="qr-box" id="qr"></div>' +
      '<div class="url-copy" id="join-url">' + esc(joinUrl()) + '</div>' +
      '<button class="btn small block" data-act="copy-url" style="margin-top:8px">Copier le lien</button></div>' +
      '<div class="card"><h2>Équipes inscrites (' + claimed + '/' + store.teams.length + ')</h2>' + teamsGrid + '</div>';
  }
  function adminPoules(c, standings) {
    var pools = [];
    for (var p = 0; p < c.numPools; p++) pools.push(L.poolLabel(p));
    if (pools.indexOf(ui.poolTab) < 0) ui.poolTab = pools[0];
    var tabs = '<div class="pool-tabs">' + pools.map(function (P) {
      return '<span class="pill ' + (P === ui.poolTab ? 'active' : '') + '" data-act="pool-tab" data-pool="' + P + '">' + P + '</span>';
    }).join('') + '</div>';
    var P = ui.poolTab;
    var html = '<div class="card"><h2>Poule ' + P + '</h2>' + tabs + standingsTable(standings[P]) + '</div>';
    var pm = store.matches.filter(function (m) { return m.phase === 'pool' && m.pool === P; })
      .sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    html += '<div class="card"><h2>Matchs — saisie organisateur</h2>' +
      '<p class="sub">Vous pouvez saisir ou corriger n\'importe quel score.</p>';
    pm.forEach(function (m) { html += matchCard(m, null, true); });
    html += '</div>';
    return html;
  }
  function adminTableau(c, standings, prog) {
    if (c.phase !== 'bracket' || !c.bracket) {
      var q = L.qualifiers(c.numPools, standings);
      return '<div class="card"><h2>Lancer la phase finale</h2>' +
        '<p class="sub">Poules jouées : ' + prog.done + '/' + prog.total + '.' +
        (prog.complete ? ' ✅ Toutes les rencontres sont validées.' : ' ⚠️ Toutes les rencontres ne sont pas terminées.') + '</p>' +
        '<p class="sub">Le tableau à ' + q.size + ' sera constitué des 2 premiers de chaque poule' +
        (q.thirdsNeeded > 0 ? ' et des ' + q.thirdsNeeded + ' meilleurs 3es' : '') +
        '. Les têtes de série sont tirées du classement.</p>' +
        '<div class="notice">Une fois lancé, le tirage est figé. Vous pourrez toujours corriger les scores.</div>' +
        '<button class="btn primary block" data-act="start-bracket">Clôturer les poules &amp; générer le tableau</button></div>';
    }
    // Gestion des matchs du tableau.
    var resolved = L.resolveBracket(c.bracket, store.teams, koResults());
    var html = '<div class="card"><h2>Tableau final</h2>' + bracketView(c.bracket) + '</div>';
    html += '<div class="card"><h2>Saisie des scores — phase finale</h2>';
    var list = L.bracketMatchList(resolved).filter(function (e) {
      if (e.id === 'final-2') return resolved.final && resolved.final.needBelle;
      return true;
    });
    list.forEach(function (e) {
      if (!e.teamA || !e.teamB) return;
      var m = matchById(e.id) || { id: e.id };
      m = Object.assign({}, m, { teamA: e.teamA, teamB: e.teamB, target: e.target, phase: 'ko', roundKey: e.key });
      html += matchCard(m, null, true, koTitle(e, resolved));
    });
    html += '</div>';
    return html;
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

  function drawQR() {
    var box = document.getElementById('qr'); if (!box || typeof qrcode === 'undefined') return;
    try {
      var qr = qrcode(0, 'M'); qr.addData(joinUrl()); qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    } catch (e) { box.textContent = 'QR indisponible'; }
  }

  function back() { return '<a class="back" data-nav="#/">← Accueil</a>'; }

  /* ================================================================= *
   *  ACTIONS (délégation d'événements)                                *
   * ================================================================= */
  screen.addEventListener('click', function (ev) {
    var nav = ev.target.closest('[data-nav]');
    if (nav) { ev.preventDefault(); go(nav.getAttribute('data-nav')); return; }
    var a = ev.target.closest('[data-act]');
    if (!a) return;
    var act = a.getAttribute('data-act');
    var mid = a.getAttribute('data-match');
    handleAction(act, a, mid, ev);
  });
  // Reprendre un rendu différé après une saisie.
  screen.addEventListener('focusout', function () {
    setTimeout(function () { if (pendingRender) render(); }, 50);
  });

  function readScores(mid) {
    var sa = parseInt((document.getElementById('sa-' + mid) || {}).value, 10);
    var sb = parseInt((document.getElementById('sb-' + mid) || {}).value, 10);
    return { sa: sa, sb: sb };
  }
  function matchBase(mid) {
    var m = matchById(mid);
    if (m && m.phase === 'pool') return { phase: 'pool', pool: m.pool, slotA: m.slotA, slotB: m.slotB, teamA: m.teamA, teamB: m.teamB, target: m.target };
    // KO : reconstruire depuis le tableau résolu.
    var c = store.config, resolved = L.resolveBracket(c.bracket, store.teams, koResults());
    var e = L.bracketMatchList(resolved).filter(function (x) { return x.id === mid; })[0];
    return e ? { phase: 'ko', teamA: e.teamA, teamB: e.teamB, target: e.target, roundKey: e.key } : { phase: 'ko' };
  }

  function handleAction(act, a, mid, ev) {
    if (act === 'become-captain') {
      DB.claimRandomTeam(tid).then(function (t) {
        toast('Vous êtes chef de l\'équipe ' + t.slot + ' (poule ' + t.pool + ')');
        go('#/equipe');
      }).catch(function () { toast('Plus de place disponible.'); render(); });
      return;
    }
    if (act === 'save-names') {
      var t = myTeam(); if (!t) return;
      var cap = document.getElementById('cap-name').value.trim();
      var partner = document.getElementById('cap-partner').value.trim();
      if (!cap) { toast('Indiquez au moins votre nom.'); return; }
      DB.updateTeamNames(tid, t.id, cap, partner).then(function () { toast('Noms enregistrés.'); });
      return;
    }
    if (act === 'propose') {
      var s = readScores(mid);
      if (isNaN(s.sa) || isNaN(s.sb)) { toast('Saisissez les deux scores.'); return; }
      if (s.sa === s.sb) { toast('Un match ne peut pas être nul.'); return; }
      var t2 = myTeam();
      DB.propose(tid, mid, matchBase(mid), s.sa, s.sb, t2 ? t2.id : null)
        .then(function () { toast('Score proposé. En attente de validation adverse.'); });
      return;
    }
    if (act === 'validate') {
      DB.validate(tid, mid).then(function () { toast('Score validé ✓'); });
      return;
    }
    if (act === 'admin-propose') {
      var s2 = readScores(mid);
      if (isNaN(s2.sa) || isNaN(s2.sb)) { toast('Saisissez les deux scores.'); return; }
      DB.adminSet(tid, mid, matchBase(mid), s2.sa, s2.sb).then(function () { toast('Score enregistré.'); });
      return;
    }
    if (act === 'admin-clear') { DB.adminClear(tid, mid).then(function () { toast('Score effacé.'); }); return; }
    if (act === 'pool-tab') { ui.poolTab = a.getAttribute('data-pool'); render(); return; }
    if (act === 'admin-tab') { ui.adminTab = a.getAttribute('data-tab'); render(); return; }
    if (act === 'copy-url') {
      navigator.clipboard && navigator.clipboard.writeText(joinUrl());
      toast('Lien copié.');
      return;
    }
    if (act === 'admin-create') return adminCreate();
    if (act === 'admin-unlock') return adminUnlock();
    if (act === 'start-bracket') return startBracket();
    if (act === 'set-phase') { DB.setPhase(tid, a.getAttribute('data-phase')).then(function () { toast('Phase mise à jour.'); }); return; }
    if (act === 'lock-admin') { sessionStorage.removeItem('bt:admin:' + tid); go('#/'); return; }
    if (act === 'reset') {
      if (!confirm('Réinitialiser TOUT le tournoi ? Cette action est irréversible.')) return;
      DB.resetTournament(tid).then(function () { sessionStorage.removeItem('bt:admin:' + tid); toast('Tournoi réinitialisé.'); go('#/admin'); });
      return;
    }
  }

  function adminCreate() {
    var name = document.getElementById('t-name').value.trim() || 'Tournoi de belote';
    var numPools = Math.max(2, Math.min(26, parseInt(document.getElementById('t-pools').value, 10) || 6));
    var pin = document.getElementById('t-pin').value;
    if (!pin || pin.length < 3) { toast('Choisissez un code d\'au moins 3 caractères.'); return; }
    sha256(pin).then(function (hash) {
      return DB.createTournament(tid, { name: name, numPools: numPools, phase: 'pools', adminHash: hash });
    }).then(function () {
      sessionStorage.setItem('bt:admin:' + tid, '1');
      toast('Tournoi créé !');
      render();
    });
  }
  function adminUnlock() {
    var pin = document.getElementById('a-pin').value;
    sha256(pin).then(function (hash) {
      if (store.config && hash === store.config.adminHash) {
        sessionStorage.setItem('bt:admin:' + tid, '1'); render();
      } else { toast('Code incorrect.'); }
    });
  }
  function startBracket() {
    var c = store.config;
    var standings = L.allStandings(c.numPools, store.teams, store.matches);
    var q = L.qualifiers(c.numPools, standings);
    if (q.winners.length + q.runners.length + q.thirds.length < q.size) {
      if (!confirm('Toutes les places qualificatives ne sont pas encore déterminées (poules incomplètes). Générer quand même le tableau ?')) return;
    }
    var bracket = L.seedBracket(c.numPools, standings);
    DB.startBracket(tid, bracket).then(function () { ui.adminTab = 'tableau'; toast('Tableau généré !'); render(); });
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
    screen.innerHTML = '<div class="notice">Erreur de connexion : ' + esc(e && e.message) +
      '. Vérifiez la configuration Firebase (js/config.js).</div>';
  });
})();
