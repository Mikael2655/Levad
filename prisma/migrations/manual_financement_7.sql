-- Financement, mise à jour n° 7 : renouvellement (le solde d'un contrat est intégré à la nouvelle demande).
-- À exécuter UNE FOIS dans la console SQL de Neon AVANT d'ouvrir la nouvelle version de l'application.
-- Sans danger si relancé.

ALTER TABLE "fin_demande" ADD COLUMN IF NOT EXISTS "rachatId" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "fin_demande_rachatId_key" ON "fin_demande"("rachatId");

DO $$ BEGIN
  ALTER TABLE "fin_demande" ADD CONSTRAINT "fin_demande_rachatId_fkey" FOREIGN KEY ("rachatId") REFERENCES "fin_rachat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
