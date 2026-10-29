-- Financement, mise à jour n° 3 : Solubail (financeur sans API), montant réel saisi à la main, banque, e-mails de notification.
-- À exécuter UNE FOIS dans la console SQL de Neon AVANT d'ouvrir la nouvelle version de l'application.
-- Sans danger si relancé : n'ajoute que ce qui manque, ne supprime aucune donnée.

ALTER TABLE "fin_financeur" ADD COLUMN IF NOT EXISTS "signatureElectronique" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "fin_financeur" ADD COLUMN IF NOT EXISTS "envoiParMail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "fin_financeur" ADD COLUMN IF NOT EXISTS "destinataireMailId" INTEGER;

-- Le montant réel peut être vide tant que le financeur ne l'a pas communiqué (financeur sans barème réel).
ALTER TABLE "fin_demande" ALTER COLUMN "montantReelCentimes" DROP NOT NULL;
ALTER TABLE "fin_demande" ALTER COLUMN "coefficientReelPpm" DROP NOT NULL;
ALTER TABLE "fin_contrat" ALTER COLUMN "montantReelCentimes" DROP NOT NULL;
ALTER TABLE "fin_contrat" ADD COLUMN IF NOT EXISTS "banque" TEXT;

CREATE TABLE IF NOT EXISTS "fin_parametre" (
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,

CONSTRAINT "fin_parametre_pkey" PRIMARY KEY ("cle")
);

CREATE TABLE IF NOT EXISTS "fin_notification" (
    "id" SERIAL NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "demandeId" INTEGER,
    "destinataireEmail" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "erreur" TEXT,

CONSTRAINT "fin_notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fin_notification_creeLe_idx" ON "fin_notification"("creeLe");

DO $$ BEGIN
  ALTER TABLE "fin_financeur" ADD CONSTRAINT "fin_financeur_destinataireMailId_fkey" FOREIGN KEY ("destinataireMailId") REFERENCES "fin_utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
