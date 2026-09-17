/* ============================================================
   Couche de stockage : Firestore (partagé) si configuré, sinon
   localStorage (par poste). Collections gérées génériquement.

   Sécurité « de confort » (identique à proposition-commerciale) :
   connexion applicative (identifiant + mot de passe haché) +
   connexion anonyme Firebase pour l'écriture. Les rôles filtrent
   l'UI côté client ; voir gestion/firestore.rules.
   ============================================================ */

const COLLECTIONS = ["users", "clients", "contracts", "machines", "meterReadings", "invoices", "sepaBatches", "counters", "settings"];
const LOCAL_PREFIX = "levad_gestion_";

const Store = {
  mode: "local",
  db: null, auth: null, uid: null,
  data: {},          // caches en mémoire { collection: [...] }
  onUpdate: null,
  lastError: "",

  async init() {
    COLLECTIONS.forEach((c) => { this.data[c] = []; });
    if (FIREBASE_READY && typeof firebase === "undefined") {
      this.lastError = "SDK Firebase non chargé (réseau bloqué ?)";
    }
    if (FIREBASE_READY && typeof firebase !== "undefined") {
      try {
        if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        await new Promise((resolve, reject) => {
          this.auth.onAuthStateChanged((u) => { if (u) { this.uid = u.uid; resolve(); } });
          this.auth.signInAnonymously().catch(reject);
        });
        await Promise.all(COLLECTIONS.map((c) => this._loadFirebase(c)));
        this.mode = "firebase";
        COLLECTIONS.forEach((c) => this._listen(c));
        return;
      } catch (e) {
        this.lastError = (e && (e.code || e.message)) ? (e.code || e.message) : String(e);
        console.error("Firebase indisponible, repli local :", e);
        this.mode = "local";
      }
    }
    COLLECTIONS.forEach((c) => this._loadLocal(c));
  },

  _key(c) { return LOCAL_PREFIX + c; },
  async _loadFirebase(c) {
    const snap = await this.db.collection("gestion_" + c).get();
    this.data[c] = snap.docs.map((d) => d.data());
  },
  _loadLocal(c) { this.data[c] = read(this._key(c)); },
  _listen(c) {
    this.db.collection("gestion_" + c).onSnapshot((s) => {
      this.data[c] = s.docs.map((d) => d.data());
      if (this.onUpdate) this.onUpdate();
    });
  },

  async put(c, item) {
    upsert(this.data[c], item);
    if (this.mode === "firebase") await this.db.collection("gestion_" + c).doc(item.id).set(clone(item));
    else write(this._key(c), this.data[c]);
    return item;
  },
  async remove(c, id) {
    this.data[c] = this.data[c].filter((x) => x.id !== id);
    if (this.mode === "firebase") await this.db.collection("gestion_" + c).doc(id).delete();
    else write(this._key(c), this.data[c]);
  },

  /* Compteurs séquentiels (numéros de facture / remise), atomiques en mode Firestore. */
  async nextSeq(name) {
    if (this.mode === "firebase") {
      const ref = this.db.collection("gestion_counters").doc(name);
      const val = await this.db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        const cur = doc.exists ? (doc.data().value || 0) : 0;
        const next = cur + 1;
        tx.set(ref, { id: name, value: next });
        return next;
      });
      const i = this.data.counters.findIndex((x) => x.id === name);
      if (i >= 0) this.data.counters[i].value = val; else this.data.counters.push({ id: name, value: val });
      return val;
    }
    let row = this.data.counters.find((x) => x.id === name);
    if (!row) { row = { id: name, value: 0 }; this.data.counters.push(row); }
    row.value += 1;
    write(this._key("counters"), this.data.counters);
    return row.value;
  },

  // Raccourcis typés
  get clients() { return this.data.clients; },
  get contracts() { return this.data.contracts; },
  get machines() { return this.data.machines; },
  get meterReadings() { return this.data.meterReadings; },
  get invoices() { return this.data.invoices; },
  get sepaBatches() { return this.data.sepaBatches; },
  get users() { return this.data.users; },
  get settings() { return this.data.settings; },

  companySettings() {
    return this.data.settings.find((s) => s.id === "company") || DEFAULT_COMPANY_SETTINGS();
  },
};
