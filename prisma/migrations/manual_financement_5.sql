-- Financement, mise à jour n° 5 : pièces jointes (Kbis, bilans, RIB...) rangées dans la base de données.
-- À exécuter UNE FOIS dans la console SQL de Neon AVANT d'ouvrir la nouvelle version de l'application.
-- Sans danger si relancé : n'ajoute que ce qui manque, ne supprime aucune donnée.

ALTER TABLE "fin_piece_jointe" ADD COLUMN IF NOT EXISTS "typeMime" TEXT NOT NULL DEFAULT 'application/octet-stream';
ALTER TABLE "fin_piece_jointe" ADD COLUMN IF NOT EXISTS "complete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "fin_piece_jointe" ALTER COLUMN "stockage" SET DEFAULT 'base';

CREATE INDEX IF NOT EXISTS "fin_piece_jointe_ajouteLe_idx" ON "fin_piece_jointe"("ajouteLe");

CREATE TABLE IF NOT EXISTS "fin_piece_morceau" (
    "id" SERIAL NOT NULL,
    "pieceId" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL,
    "donnees" BYTEA NOT NULL,

CONSTRAINT "fin_piece_morceau_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fin_piece_morceau_pieceId_ordre_key" ON "fin_piece_morceau"("pieceId", "ordre");

DO $$ BEGIN
  ALTER TABLE "fin_piece_morceau" ADD CONSTRAINT "fin_piece_morceau_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "fin_piece_jointe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
