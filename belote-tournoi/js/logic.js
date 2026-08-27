/* logic.js — Règles du tournoi de belote.
 *
 * Fonctions pures (aucune dépendance réseau) : classement des poules,
 * calcul des points, goal-average, qualification et construction du tableau
 * final. Facile à tester en isolation.
 */
(function (global) {
  'use strict';

  var POOL_TARGET = 1500;   // objectif des poules et des 1/8, 1/4
  var KO_BIG_TARGET = 2000; // 1/2, petite finale et finale

  /* ---- Poules ------------------------------------------------------ */

  // 0 -> 'A', 1 -> 'B', ...
  function poolLabel(i) { return String.fromCharCode(65 + i); }
  function poolIndex(label) { return (label || 'A').charCodeAt(0) - 65; }

  // Liste des 4×n slots d'équipes (vides) pour n poules.
  function makeTeams(numPools) {
    var teams = [];
    for (var p = 0; p < numPools; p++) {
      for (var s = 1; s <= 4; s++) {
        teams.push({
          id: poolLabel(p) + s, pool: poolLabel(p), slot: s,
          name: '', assigned: false
        });
      }
    }
    return teams;
  }

  // Les 6 rencontres d'une poule de 4 (chacun rencontre les 3 autres).
  var POOL_PAIRS = [[1, 2], [3, 4], [1, 3], [2, 4], [1, 4], [2, 3]];

  function makePoolMatches(numPools) {
    var matches = [];
    for (var p = 0; p < numPools; p++) {
      var L = poolLabel(p);
      POOL_PAIRS.forEach(function (pair) {
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

  /* ---- Points d'un match de poule ---------------------------------- */

  // Victoire = 1 pt ; victoire « au double » (vainqueur >= 2× perdant) = 2 pts ;
  // défaite = 0. (Une égalité parfaite ne rapporte rien : impossible à 1500.)
  function matchPoints(scoreA, scoreB) {
    if (scoreA == null || scoreB == null) return { a: 0, b: 0 };
    if (scoreA === scoreB) return { a: 0, b: 0 };
    var aWins = scoreA > scoreB;
    var winner = aWins ? scoreA : scoreB;
    var loser = aWins ? scoreB : scoreA;
    var pts = (winner >= 2 * loser) ? 2 : 1;
    return aWins ? { a: pts, b: 0 } : { a: 0, b: pts };
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
  function poolProgress(numPools, matches) {
    var total = numPools * POOL_PAIRS.length;
    var done = matches.filter(function (m) {
      return m.phase === 'pool' && m.validated;
    }).length;
    return { done: done, total: total, complete: done >= total };
  }

  /* ---- Qualification & têtes de série ------------------------------ */

  function nextPow2AtLeast(n) { var p = 1; while (p < n) p *= 2; return p; }

  // Taille du tableau : plus petite puissance de 2 >= 2 × nb de poules.
  // 6 poules -> 16 (1/8 de finale) ; 8 poules -> 16 ; 5 poules -> 16 ; etc.
  function bracketSizeFor(numPools) { return nextPow2AtLeast(2 * numPools); }

  // Détermine les qualifiés à partir des classements de poules.
  function qualifiers(numPools, standings) {
    var size = bracketSizeFor(numPools);
    var winners = [], runners = [], allThirds = [];
    for (var p = 0; p < numPools; p++) {
      var s = standings[poolLabel(p)] || [];
      if (s[0]) winners.push(s[0]);
      if (s[1]) runners.push(s[1]);
      if (s[2]) allThirds.push(s[2]);
    }
    winners.sort(cmpStandings);
    runners.sort(cmpStandings);
    allThirds.sort(cmpStandings);
    var need = size - winners.length - runners.length;
    var thirds = allThirds.slice(0, Math.max(0, need));
    return { size: size, winners: winners, runners: runners,
             thirds: thirds, allThirds: allThirds, thirdsNeeded: Math.max(0, need) };
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

  // Place les qualifiés dans les positions du tableau.
  // Ordre des têtes : 1ers de poule (classés), puis 2es, puis meilleurs 3es.
  // Contrainte : au 1er tour, deux équipes d'une même poule ne se rencontrent
  // jamais (réparation par échanges de positions après le placement standard).
  // Renvoie { size, slots:[teamId|null …] } (par position de tableau).
  function seedBracket(numPools, standings) {
    var q = qualifiers(numPools, standings);
    var seeds = q.winners.concat(q.runners).concat(q.thirds); // rangs -> lignes
    var order = seeds.map(function (r) { return r.teamId; });
    var pools = seeds.map(function (r) { return r.pool; });
    while (order.length < q.size) { order.push(null); pools.push(null); } // byes

    var pos = standardSeedPositions(q.size);
    var slots = new Array(q.size);
    var slotPool = new Array(q.size);
    for (var i = 0; i < q.size; i++) { slots[i] = order[pos[i]]; slotPool[i] = pools[pos[i]]; }

    avoidSamePoolFirstRound(slots, slotPool);
    return { size: q.size, slots: slots, seededAt: Date.now() };
  }

  // Échange des positions du 1er tour pour qu'aucun match n'oppose deux
  // équipes de la même poule. Faisable tant qu'aucune poule ne fournit plus
  // de la moitié des qualifiés (toujours vrai ici : 3 max par poule).
  function avoidSamePoolFirstRound(slots, slotPool) {
    var matches = slots.length / 2;
    function samePool(k) {
      var a = slotPool[2 * k], b = slotPool[2 * k + 1];
      return a != null && b != null && a === b;
    }
    function swap(x, y) {
      var t = slots[x]; slots[x] = slots[y]; slots[y] = t;
      var u = slotPool[x]; slotPool[x] = slotPool[y]; slotPool[y] = u;
    }
    // Plusieurs passes pour absorber d'éventuelles cascades.
    for (var pass = 0; pass < slots.length; pass++) {
      var conflicts = 0;
      for (var k = 0; k < matches; k++) {
        if (!samePool(k)) continue;
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
              if (!samePool(k) && !samePool(j)) fixed = true;
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

  // Gagnant d'une finale au meilleur des 3 (aller/retour/belle).
  function finalWinner(legs, a, b) {
    if (!a || !b) return { winner: null, winsA: 0, winsB: 0, needBelle: false };
    var winsA = 0, winsB = 0;
    legs.forEach(function (leg) {
      var w = winnerOf(leg, a, b);
      if (w === a) winsA++; else if (w === b) winsB++;
    });
    var winner = winsA >= 2 ? a : (winsB >= 2 ? b : null);
    var needBelle = !winner && winsA === 1 && winsB === 1;
    return { winner: winner, winsA: winsA, winsB: winsB, needBelle: needBelle };
  }

  // Construit l'état complet du tableau à partir des scores enregistrés.
  // results : map matchId -> matchDoc ({ proposal, validated, target, ... }).
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
      if (teamsIn === 2) {
        // Finale : au meilleur des 3.
        var a = current[0], b = current[1];
        var legs = ['final-0', 'final-1', 'final-2'].map(function (id) {
          return results[id] || null;
        });
        var fw = finalWinner(legs, a, b);
        finalInfo = {
          key: 'final', teamsIn: 2, target: KO_BIG_TARGET, bestOf: 3,
          teamA: a, teamB: b, legs: legs, winsA: fw.winsA, winsB: fw.winsB,
          needBelle: fw.needBelle, winner: fw.winner
        };
        rounds.push(finalInfo);
        champion = fw.winner;
        break;
      }
      var target = teamsIn <= 4 ? KO_BIG_TARGET : POOL_TARGET;
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
      current = nextParticipants;
      teamsIn = teamsIn / 2;
      rIdx++;
    }

    // Petite finale (3e place) entre les 2 perdants de 1/2.
    var thirdPlace = null;
    if (sfLosers) {
      var res3 = results['p3'] || null;
      var la = sfLosers[0], lb = sfLosers[1];
      thirdPlace = {
        id: 'p3', key: 'p3', target: KO_BIG_TARGET, bestOf: 1,
        teamA: la, teamB: lb, result: res3, winner: winnerOf(res3, la, lb)
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
      if (rd.key === 'final') {
        for (var i = 0; i < 3; i++) {
          list.push({ id: 'final-' + i, key: 'final', leg: i,
            teamA: rd.teamA, teamB: rd.teamB, target: rd.target });
        }
      } else {
        rd.matches.forEach(function (m) {
          list.push({ id: m.id, key: m.key, teamA: m.teamA, teamB: m.teamB, target: m.target });
        });
      }
    });
    if (resolved.thirdPlace) {
      list.push({ id: 'p3', key: 'p3', teamA: resolved.thirdPlace.teamA,
        teamB: resolved.thirdPlace.teamB, target: resolved.thirdPlace.target });
    }
    return list;
  }

  global.BeloteLogic = {
    POOL_TARGET: POOL_TARGET, KO_BIG_TARGET: KO_BIG_TARGET, POOL_PAIRS: POOL_PAIRS,
    poolLabel: poolLabel, poolIndex: poolIndex,
    makeTeams: makeTeams, makePoolMatches: makePoolMatches,
    matchPoints: matchPoints, scoreOf: scoreOf,
    poolStandings: poolStandings, allStandings: allStandings, poolProgress: poolProgress,
    cmpStandings: cmpStandings,
    bracketSizeFor: bracketSizeFor, qualifiers: qualifiers,
    standardSeedPositions: standardSeedPositions, seedBracket: seedBracket,
    resolveBracket: resolveBracket, bracketMatchList: bracketMatchList,
    winnerOf: winnerOf, finalWinner: finalWinner, roundLabel: roundLabel
  };
})(typeof window !== 'undefined' ? window : this);
