/* logic.js — Règles du tournoi de belote.
 *
 * Fonctions pures (aucune dépendance réseau) : classement des poules,
 * calcul des points, goal-average, qualification et construction du tableau
 * final. Facile à tester en isolation.
 */
(function (global) {
  'use strict';

  var POOL_TARGET = 1500;   // tous les matchs… (poules, 1/8, 1/4, 1/2)
  var KO_BIG_TARGET = 2000; // …sauf la finale et la petite finale

  /* ---- Poules ------------------------------------------------------ */

  // 0 -> 'A', 1 -> 'B', ...
  function poolLabel(i) { return String.fromCharCode(65 + i); }
  function poolIndex(label) { return (label || 'A').charCodeAt(0) - 65; }

  // Liste des slots d'équipes (vides) pour n poules de `poolSize`.
  function makeTeams(numPools, poolSize) {
    poolSize = poolSize || 4;
    var teams = [];
    for (var p = 0; p < numPools; p++) {
      for (var s = 1; s <= poolSize; s++) {
        teams.push({
          id: poolLabel(p) + s, pool: poolLabel(p), slot: s,
          name: '', assigned: false
        });
      }
    }
    return teams;
  }

  // Toutes les rencontres d'une poule de `n` (chacun rencontre les autres).
  function roundRobinPairs(n) {
    var a = [];
    for (var i = 1; i <= n; i++) for (var j = i + 1; j <= n; j++) a.push([i, j]);
    return a;
  }
  var POOL_PAIRS = roundRobinPairs(4); // compat

  // Calendrier round-robin (méthode du cercle) : tours successifs où chaque
  // équipe joue une fois. Donne l'ordre de déroulement des parties, ex. pour
  // 4 équipes : (1,2)(3,4) puis (1,3)(2,4) puis (1,4)(2,3).
  function roundRobinSchedule(n) {
    var rot = []; for (var i = 2; i <= n; i++) rot.push(i);
    if (n % 2 === 1) rot.push(0); // 0 = exempt (poule impaire)
    function ord(a, b) { return a < b ? [a, b] : [b, a]; }
    var rounds = [];
    for (var r = 0; r < rot.length; r++) {
      var pairs = [];
      if (rot[0] !== 0) pairs.push(ord(1, rot[0]));
      var i = 1, j = rot.length - 1;
      while (i < j) { if (rot[i] !== 0 && rot[j] !== 0) pairs.push(ord(rot[i], rot[j])); i++; j--; }
      rounds.push(pairs);
      rot.push(rot.shift());
    }
    return rounds;
  }
  // Liste plate des rencontres dans l'ordre de jeu.
  function scheduledPairs(n) {
    var out = [];
    roundRobinSchedule(n).forEach(function (rd) { rd.forEach(function (p) { out.push(p); }); });
    return out;
  }
  // Index d'ordre de jeu pour trier les matchs : { "slotA-slotB": position }.
  function poolMatchOrder(n) {
    var map = {}, pairs = scheduledPairs(n);
    for (var k = 0; k < pairs.length; k++) map[pairs[k][0] + '-' + pairs[k][1]] = k;
    return map;
  }

  function makePoolMatches(numPools, poolSize) {
    poolSize = poolSize || 4;
    var pairs = scheduledPairs(poolSize);
    var matches = [];
    for (var p = 0; p < numPools; p++) {
      var L = poolLabel(p);
      pairs.forEach(function (pair) {
        matches.push({
          id: 'pool-' + L + '-' + pair[0] + '-' + pair[1],
          phase: 'pool', pool: L, slotA: pair[0], slotB: pair[1],
          teamA: L + pair[0], teamB: L + pair[1],
          target: POOL_TARGET, proposal: null, validated: false
        });
      });
    }
    return matches;
  }

  // Élimination directe : n équipes (puissance de 2), tirées au sort dans le
  // tableau. Chaque équipe reçoit une position fixe ; l'aléatoire vient de
  // l'ordre de saisie (voir DB.addTeam).
  function makeKoTeams(numTeams) {
    var a = [];
    for (var i = 0; i < numTeams; i++) a.push({ id: 't' + (i + 1), pos: i, name: '', assigned: false });
    return a;
  }
  function koBracket(numTeams, teams) {
    var slots = new Array(numTeams);
    for (var i = 0; i < numTeams; i++) slots[i] = null;
    teams.forEach(function (t) { if (t.assigned && t.pos != null) slots[t.pos] = t.id; });
    return { size: numTeams, slots: slots };
  }

  /* ---- Points d'un match de poule ---------------------------------- */

  // Victoire = 1 pt, défaite = 0. Victoire par rubicon (le gagnant a au moins
  // le double des points de l'adversaire) = 2 pts. Une égalité parfaite ne
  // rapporte rien (impossible à 1500).
  function matchPoints(scoreA, scoreB) {
    if (scoreA == null || scoreB == null) return { a: 0, b: 0 };
    if (scoreA === scoreB) return { a: 0, b: 0 };
    if (scoreA > scoreB) return { a: scoreA >= 2 * scoreB ? 2 : 1, b: 0 };
    return { a: 0, b: scoreB >= 2 * scoreA ? 2 : 1 };
  }

  function scoreOf(match) {
    if (match && match.validated && match.proposal) {
      return { a: match.proposal.scoreA, b: match.proposal.scoreB };
    }
    return null;
  }

  /* ---- Classement d'une poule -------------------------------------- */

  // Tri : points desc, goal-average desc, points marqués desc, puis slot.
  function cmpStandings(x, y) {
    return (y.pts - x.pts) || (y.ga - x.ga) || (y.pf - x.pf) || (x.slot - y.slot);
  }

  function poolStandings(pool, teams, matches) {
    var rows = {};
    teams.filter(function (t) { return t.pool === pool; }).forEach(function (t) {
      rows[t.id] = {
        teamId: t.id, pool: pool, slot: t.slot, team: t,
        played: 0, wins: 0, draws: 0, losses: 0, pts: 0, pf: 0, pa: 0, ga: 0
      };
    });
    matches.filter(function (m) {
      return m.phase === 'pool' && m.pool === pool;
    }).forEach(function (m) {
      var sc = scoreOf(m);
      if (!sc) return;
      var ra = rows[m.teamA], rb = rows[m.teamB];
      if (!ra || !rb) return;
      var p = matchPoints(sc.a, sc.b);
      ra.played++; rb.played++;
      ra.pf += sc.a; ra.pa += sc.b; ra.ga = ra.pf - ra.pa;
      rb.pf += sc.b; rb.pa += sc.a; rb.ga = rb.pf - rb.pa;
      ra.pts += p.a; rb.pts += p.b;
      if (sc.a > sc.b) { ra.wins++; rb.losses++; }
      else if (sc.b > sc.a) { rb.wins++; ra.losses++; }
    });
    var arr = Object.keys(rows).map(function (k) { return rows[k]; });
    arr.sort(cmpStandings);
    arr.forEach(function (r, i) { r.rank = i + 1; });
    return arr;
  }

  function allStandings(numPools, teams, matches) {
    var out = {};
    for (var p = 0; p < numPools; p++) {
      var L = poolLabel(p);
      out[L] = poolStandings(L, teams, matches);
    }
    return out;
  }

  // Nombre de rencontres de poule validées / total (pour l'avancement).
  function poolProgress(numPools, matches, poolSize) {
    var total = numPools * roundRobinPairs(poolSize || 4).length;
    var done = matches.filter(function (m) {
      return m.phase === 'pool' && m.validated;
    }).length;
    return { done: done, total: total, complete: done >= total };
  }

  /* ---- Qualification & têtes de série ------------------------------ */

  function nextPow2AtLeast(n) { var p = 1; while (p < n) p *= 2; return p; }

  // Taille du tableau : plus petite puissance de 2 >= (qualifiés/poule) × poules.
  // Défaut 2/poule : 6 poules -> 16 (1/8) ; 8 -> 16 ; 5 -> 16.
  // 2/poule avec 4 poules -> 8 (1/4) ; 3/poule avec 4 poules -> 16 ; etc.
  function bracketSizeFor(numPools, qualPerPool) {
    return nextPow2AtLeast(Math.max(2, (qualPerPool || 2) * numPools));
  }

  // Plan du tableau pour une config donnée, pour savoir si elle « tombe juste »
  // (tableau rempli, sans exempt). Les repêchés disponibles = les
  // (qualPerPool+1)èmes, soit une équipe par poule si la poule est assez grande.
  function bracketPlan(numPools, poolSize, qualPerPool) {
    qualPerPool = qualPerPool || 2;
    var directs = qualPerPool * numPools;
    var size = bracketSizeFor(numPools, qualPerPool);
    var available = (poolSize > qualPerPool) ? numPools : 0;
    var need = Math.max(0, size - directs);
    var repechageUsed = Math.min(need, available);
    var byes = size - directs - repechageUsed;
    return {
      size: size, directs: directs, available: available,
      repechageNeeded: need, repechageUsed: repechageUsed,
      byes: byes, clean: byes === 0, repechageRank: qualPerPool + 1
    };
  }
  // Valeurs de « qualifiés par poule » qui donnent un tableau propre (sans
  // exempt) pour ce nombre de poules et cette taille de poule.
  function validQualsFor(numPools, poolSize) {
    var out = [];
    for (var q = 1; q <= poolSize; q++) {
      if (bracketPlan(numPools, poolSize, q).clean) out.push(q);
    }
    return out;
  }

  // Détermine les qualifiés à partir des classements de poules.
  // `qualPerPool` : nombre d'équipes qualifiées d'office par poule (défaut 2).
  // Si (qualPerPool × poules) n'est pas une puissance de 2, on complète le
  // tableau avec les meilleurs (qualPerPool+1)èmes (repêchés).
  function qualifiers(numPools, standings, qualPerPool) {
    qualPerPool = qualPerPool || 2;
    var size = bracketSizeFor(numPools, qualPerPool);
    function rankList(idx) {
      var a = [];
      for (var p = 0; p < numPools; p++) {
        var s = standings[poolLabel(p)] || [];
        if (s[idx]) a.push(s[idx]);
      }
      a.sort(cmpStandings);
      return a;
    }
    var byRank = [];
    for (var k = 0; k < qualPerPool; k++) byRank.push(rankList(k));
    var directs = [];
    byRank.forEach(function (lst) { directs = directs.concat(lst); });
    var allRepechage = rankList(qualPerPool); // les (qualPerPool+1)èmes
    var need = Math.max(0, size - directs.length);
    var repechage = allRepechage.slice(0, need);
    var seeds = directs.concat(repechage); // ordre des têtes de série
    return {
      size: size, qualPerPool: qualPerPool,
      byRank: byRank, seeds: seeds,
      repechage: repechage, allRepechage: allRepechage,
      repechageNeeded: need, repechageRank: qualPerPool + 1,
      // alias de compatibilité (cas 2/poule : repêchés = 3es)
      winners: byRank[0] || [], runners: byRank[1] || [],
      thirds: repechage, allThirds: allRepechage, thirdsNeeded: need
    };
  }

  /* ---- Construction du tableau ------------------------------------- */

  // Ordre standard des têtes de série pour un tableau à n places.
  // Renvoie, pour chaque position du tableau, l'index (0-based) de la tête
  // de série qui l'occupe (1 vs n, 2 vs n-1, ... répartis classiquement).
  function standardSeedPositions(n) {
    var rounds = Math.round(Math.log2(n));
    var arr = [1, 2];
    for (var r = 1; r < rounds; r++) {
      var m = arr.length * 2 + 1;
      var next = [];
      for (var i = 0; i < arr.length; i++) { next.push(arr[i]); next.push(m - arr[i]); }
      arr = next;
    }
    return arr.map(function (x) { return x - 1; });
  }

  /* ---- Répartition en poules (tailles variables) ------------------- */

  // Répartit `total` équipes en `numPools` poules aussi équilibrées que
  // possible. Ex. 22 en 4 poules -> [6, 6, 5, 5].
  function poolSizesFor(total, numPools) {
    var base = Math.floor(total / numPools), rem = total % numPools, sizes = [];
    for (var p = 0; p < numPools; p++) sizes.push(base + (p < rem ? 1 : 0));
    return sizes;
  }

  // À partir d'une liste de noms déjà mélangée et d'un nombre de poules,
  // construit les équipes placées + les matchs de poule (round-robin par
  // poule, tailles variables). `roster` : [{ id, name }].
  function buildPoolDraw(roster, numPools, nowTs) {
    nowTs = nowTs || Date.now();
    var sizes = poolSizesFor(roster.length, numPools);
    var teams = [], matches = [], idx = 0;
    for (var p = 0; p < numPools; p++) {
      var L = poolLabel(p);
      for (var s = 1; s <= sizes[p]; s++) {
        var r = roster[idx++];
        teams.push({ id: L + s, pool: L, slot: s, name: r.name, rid: r.id, assigned: true, assignedAt: nowTs });
      }
      scheduledPairs(sizes[p]).forEach(function (pair) {
        matches.push({
          id: 'pool-' + L + '-' + pair[0] + '-' + pair[1],
          phase: 'pool', pool: L, slotA: pair[0], slotB: pair[1],
          teamA: L + pair[0], teamB: L + pair[1],
          target: POOL_TARGET, proposal: null, validated: false
        });
      });
    }
    return { teams: teams, matches: matches, sizes: sizes };
  }

  /* ---- Qualification par tour de départ choisi --------------------- */

  // Toutes les équipes classées par priorité de qualification :
  // tous les 1ers de poule (triés entre eux), puis tous les 2es, etc.
  function allSeeds(numPools, standings) {
    var maxRank = 0;
    for (var p = 0; p < numPools; p++) {
      var s = standings[poolLabel(p)] || [];
      if (s.length > maxRank) maxRank = s.length;
    }
    var seeds = [];
    for (var r = 0; r < maxRank; r++) {
      var tier = [];
      for (var p2 = 0; p2 < numPools; p2++) {
        var s2 = standings[poolLabel(p2)] || [];
        if (s2[r]) tier.push(s2[r]);
      }
      tier.sort(cmpStandings);
      seeds = seeds.concat(tier);
    }
    return seeds;
  }

  // Qualifie les `bracketSize` meilleures équipes (par priorité de rang)
  // pour remplir un tableau de cette taille. rankCounts : combien de 1ers,
  // 2es, 3es… sont qualifiés (pour l'affichage).
  function qualifyFor(numPools, standings, bracketSize) {
    var all = allSeeds(numPools, standings);
    var seeds = all.slice(0, bracketSize);
    var rankCounts = {};
    seeds.forEach(function (r) { rankCounts[r.rank] = (rankCounts[r.rank] || 0) + 1; });
    return { size: bracketSize, seeds: seeds, rankCounts: rankCounts, available: all.length };
  }

  // Tailles de tableau possibles (puissances de 2, de 2 jusqu'à <= total).
  function validBracketSizes(total) {
    var out = [], s = 2;
    while (s <= total) { out.push(s); s *= 2; }
    return out;
  }

  // Place les qualifiés dans les positions du tableau.
  // Ordre des têtes : 1ers de poule (classés), puis 2es, puis 3es…
  // Le placement standard fait que, au 1er tour :
  //   • deux 1ers de poule ne se rencontrent jamais ;
  //   • les 1ers tombent en priorité sur une équipe moins bien classée.
  // Contrainte supplémentaire : deux équipes d'une même poule ne se
  // rencontrent jamais au 1er tour (réparée par échanges de positions, sans
  // jamais créer d'affrontement entre deux 1ers).
  // `bracketSize` : taille du tableau choisie (puissance de 2).
  // Renvoie { size, slots:[teamId|null …] } (par position de tableau).
  function seedBracket(numPools, standings, bracketSize) {
    var q = qualifyFor(numPools, standings, bracketSize);
    var seeds = q.seeds; // déjà ordonnés : 1ers, puis 2es, …
    var order = seeds.map(function (r) { return r.teamId; });
    var pools = seeds.map(function (r) { return r.pool; });
    var ranks = seeds.map(function (r) { return r.rank; }); // rang de poule (1 = 1er)
    while (order.length < bracketSize) { order.push(null); pools.push(null); ranks.push(0); } // byes

    var pos = standardSeedPositions(bracketSize);
    var slots = new Array(bracketSize);
    var slotPool = new Array(bracketSize);
    var slotRank = new Array(bracketSize);
    for (var i = 0; i < bracketSize; i++) {
      slots[i] = order[pos[i]]; slotPool[i] = pools[pos[i]]; slotRank[i] = ranks[pos[i]];
    }

    // « Jamais deux 1ers » n'a de sens que si on peut les séparer (assez
    // d'équipes moins bien classées). Sinon on ne garde que la contrainte
    // de poule.
    var nbFirsts = 0;
    for (var f = 0; f < ranks.length; f++) if (ranks[f] === 1) nbFirsts++;
    var avoidTwoFirsts = (nbFirsts * 2 <= bracketSize);
    avoidSamePoolFirstRound(slots, slotPool, slotRank, avoidTwoFirsts);
    return { size: bracketSize, slots: slots, seededAt: Date.now() };
  }

  // Échange des positions du 1er tour pour qu'aucun match n'oppose deux
  // équipes de la même poule — ni deux 1ers de poule. Le placement standard
  // n'oppose jamais deux 1ers ; on veille à ne pas en créer en réparant les
  // conflits de poule. Faisable tant qu'aucune poule ne fournit plus de la
  // moitié des qualifiés (toujours vrai ici : 3 max par poule).
  function avoidSamePoolFirstRound(slots, slotPool, slotRank, avoidTwoFirsts) {
    var matches = slots.length / 2;
    function conflict(k) {
      var pa = slotPool[2 * k], pb = slotPool[2 * k + 1];
      var ra = slotRank[2 * k], rb = slotRank[2 * k + 1];
      var samePool = pa != null && pb != null && pa === pb;
      var twoFirsts = avoidTwoFirsts && ra === 1 && rb === 1;
      return samePool || twoFirsts;
    }
    function swap(x, y) {
      var t = slots[x]; slots[x] = slots[y]; slots[y] = t;
      var u = slotPool[x]; slotPool[x] = slotPool[y]; slotPool[y] = u;
      var v = slotRank[x]; slotRank[x] = slotRank[y]; slotRank[y] = v;
    }
    // Plusieurs passes pour absorber d'éventuelles cascades.
    for (var pass = 0; pass < slots.length; pass++) {
      var conflicts = 0;
      for (var k = 0; k < matches; k++) {
        if (!conflict(k)) continue;
        conflicts++;
        var fixed = false;
        // On tente d'échanger l'une des deux positions du match k avec une
        // position d'un autre match, sans créer de nouveau conflit.
        var here = [2 * k, 2 * k + 1];
        for (var hi = 0; hi < 2 && !fixed; hi++) {
          for (var j = 0; j < matches && !fixed; j++) {
            if (j === k) continue;
            for (var off = 0; off < 2 && !fixed; off++) {
              var there = 2 * j + off;
              swap(here[hi], there);
              if (!conflict(k) && !conflict(j)) fixed = true;
              else swap(here[hi], there); // annule
            }
          }
        }
      }
      if (conflicts === 0) break;
    }
  }

  /* ---- Résolution du tableau (gagnants, tours suivants) ------------ */

  var ROUND_BY_TEAMS = { 64: 'r64', 32: 'r32', 16: 'r16', 8: 'qf', 4: 'sf', 2: 'final' };
  var ROUND_LABEL = {
    r64: '1/32 de finale', r32: '1/16 de finale', r16: '1/8 de finale', qf: '1/4 de finale',
    sf: '1/2 finale', final: 'Finale', p3: 'Petite finale (3e place)'
  };
  function roundLabel(key) { return ROUND_LABEL[key] || key; }

  function winnerOf(match, a, b) {
    var sc = scoreOf(match);
    if (!a || !b || !sc) return null;
    if (sc.a === sc.b) return null;
    return sc.a > sc.b ? a : b;
  }
  function loserOf(match, a, b) {
    var w = winnerOf(match, a, b);
    if (!w) return null;
    return w === a ? b : a;
  }

  // Cible d'un tour : 2000 pts pour la finale, 1500 pour tous les autres.
  function roundTarget(key) { return key === 'final' ? KO_BIG_TARGET : POOL_TARGET; }

  // Construit l'état complet du tableau à partir des scores enregistrés.
  // results : map matchId -> matchDoc ({ proposal, validated, target, ... }).
  // Tous les matchs sont des matchs secs (pas d'aller-retour).
  function resolveBracket(bracket, teams, results) {
    results = results || {};
    var size = bracket.size;
    var rounds = [];
    var current = bracket.slots.slice();  // teamIds par position (tour 1)
    var teamsIn = size;
    var rIdx = 0;
    var sfLosers = null;
    var champion = null, finalInfo = null;

    while (teamsIn >= 2) {
      var key = ROUND_BY_TEAMS[teamsIn] || ('t' + teamsIn);
      var target = roundTarget(key);
      var matches = [];
      var nextParticipants = [];
      for (var k = 0; k < teamsIn / 2; k++) {
        var ta = current[2 * k], tb = current[2 * k + 1];
        var id = key + '-' + k;
        var res = results[id] || null;
        // Exempt (bye) au 1er tour : l'équipe présente passe d'office.
        var bye = (rIdx === 0) && ((ta && !tb) || (tb && !ta));
        var w = bye ? (ta || tb) : winnerOf(res, ta, tb);
        matches.push({
          id: id, key: key, index: k, target: target, bestOf: 1,
          teamA: ta, teamB: tb, result: res, winner: w, bye: bye,
          loser: bye ? null : loserOf(res, ta, tb)
        });
        nextParticipants.push(w);
      }
      rounds.push({ key: key, teamsIn: teamsIn, target: target, bestOf: 1, matches: matches });
      if (teamsIn === 4) sfLosers = matches.map(function (mm) { return mm.loser; });
      if (teamsIn === 2) { finalInfo = matches[0]; champion = matches[0].winner; }
      current = nextParticipants;
      teamsIn = teamsIn / 2;
      rIdx++;
    }

    // Petite finale (3e place) entre les 2 perdants de 1/2 : match sec en 2000.
    var thirdPlace = null;
    if (sfLosers) {
      var la = sfLosers[0], lb = sfLosers[1];
      var res3 = results['p3'] || null;
      thirdPlace = {
        id: 'p3', key: 'p3', target: KO_BIG_TARGET, bestOf: 1,
        teamA: la, teamB: lb, result: res3,
        winner: winnerOf(res3, la, lb), loser: loserOf(res3, la, lb)
      };
    }
    return { rounds: rounds, thirdPlace: thirdPlace, size: size,
             champion: champion, final: finalInfo };
  }

  // Liste plate de tous les identifiants de matchs d'un tableau (pour la
  // saisie / validation), avec leurs équipes courantes.
  function bracketMatchList(resolved) {
    var list = [];
    resolved.rounds.forEach(function (rd) {
      rd.matches.forEach(function (m) {
        list.push({ id: m.id, key: m.key, teamA: m.teamA, teamB: m.teamB, target: m.target });
      });
    });
    if (resolved.thirdPlace) {
      var tp = resolved.thirdPlace;
      list.push({ id: 'p3', key: 'p3', teamA: tp.teamA, teamB: tp.teamB, target: tp.target });
    }
    return list;
  }

  global.BeloteLogic = {
    POOL_TARGET: POOL_TARGET, KO_BIG_TARGET: KO_BIG_TARGET, POOL_PAIRS: POOL_PAIRS,
    poolLabel: poolLabel, poolIndex: poolIndex,
    makeTeams: makeTeams, makePoolMatches: makePoolMatches, roundRobinPairs: roundRobinPairs,
    scheduledPairs: scheduledPairs, poolMatchOrder: poolMatchOrder,
    makeKoTeams: makeKoTeams, koBracket: koBracket,
    matchPoints: matchPoints, scoreOf: scoreOf,
    poolStandings: poolStandings, allStandings: allStandings, poolProgress: poolProgress,
    cmpStandings: cmpStandings,
    bracketSizeFor: bracketSizeFor, bracketPlan: bracketPlan, validQualsFor: validQualsFor,
    qualifiers: qualifiers,
    poolSizesFor: poolSizesFor, buildPoolDraw: buildPoolDraw,
    allSeeds: allSeeds, qualifyFor: qualifyFor, validBracketSizes: validBracketSizes,
    standardSeedPositions: standardSeedPositions, seedBracket: seedBracket,
    resolveBracket: resolveBracket, bracketMatchList: bracketMatchList,
    winnerOf: winnerOf, roundLabel: roundLabel
  };
})(typeof window !== 'undefined' ? window : this);
