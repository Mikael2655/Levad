/* logic.js — Règles du tournoi de belote.
 *
 * Fonctions pures (aucune dépendance réseau) : classement des poules,
 * calcul des points, goal-average, qualification et construction du tableau
 * final. Facile à tester en isolation.
 */
(function (global) {
  'use strict';

  var POOL_TARGET = 1500;   // cible de tous les matchs (poules et phase finale)
  var KO_BIG_TARGET = 2000; // (obsolète) ancienne cible finale ; conservé pour compat.

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

  // Carte id -> document pour les matchs de poule (manches comprises).
  function poolResultsMap(matches) {
    var m = {};
    (matches || []).forEach(function (x) { if (x && x.phase === 'pool') m[x.id] = x; });
    return m;
  }
  // Rencontres (round-robin) d'une poule, résolues en manches selon la config.
  function poolEncounters(pool, teams, map, rules) {
    var members = teams.filter(function (t) { return t.pool === pool && t.assigned; });
    var size = members.length;
    var fmt = fmtFor(rules, 'pool'), target = targetFor(rules, 'pool');
    return scheduledPairs(size).map(function (pair) {
      var id = 'pool-' + pool + '-' + pair[0] + '-' + pair[1];
      var enc = resolveEncounter(id, pool + pair[0], pool + pair[1], fmt, target, map, false);
      enc.pool = pool; enc.slotA = pair[0]; enc.slotB = pair[1];
      return enc;
    });
  }
  // Liste plate des MANCHES actives des poules (pour la saisie), analogue à
  // bracketMatchList.
  function poolMatchList(numPools, teams, matches, rules) {
    var map = poolResultsMap(matches), list = [];
    for (var p = 0; p < numPools; p++) {
      poolEncounters(poolLabel(p), teams, map, rules).forEach(function (enc) {
        enc.manches.forEach(function (mm) {
          list.push({ id: mm.id, pool: enc.pool, slotA: enc.slotA, slotB: enc.slotB,
            teamA: enc.teamA, teamB: enc.teamB, target: mm.target,
            manche: mm.single ? null : mm.no, belle: mm.belle, key: 'pool' });
        });
      });
    }
    return list;
  }

  function poolStandings(pool, teams, matches, rules) {
    var rows = {};
    teams.filter(function (t) { return t.pool === pool; }).forEach(function (t) {
      rows[t.id] = {
        teamId: t.id, pool: pool, slot: t.slot, team: t,
        played: 0, wins: 0, draws: 0, losses: 0, pts: 0, pf: 0, pa: 0, ga: 0
      };
    });
    var map = poolResultsMap(matches);
    poolEncounters(pool, teams, map, rules).forEach(function (enc) {
      var ra = rows[enc.teamA], rb = rows[enc.teamB];
      if (!ra || !rb || !enc.decided) return;
      // Points marqués / encaissés : somme des manches jouées.
      var pfa = 0, pfb = 0;
      enc.raw.forEach(function (sc) { if (sc) { pfa += sc.a; pfb += sc.b; } });
      ra.played++; rb.played++;
      ra.pf += pfa; ra.pa += pfb; ra.ga = ra.pf - ra.pa;
      rb.pf += pfb; rb.pa += pfa; rb.ga = rb.pf - rb.pa;
      // Points de classement : rubicon seulement en format sec, sinon 1 pt/victoire.
      if (enc.fmt.mode === 'single') {
        var sc0 = enc.raw[0], p = matchPoints(sc0.a, sc0.b);
        ra.pts += p.a; rb.pts += p.b;
      } else if (enc.winner === enc.teamA) ra.pts += 1;
      else if (enc.winner === enc.teamB) rb.pts += 1;
      if (enc.winner === enc.teamA) { ra.wins++; rb.losses++; }
      else if (enc.winner === enc.teamB) { rb.wins++; ra.losses++; }
    });
    var arr = Object.keys(rows).map(function (k) { return rows[k]; });
    arr.sort(cmpStandings);
    arr.forEach(function (r, i) { r.rank = i + 1; });
    return arr;
  }

  function allStandings(numPools, teams, matches, rules) {
    var out = {};
    for (var p = 0; p < numPools; p++) {
      var L = poolLabel(p);
      out[L] = poolStandings(L, teams, matches, rules);
    }
    return out;
  }

  // Avancement des poules (rencontres tranchées / total), selon la config.
  function poolProgress(numPools, teams, matches, rules) {
    var done = 0, total = 0;
    for (var p = 0; p < numPools; p++) {
      poolEncounters(poolLabel(p), teams, poolResultsMap(matches), rules).forEach(function (enc) {
        total++; if (enc.decided) done++;
      });
    }
    return { done: done, total: total, complete: total > 0 && done >= total };
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

    separatePoolsInBracket(slots, slotPool, slotRank);
    return { size: bracketSize, slots: slots, seededAt: Date.now() };
  }

  // Tour auquel se rencontrent deux positions du tableau (1 = 1er tour,
  // log2(N) = finale) : longueur binaire de (i XOR j).
  function meetRound(i, j) { var x = i ^ j, r = 0; while (x) { x >>= 1; r++; } return r; }

  // Répartit les équipes dans le tableau pour que deux équipes d'une même
  // poule se rencontrent le **plus tard possible** (idéalement seulement en
  // finale — donc dans des moitiés opposées). On n'échange que des positions
  // de **même rang** : la structure des têtes de série est préservée (1ers
  // contre équipes moins bien classées, pas de 1er-1er au 1er tour).
  function separatePoolsInBracket(slots, slotPool, slotRank) {
    var N = slots.length;
    var finalRound = 0, t = N; while (t > 1) { t >>= 1; finalRound++; }
    // Coût : chaque paire de même poule qui se rencontre avant la finale est
    // pénalisée, d'autant plus lourdement que la rencontre est précoce.
    function cost() {
      var c = 0;
      for (var i = 0; i < N; i++) {
        var pi = slotPool[i]; if (pi == null) continue;
        for (var j = i + 1; j < N; j++) {
          if (slotPool[j] === pi) {
            var mr = meetRound(i, j);
            if (mr < finalRound) c += (1 << (finalRound - mr));
          }
        }
      }
      return c;
    }
    function swap(x, y) {
      var a = slots[x]; slots[x] = slots[y]; slots[y] = a;
      var b = slotPool[x]; slotPool[x] = slotPool[y]; slotPool[y] = b;
      var d = slotRank[x]; slotRank[x] = slotRank[y]; slotRank[y] = d;
    }
    // Descente locale : on échange deux positions de même rang si ça réduit
    // le coût ; on recommence jusqu'à l'optimum local (ou coût nul).
    for (var guard = 0; guard < 1000; guard++) {
      var base = cost();
      if (base === 0) break;
      var improved = false;
      for (var i = 0; i < N && !improved; i++) {
        for (var j = i + 1; j < N && !improved; j++) {
          if (slotRank[i] !== slotRank[j] || slotPool[i] === slotPool[j]) continue;
          swap(i, j);
          if (cost() < base) improved = true;
          else swap(i, j);
        }
      }
      if (!improved) break;
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

  // Formats de rencontre (identiques en poule et en tableau) :
  //   • single : 1 match sec. En poule, barème avec rubicon.
  //   • diff   : 2 manches ; si 1 manche partout, départage à la DIFFÉRENCE de
  //              points cumulée.
  //   • belle  : aller-retour (2 manches) + « belle » (3e manche) si 1 partout.
  var FORMATS = {
    single: { base: 1, belle: false, mode: 'single', label: 'Match sec' },
    diff:   { base: 2, belle: false, mode: 'diff',   label: '2 manches (différence de points)' },
    belle:  { base: 2, belle: true,  mode: 'belle',  label: 'Aller-retour + belle si nécessaire' }
  };
  function formatByKey(fk) { return FORMATS[fk] || FORMATS.single; }
  // Format par défaut d'une phase si rien n'est configuré par l'admin.
  function defaultFormatKey(roundKey) {
    if (roundKey === 'final' || roundKey === 'p3') return 'belle';
    if (roundKey === 'qf' || roundKey === 'sf') return 'diff';
    return 'single'; // poule, 1/8, 1/16, 1/32
  }
  // Règle effective (points + format) d'une phase, en fusionnant la config admin.
  function ruleFor(rules, roundKey) {
    var r = (rules && rules[roundKey]) || {};
    return {
      target: (r.target != null ? r.target : POOL_TARGET),
      format: r.format || defaultFormatKey(roundKey)
    };
  }
  function fmtFor(rules, roundKey) { return formatByKey(ruleFor(rules, roundKey).format); }
  function targetFor(rules, roundKey) { return ruleFor(rules, roundKey).target; }
  function roundTarget() { return POOL_TARGET; } // compat
  function koFormat(key, rules) { return fmtFor(rules, key); }

  // Identifiant de la manche n (1..) d'une rencontre. Une rencontre à une seule
  // manche (format sec) garde l'identifiant de la rencontre (compatibilité).
  function mancheId(matchId, fmt, n) {
    return (fmt.base === 1 && !fmt.belle) ? matchId : (matchId + '_m' + n);
  }
  // Décide une rencontre à partir des scores de ses manches.
  // mancheScores : tableau de { a, b } (ou null) pour manche 1..N (belle en 3).
  function decideEncounter(fmt, teamA, teamB, mancheScores) {
    function wi(sc) { return !sc ? 0 : (sc.a > sc.b ? 1 : (sc.b > sc.a ? 2 : 0)); } // 1=A,2=B
    if (fmt.mode === 'single') {
      var w = wi(mancheScores[0]);
      return { fmt: fmt, winner: w === 1 ? teamA : (w === 2 ? teamB : null),
               wonA: w === 1 ? 1 : 0, wonB: w === 2 ? 1 : 0, manchesActive: 1 };
    }
    var s1 = mancheScores[0], s2 = mancheScores[1];
    var w1 = wi(s1), w2 = wi(s2);
    var wonA = (w1 === 1 ? 1 : 0) + (w2 === 1 ? 1 : 0);
    var wonB = (w1 === 2 ? 1 : 0) + (w2 === 2 ? 1 : 0);
    var bothIn = !!(s1 && s2);
    if (fmt.mode === 'diff') {
      var winner = null;
      if (bothIn) {
        if (wonA > wonB) winner = teamA;
        else if (wonB > wonA) winner = teamB;
        else { var d = (s1.a + s2.a) - (s1.b + s2.b); winner = d > 0 ? teamA : (d < 0 ? teamB : null); }
      }
      return { fmt: fmt, winner: winner, wonA: wonA, wonB: wonB, manchesActive: 2 };
    }
    // belle : au meilleur des 3
    if (wonA === 2) return { fmt: fmt, winner: teamA, wonA: 2, wonB: 0, manchesActive: 2 };
    if (wonB === 2) return { fmt: fmt, winner: teamB, wonA: 0, wonB: 2, manchesActive: 2 };
    if (bothIn && wonA === 1 && wonB === 1) {
      var s3 = mancheScores[2], w3 = wi(s3);
      return { fmt: fmt, winner: w3 === 1 ? teamA : (w3 === 2 ? teamB : null),
               wonA: wonA + (w3 === 1 ? 1 : 0), wonB: wonB + (w3 === 2 ? 1 : 0), manchesActive: 3 };
    }
    return { fmt: fmt, winner: null, wonA: wonA, wonB: wonB, manchesActive: 2 };
  }
  // Compat : décision par clé de tour (utilisée par les tests/affichages).
  function decideKo(key, teamA, teamB, mancheScores, rules) {
    return decideEncounter(fmtFor(rules, key), teamA, teamB, mancheScores);
  }
  // Résout une rencontre (poule ou tableau) à partir des scores de ses manches.
  function resolveEncounter(id, teamA, teamB, fmt, target, results, bye) {
    var raw = [], maxN = fmt.base + (fmt.belle ? 1 : 0);
    for (var i = 1; i <= maxN; i++) raw.push(scoreOf(results[mancheId(id, fmt, i)] || null));
    var dec = decideEncounter(fmt, teamA, teamB, raw);
    var winner = bye ? (teamA || teamB) : dec.winner;
    var loser = (winner && teamA && teamB) ? (winner === teamA ? teamB : teamA) : null;
    var manches = [];
    if (!bye && teamA && teamB) {
      for (var j = 1; j <= dec.manchesActive; j++) manches.push({
        id: mancheId(id, fmt, j), no: j, single: fmt.mode === 'single',
        belle: (fmt.belle && j === 3), target: target, score: raw[j - 1] || null });
    }
    return { id: id, teamA: teamA, teamB: teamB, bye: bye, winner: winner, loser: loser,
      wonA: dec.wonA, wonB: dec.wonB, decided: !!winner, fmt: fmt, target: target,
      manches: manches, raw: raw };
  }
  function buildKoMatch(id, key, ta, tb, bye, results, rules) {
    var enc = resolveEncounter(id, ta, tb, fmtFor(rules, key), targetFor(rules, key), results, bye);
    enc.key = key;
    return enc;
  }

  // Construit l'état complet du tableau à partir des scores enregistrés.
  // results : map matchId -> matchDoc. Les manches des matchs à partir des 1/4
  // sont stockées sous des identifiants « <match>~<n> » (manches/belle).
  function resolveBracket(bracket, teams, results, rules) {
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
      var matches = [];
      var nextParticipants = [];
      for (var k = 0; k < teamsIn / 2; k++) {
        var ta = current[2 * k], tb = current[2 * k + 1];
        var id = key + '-' + k;
        // Exempt (bye) au 1er tour : l'équipe présente passe d'office.
        var bye = (rIdx === 0) && ((ta && !tb) || (tb && !ta));
        var mt = buildKoMatch(id, key, ta, tb, bye, results, rules);
        mt.index = k;
        matches.push(mt);
        nextParticipants.push(mt.winner);
      }
      rounds.push({ key: key, teamsIn: teamsIn, target: targetFor(rules, key), matches: matches });
      if (teamsIn === 4) sfLosers = matches.map(function (mm) { return mm.loser; });
      if (teamsIn === 2) { finalInfo = matches[0]; champion = matches[0].winner; }
      current = nextParticipants;
      teamsIn = teamsIn / 2;
      rIdx++;
    }

    // Petite finale (3e place) entre les 2 perdants de 1/2.
    var thirdPlace = null;
    if (sfLosers) {
      thirdPlace = buildKoMatch('p3', 'p3', sfLosers[0], sfLosers[1], false, results, rules);
    }
    return { rounds: rounds, thirdPlace: thirdPlace, size: size,
             champion: champion, final: finalInfo };
  }
  // Liste des clés de tour d'un tableau de taille `size` (du 1er tour à la
  // finale), suivie de 'p3' s'il y a une petite finale (size >= 4).
  function roundKeysForSize(size) {
    var keys = [], t = size;
    while (t >= 2) { keys.push(ROUND_BY_TEAMS[t] || ('t' + t)); t = t / 2; }
    if (size >= 4) keys.push('p3');
    return keys;
  }

  // Liste plate de toutes les MANCHES actives d'un tableau (pour la saisie /
  // validation). Chaque manche est une entrée indépendante (identifiant propre),
  // la « belle » n'apparaît que lorsqu'elle est nécessaire (1 manche partout).
  function bracketMatchList(resolved) {
    var list = [];
    function addFrom(m) {
      m.manches.forEach(function (mm) {
        list.push({ id: mm.id, key: m.key, teamA: m.teamA, teamB: m.teamB,
          target: mm.target, manche: mm.single ? null : mm.no, belle: mm.belle });
      });
    }
    resolved.rounds.forEach(function (rd) { rd.matches.forEach(addFrom); });
    if (resolved.thirdPlace) addFrom(resolved.thirdPlace);
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
    koFormat: koFormat, mancheId: mancheId, decideKo: decideKo,
    decideEncounter: decideEncounter, resolveEncounter: resolveEncounter,
    poolMatchList: poolMatchList, poolEncounters: poolEncounters,
    roundKeysForSize: roundKeysForSize,
    FORMATS: FORMATS, ruleFor: ruleFor, fmtFor: fmtFor, targetFor: targetFor,
    defaultFormatKey: defaultFormatKey,
    winnerOf: winnerOf, roundLabel: roundLabel
  };
})(typeof window !== 'undefined' ? window : this);
