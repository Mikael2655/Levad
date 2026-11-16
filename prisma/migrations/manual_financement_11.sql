-- Financement, mise à jour n° 11 : accords reçus du financeur (financeur sans API), avec leur historique, réservés à l'interne.
-- À exécuter UNE FOIS dans la console SQL de Neon AVANT d'ouvrir la nouvelle version de l'application.
-- Sans danger si relancé.

CREATE TABLE IF NOT EXISTS "fin_accord" (
    "id" SERIAL NOT NULL,
    "demandeId" INTEGER NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteurId" INTEGER NOT NULL,
    "montantReelCentimes" INTEGER NOT NULL,
    "coefficientReelPpm" INTEGER,
    "note" TEXT,

CONSTRAINT "fin_accord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fin_accord_demandeId_idx" ON "fin_accord"("demandeId");

DO $$ BEGIN
  ALTER TABLE "fin_accord" ADD CONSTRAINT "fin_accord_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "fin_demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_accord" ADD CONSTRAINT "fin_accord_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "fin_utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
