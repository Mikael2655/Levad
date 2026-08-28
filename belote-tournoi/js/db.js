/* db.js — Couche de données.
 *
 * Deux implémentations derrière une même façade :
 *   • « firebase » : Firestore temps réel + authentification anonyme
 *                    (vrai multi-téléphone). Utilisée si config.js est rempli.
 *   • « local »    : localStorage + BroadcastChannel (mode démo, un appareil,
 *                    synchro entre onglets du même navigateur).
 *
 * API commune (toutes les écritures renvoient une Promise) :
 *   DB.init() -> { mode, uid }
 *   DB.watchTournament(tid, cb) / watchTeams / watchMatches  -> unsubscribe()
 *   DB.createTournament(tid, config)
 *   DB.claimRandomTeam(tid, numPools) -> team
 *   DB.updateTeamNames(tid, teamId, captain, partner)
 *   DB.propose(tid, matchId, base, scoreA, scoreB, byTeamId)
 *   DB.validate(tid, matchId)
 *   DB.adminSet(tid, matchId, base, scoreA, scoreB) / adminClear
 *   DB.startBracket(tid, bracket) / setPhase / updateConfig
 *   DB.resetTournament(tid)
 */
(function (global) {
  'use strict';

  var L = global.BeloteLogic;
  var CFG = global.APP_CONFIG;

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function now() { return Date.now(); }

  /* ================================================================= *
   *  Implémentation FIREBASE                                          *
   * ================================================================= */
  function FirebaseDB() {
    this.mode = 'firebase';
    this.uid = null;
  }
  FirebaseDB.prototype.init = function () {
    var self = this;
    firebase.initializeApp(CFG.firebase);
    this.fb = firebase.firestore();
    this.auth = firebase.auth();
    return new Promise(function (resolve, reject) {
      self.auth.onAuthStateChanged(function (user) {
        if (user) { self.uid = user.uid; resolve({ mode: 'firebase', uid: user.uid }); }
      });
      self.auth.signInAnonymously().catch(reject);
    });
  };
  FirebaseDB.prototype._doc = function (tid) {
    return this.fb.collection('tournaments').doc(tid);
  };
  FirebaseDB.prototype.watchTournament = function (tid, cb) {
    return this._doc(tid).onSnapshot(function (snap) {
      cb(snap.exists ? snap.data() : null);
    });
  };
  FirebaseDB.prototype.watchTeams = function (tid, cb) {
    return this._doc(tid).collection('teams').onSnapshot(function (qs) {
      var arr = []; qs.forEach(function (d) { arr.push(d.data()); });
      arr.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
      cb(arr);
    });
  };
  FirebaseDB.prototype.watchMatches = function (tid, cb) {
    return this._doc(tid).collection('matches').onSnapshot(function (qs) {
      var arr = []; qs.forEach(function (d) { arr.push(d.data()); });
      cb(arr);
    });
  };
  FirebaseDB.prototype.createTournament = function (tid, config) {
    var doc = this._doc(tid);
    var isKo = config.format === 'ko';
    var teams = isKo ? L.makeKoTeams(config.numTeams) : L.makeTeams(config.numPools, config.poolSize);
    var matches = isKo ? [] : L.makePoolMatches(config.numPools, config.poolSize);
    var batch = this.fb.batch();
    batch.set(doc, Object.assign({ id: tid, createdAt: now() }, config));
    teams.forEach(function (t) { batch.set(doc.collection('teams').doc(t.id), t); });
    matches.forEach(function (m) { batch.set(doc.collection('matches').doc(m.id), m); });
    return batch.commit();
  };
  FirebaseDB.prototype.listTournaments = function () {
    return this.fb.collection('tournaments').get().then(function (qs) {
      var a = []; qs.forEach(function (d) { a.push(d.data()); });
      a.sort(function (x, y) { return (y.createdAt || 0) - (x.createdAt || 0); });
      return a;
    });
  };
  FirebaseDB.prototype.resetTournament = function (tid) {
    var self = this, doc = this._doc(tid);
    function delAll(col) {
      return doc.collection(col).get().then(function (qs) {
        var b = self.fb.batch();
        qs.forEach(function (d) { b.delete(d.ref); });
        return b.commit();
      });
    }
    return Promise.all([delAll('teams'), delAll('matches')])
      .then(function () { return doc.delete(); });
  };
  // L'admin saisit un nom d'équipe : tirage au sort d'une place libre.
  FirebaseDB.prototype.addTeam = function (tid, name) {
    var self = this, col = this._doc(tid).collection('teams');
    return col.where('assigned', '==', false).get().then(function (free) {
      var ids = shuffle(free.docs.map(function (d) { return d.id; }));
      function tryNext(i) {
        if (i >= ids.length) throw new Error('COMPLET');
        var ref = col.doc(ids[i]);
        return self.fb.runTransaction(function (tx) {
          return tx.get(ref).then(function (d) {
            if (!d.exists || d.data().assigned) return null;
            tx.update(ref, { assigned: true, name: name, assignedAt: now() });
            return Object.assign({}, d.data(), { assigned: true, name: name });
          });
        }).then(function (res) { return res || tryNext(i + 1); });
      }
      return tryNext(0);
    });
  };
  FirebaseDB.prototype.renameTeam = function (tid, teamId, name) {
    return this._doc(tid).collection('teams').doc(teamId).update({ name: name, updatedAt: now() });
  };
  FirebaseDB.prototype.removeTeam = function (tid, teamId) {
    return this._doc(tid).collection('teams').doc(teamId)
      .update({ name: '', assigned: false, assignedAt: null, updatedAt: now() });
  };
  FirebaseDB.prototype.propose = function (tid, matchId, base, sa, sb, byTeamId) {
    return this._doc(tid).collection('matches').doc(matchId).set(Object.assign({}, base, {
      id: matchId,
      proposal: { scoreA: sa, scoreB: sb, byUid: this.uid, byTeamId: byTeamId, at: now() },
      validated: false, validatedByUid: null, updatedAt: now()
    }), { merge: true });
  };
  FirebaseDB.prototype.validate = function (tid, matchId) {
    return this._doc(tid).collection('matches').doc(matchId)
      .set({ validated: true, validatedByUid: this.uid, validatedAt: now() }, { merge: true });
  };
  FirebaseDB.prototype.adminSet = function (tid, matchId, base, sa, sb) {
    return this._doc(tid).collection('matches').doc(matchId).set(Object.assign({}, base, {
      id: matchId,
      proposal: { scoreA: sa, scoreB: sb, byUid: this.uid, byTeamId: 'admin', at: now() },
      validated: true, validatedByUid: 'admin', updatedAt: now()
    }), { merge: true });
  };
  FirebaseDB.prototype.adminClear = function (tid, matchId) {
    return this._doc(tid).collection('matches').doc(matchId)
      .set({ proposal: null, validated: false, validatedByUid: null, updatedAt: now() }, { merge: true });
  };
  FirebaseDB.prototype.startBracket = function (tid, bracket) {
    return this._doc(tid).set({ bracket: bracket, phase: 'bracket', bracketAt: now() }, { merge: true });
  };
  FirebaseDB.prototype.setPhase = function (tid, phase) {
    return this._doc(tid).set({ phase: phase }, { merge: true });
  };
  FirebaseDB.prototype.updateConfig = function (tid, partial) {
    return this._doc(tid).set(partial, { merge: true });
  };

  /* ================================================================= *
   *  Implémentation LOCALE (mode démo)                                *
   * ================================================================= */
  function LocalDB() { this.mode = 'local'; this.uid = null; this.subs = []; }
  LocalDB.prototype.init = function () {
    var uid = localStorage.getItem('bt:uid');
    if (!uid) { uid = 'demo-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('bt:uid', uid); }
    this.uid = uid;
    var self = this;
    try {
      this.chan = new BroadcastChannel('belote-tournoi');
      this.chan.onmessage = function () { self._notify(); };
    } catch (e) { this.chan = null; }
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('bt:') === 0) self._notify();
    });
    return Promise.resolve({ mode: 'local', uid: uid });
  };
  LocalDB.prototype._key = function (tid, what) { return 'bt:' + tid + ':' + what; };
  LocalDB.prototype._read = function (tid, what, def) {
    try { var v = localStorage.getItem(this._key(tid, what)); return v ? JSON.parse(v) : def; }
    catch (e) { return def; }
  };
  LocalDB.prototype._write = function (tid, what, val) {
    localStorage.setItem(this._key(tid, what), JSON.stringify(val));
    this._notify(); if (this.chan) try { this.chan.postMessage(1); } catch (e) {}
    return Promise.resolve(val);
  };
  LocalDB.prototype._notify = function () {
    this.subs.forEach(function (s) { try { s(); } catch (e) {} });
  };
  LocalDB.prototype._sub = function (fn) {
    var self = this; this.subs.push(fn); fn();
    return function () { self.subs = self.subs.filter(function (s) { return s !== fn; }); };
  };
  LocalDB.prototype.watchTournament = function (tid, cb) {
    var self = this;
    return this._sub(function () { cb(self._read(tid, 'config', null)); });
  };
  LocalDB.prototype.watchTeams = function (tid, cb) {
    var self = this;
    return this._sub(function () { cb(self._read(tid, 'teams', [])); });
  };
  LocalDB.prototype.watchMatches = function (tid, cb) {
    var self = this;
    return this._sub(function () {
      var map = self._read(tid, 'matches', {});
      cb(Object.keys(map).map(function (k) { return map[k]; }));
    });
  };
  LocalDB.prototype.listTournaments = function () {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i), m = /^bt:(.+):config$/.exec(k);
      if (m) { try { var c = JSON.parse(localStorage.getItem(k)); if (c) out.push(c); } catch (e) {} }
    }
    out.sort(function (x, y) { return (y.createdAt || 0) - (x.createdAt || 0); });
    return Promise.resolve(out);
  };
  LocalDB.prototype.createTournament = function (tid, config) {
    var isKo = config.format === 'ko';
    var teams = isKo ? L.makeKoTeams(config.numTeams) : L.makeTeams(config.numPools, config.poolSize);
    var matches = {};
    if (!isKo) L.makePoolMatches(config.numPools, config.poolSize).forEach(function (m) { matches[m.id] = m; });
    localStorage.setItem(this._key(tid, 'teams'), JSON.stringify(teams));
    localStorage.setItem(this._key(tid, 'matches'), JSON.stringify(matches));
    return this._write(tid, 'config', Object.assign({ id: tid, createdAt: now() }, config));
  };
  LocalDB.prototype.resetTournament = function (tid) {
    localStorage.removeItem(this._key(tid, 'teams'));
    localStorage.removeItem(this._key(tid, 'matches'));
    localStorage.removeItem(this._key(tid, 'config'));
    this._notify(); if (this.chan) try { this.chan.postMessage(1); } catch (e) {}
    return Promise.resolve();
  };
  LocalDB.prototype.addTeam = function (tid, name) {
    var teams = this._read(tid, 'teams', []);
    var free = shuffle(teams.filter(function (t) { return !t.assigned; }));
    if (!free.length) return Promise.reject(new Error('COMPLET'));
    var chosen = free[0];
    chosen.assigned = true; chosen.name = name; chosen.assignedAt = now();
    this._write(tid, 'teams', teams);
    return Promise.resolve(chosen);
  };
  LocalDB.prototype.renameTeam = function (tid, teamId, name) {
    var teams = this._read(tid, 'teams', []);
    teams.forEach(function (t) { if (t.id === teamId) { t.name = name; t.updatedAt = now(); } });
    return this._write(tid, 'teams', teams);
  };
  LocalDB.prototype.removeTeam = function (tid, teamId) {
    var teams = this._read(tid, 'teams', []);
    teams.forEach(function (t) { if (t.id === teamId) { t.name = ''; t.assigned = false; t.assignedAt = null; } });
    return this._write(tid, 'teams', teams);
  };
  LocalDB.prototype._setMatch = function (tid, matchId, fields) {
    var map = this._read(tid, 'matches', {});
    map[matchId] = Object.assign({ id: matchId }, map[matchId] || {}, fields);
    return this._write(tid, 'matches', map);
  };
  LocalDB.prototype.propose = function (tid, matchId, base, sa, sb, byTeamId) {
    return this._setMatch(tid, matchId, Object.assign({}, base, {
      proposal: { scoreA: sa, scoreB: sb, byUid: this.uid, byTeamId: byTeamId, at: now() },
      validated: false, validatedByUid: null, updatedAt: now()
    }));
  };
  LocalDB.prototype.validate = function (tid, matchId) {
    return this._setMatch(tid, matchId, { validated: true, validatedByUid: this.uid, validatedAt: now() });
  };
  LocalDB.prototype.adminSet = function (tid, matchId, base, sa, sb) {
    return this._setMatch(tid, matchId, Object.assign({}, base, {
      proposal: { scoreA: sa, scoreB: sb, byUid: this.uid, byTeamId: 'admin', at: now() },
      validated: true, validatedByUid: 'admin', updatedAt: now()
    }));
  };
  LocalDB.prototype.adminClear = function (tid, matchId) {
    return this._setMatch(tid, matchId, { proposal: null, validated: false, validatedByUid: null, updatedAt: now() });
  };
  LocalDB.prototype.startBracket = function (tid, bracket) {
    var cfg = this._read(tid, 'config', {});
    cfg.bracket = bracket; cfg.phase = 'bracket'; cfg.bracketAt = now();
    return this._write(tid, 'config', cfg);
  };
  LocalDB.prototype.setPhase = function (tid, phase) {
    var cfg = this._read(tid, 'config', {}); cfg.phase = phase;
    return this._write(tid, 'config', cfg);
  };
  LocalDB.prototype.updateConfig = function (tid, partial) {
    var cfg = this._read(tid, 'config', {});
    return this._write(tid, 'config', Object.assign(cfg, partial));
  };

  /* ---- Façade ------------------------------------------------------ */
  var impl = CFG.firebaseReady ? new FirebaseDB() : new LocalDB();
  global.DB = impl;
})(typeof window !== 'undefined' ? window : this);
