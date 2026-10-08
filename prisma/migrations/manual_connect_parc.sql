-- Levad Connect : tables du suivi du parc.
-- À coller UNE FOIS dans la console SQL de la base de données (Vercel > Storage > votre base > Open in Neon > SQL Editor).
-- Ce script ne touche à aucune table existante et peut être relancé sans danger (même si une version
-- plus ancienne a déjà été exécutée : il ajoute seulement ce qui manque).

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

-- Version 2 : un seuil d'alerte par couleur (repris de l'ancien seuil unique, une seule fois).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'connect_machine' AND column_name = 'seuilNoir') THEN
    ALTER TABLE "connect_machine"
      ADD COLUMN "seuilNoir"    INTEGER NOT NULL DEFAULT 25,
      ADD COLUMN "seuilCyan"    INTEGER NOT NULL DEFAULT 25,
      ADD COLUMN "seuilMagenta" INTEGER NOT NULL DEFAULT 25,
      ADD COLUMN "seuilJaune"   INTEGER NOT NULL DEFAULT 25;
    UPDATE "connect_machine"
      SET "seuilNoir" = "seuilEncre", "seuilCyan" = "seuilEncre",
          "seuilMagenta" = "seuilEncre", "seuilJaune" = "seuilEncre";
  END IF;
END $$;

-- Version 2 : stocks d'encre des clients.
CREATE TABLE IF NOT EXISTS "connect_stock_mouvement" (
  "id"        SERIAL PRIMARY KEY,
  "clientId"  INTEGER NOT NULL REFERENCES "connect_client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "couleur"   TEXT NOT NULL,
  "delta"     INTEGER NOT NULL,
  "motif"     TEXT NOT NULL,
  "note"      TEXT,
  "machineId" INTEGER,
  "date"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "connect_stock_mouvement_clientId_couleur_idx" ON "connect_stock_mouvement"("clientId", "couleur");

-- Version 2 : mémoire du mail quotidien des alertes (un seul par jour).
CREATE TABLE IF NOT EXISTS "connect_alerte_envoi" (
  "id"        SERIAL PRIMARY KEY,
  "jour"      TEXT NOT NULL UNIQUE,
  "envoyeLe"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nbAlertes" INTEGER NOT NULL
);
