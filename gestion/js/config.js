/* ============================================================
   Configuration & constantes — Levad Gestion (CRM/ERP interne)
   ------------------------------------------------------------
   Par défaut tout reste dans le navigateur (localStorage). Pour
   partager clients/contrats/factures entre plusieurs postes et
   rôles, renseignez FIREBASE_CONFIG (voir README.md) et publiez
   firestore.rules. On réutilise ici le même projet Firebase que
   « proposition-commerciale » mais avec des collections dédiées
   (préfixe gestion_) pour ne rien mélanger.
   ============================================================ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDfcSakKcNujuO3ZOlLIqiVj1KpzB9Ss2s",
  authDomain: "levad-simulateur.firebaseapp.com",
  projectId: "levad-simulateur",
  storageBucket: "levad-simulateur.firebasestorage.app",
  messagingSenderId: "684104508767",
  appId: "1:684104508767:web:37f013f19184cb262d02ea",
  measurementId: "G-5QMH6D63C4",
};
const FIREBASE_READY = (function (c) {
  return !!c && !!c.apiKey && c.apiKey.indexOf("VOTRE_") !== 0
    && !!c.projectId && c.projectId.indexOf("VOTRE_") !== 0;
})(FIREBASE_CONFIG);

const DEFAULT_ADMIN_PASSWORD = "levad2026";

/* Rôles applicatifs. */
const ROLES = {
  ADMIN: "admin",           // accès total, y compris utilisateurs & rôles
  COMPTA: "compta",         // administratif/comptable : clients, contrats, compteurs, factures, résiliations, prélèvements
  COMMERCIAL: "commercial", // sa base clients (lecture + historique), création de prospects uniquement
};
const ROLE_LABELS = {
  admin: "Administrateur", compta: "Administratif / Comptable", commercial: "Commercial",
};

/* Activités vendues — chacune peut porter un contrat de maintenance. */
const ACTIVITIES = {
  photocopieur: "Photocopieur / Impression",
  telephonie: "Téléphonie",
  ged: "GED (gestion documentaire)",
  securite: "Sécurité (vidéo, alarme…)",
  informatique: "Informatique",
};

/* Types de ligne d'un contrat. */
const LINE_TYPES = {
  fixed: "Forfait fixe (abonnement, opérateur, licence…)",
  metered: "Compteur (pages N&B / couleur, engagement + dépassement)",
};

const BILLING_FREQUENCIES = { monthly: "Mensuelle", quarterly: "Trimestrielle" };
const FREQ_MONTHS = { monthly: 1, quarterly: 3 };

/* Statuts contrat / facture / machine. */
const CONTRACT_STATUS = { active: "En cours", terminated: "Résilié", replaced: "Remplacé (renouvelé)" };
const INVOICE_STATUS = {
  draft: "Brouillon", sent: "Envoyée", chorus: "Déposée sur Chorus Pro",
  unpaid: "Non soldée", paid: "Soldée",
};
const INDEXATION_MODES = { default: "Taux par défaut de la société", none: "Jamais (prix fixe)", custom: "Taux personnalisé" };
const INVOICE_TYPE_LABELS = { period: "Période", termination: "Résiliation", avoir: "Avoir (renouvellement)" };
function invoiceTypeLabel(t) { return INVOICE_TYPE_LABELS[t] || t; }
const MACHINE_ACQUISITION = {
  achat_client: "Achat client",
  location_interne: "Location Levad",
  location_externe: "Location (organisme de financement)",
};
const MACHINE_EXIT = {
  laisse_client: "Laissée chez le client (achetée)",
  detruite: "Récupérée pour destruction",
  revendue: "Récupérée pour revente",
  transfert: "Transférée (renouvellement de contrat)",
};

const VAT_RATE_DEFAULT = 20;

/* Identité société — à compléter dans Paramètres (visible admin/compta).
   Nécessaire pour générer le fichier de prélèvement SEPA. */
function DEFAULT_COMPANY_SETTINGS() {
  return {
    id: "company", name: "LEVAD", siret: "",
    address: { line1: "", line2: "", zip: "", city: "" },
    ics: "",   // Identifiant Créancier SEPA (ICS), fourni par votre banque
    iban: "", bic: "",
    invoicePrefix: "F",
    defaultIndexationRate: 0,   // % d'augmentation annuelle appliqué par défaut à tous les contrats (anniversaire du contrat)
  };
}

function cryptoId(prefix) {
  const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}_${id}` : id;
}
