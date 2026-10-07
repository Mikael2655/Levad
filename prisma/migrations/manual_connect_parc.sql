-- Levad Connect : tables du suivi du parc.
-- À coller UNE FOIS dans la console SQL de la base de données (Vercel > Storage > votre base > Open in Neon > SQL Editor).
-- Ce script ne touche à aucune table existante et peut être relancé sans danger.

CREATE TABLE IF NOT EXISTS "connect_client" (
  "id"     SERIAL PRIMARY KEY,
  "nom"    TEXT NOT NULL,
  "cle"    TEXT NOT NULL UNIQUE,
  "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "connect_machine" (
  "id"          SERIAL PRIMARY KEY,
  "clientId"    INTEGER NOT NULL REFERENCES "connect_client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "cle"         TEXT NOT NULL UNIQUE,
  "numeroSerie" TEXT,
  "marque"      TEXT,
  "modele"      TEXT,
  "ip"          TEXT,
  "nomAffiche"  TEXT,
  "categorie"   TEXT NOT NULL DEFAULT 'mine',
  "aVerifier"   BOOLEAN NOT NULL DEFAULT false,
  "recette"     TEXT,
  "seuilEncre"  INTEGER NOT NULL DEFAULT 25,
  "creeLe"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "connect_machine_clientId_idx" ON "connect_machine"("clientId");

CREATE TABLE IF NOT EXISTS "connect_releve" (
  "id"            SERIAL PRIMARY KEY,
  "machineId"     INTEGER NOT NULL REFERENCES "connect_machine"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "date"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source"        TEXT NOT NULL DEFAULT 'connect',
  "compteurs"     JSONB NOT NULL,
  "encres"        JSONB,
  "bacs"          JSONB,
  "totalStandard" INTEGER,
  "versionSnmp"   TEXT,
  "pc"            TEXT
);
CREATE INDEX IF NOT EXISTS "connect_releve_machineId_date_idx" ON "connect_releve"("machineId", "date");
