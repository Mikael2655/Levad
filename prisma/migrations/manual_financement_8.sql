-- Financement, mise à jour n° 8 : barème commercial emprunté à un autre financeur (ex. BNP avec les taux Grenke).
-- À exécuter UNE FOIS dans la console SQL de Neon AVANT d'ouvrir la nouvelle version de l'application.
-- Sans danger si relancé.

ALTER TABLE "fin_financeur" ADD COLUMN IF NOT EXISTS "baremeCommercialDeId" INTEGER;

DO $$ BEGIN
  ALTER TABLE "fin_financeur" ADD CONSTRAINT "fin_financeur_baremeCommercialDeId_fkey" FOREIGN KEY ("baremeCommercialDeId") REFERENCES "fin_financeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
