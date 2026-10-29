-- Financement, mise à jour n° 4 : statut des contrats (en cours / tacite / clôturé), dénonciation, solde anticipé (rachat).
-- À exécuter UNE FOIS dans la console SQL de Neon AVANT d'ouvrir la nouvelle version de l'application.
-- Sans danger si relancé : n'ajoute que ce qui manque, ne supprime aucune donnée.

ALTER TABLE "fin_contrat" ADD COLUMN IF NOT EXISTS "denonceLe" TIMESTAMP(3);
ALTER TABLE "fin_contrat" ADD COLUMN IF NOT EXISTS "clotureLe" TIMESTAMP(3);
ALTER TABLE "fin_contrat" ADD COLUMN IF NOT EXISTS "clotureMotif" TEXT;

CREATE TABLE IF NOT EXISTS "fin_rachat" (
    "id" SERIAL NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contratId" INTEGER NOT NULL,
    "creeParId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "dateResiliation" TIMESTAMP(3) NOT NULL,
    "nbLoyersRestants" INTEGER NOT NULL,
    "loyersRestantsCentimes" INTEGER NOT NULL,
    "penaliteCentimes" INTEGER NOT NULL,
    "valeurResiduelleCentimes" INTEGER NOT NULL,
    "totalCentimes" INTEGER NOT NULL,
    "statut" TEXT NOT NULL,
    "envoyeLe" TIMESTAMP(3),
    "envoyeParId" INTEGER,
    "commentaire" TEXT,

CONSTRAINT "fin_rachat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fin_rachat_contratId_idx" ON "fin_rachat"("contratId");

DO $$ BEGIN
  ALTER TABLE "fin_rachat" ADD CONSTRAINT "fin_rachat_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "fin_contrat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_rachat" ADD CONSTRAINT "fin_rachat_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "fin_utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_rachat" ADD CONSTRAINT "fin_rachat_envoyeParId_fkey" FOREIGN KEY ("envoyeParId") REFERENCES "fin_utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
