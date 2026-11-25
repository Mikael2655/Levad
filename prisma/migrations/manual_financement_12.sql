-- Financement, mise à jour n° 12 : demande de repli (ex. demande Solubail créée après un refus ou un blocage chez Grenke), reliée à la demande d'origine.
-- À exécuter UNE FOIS dans la console SQL de Neon AVANT d'ouvrir la nouvelle version de l'application.
-- Sans danger si relancé.

ALTER TABLE "fin_demande" ADD COLUMN IF NOT EXISTS "repliDeId" INTEGER;

DO $$ BEGIN
  ALTER TABLE "fin_demande" ADD CONSTRAINT "fin_demande_repliDeId_fkey" FOREIGN KEY ("repliDeId") REFERENCES "fin_demande"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "fin_demande_repliDeId_idx" ON "fin_demande"("repliDeId");
