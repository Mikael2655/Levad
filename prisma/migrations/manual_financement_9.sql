-- Financement, mise à jour n° 9 : identifiant technique de la demande chez le financeur (Grenke : API), distinct du numéro de dossier lisible.
-- À exécuter UNE FOIS dans la console SQL de Neon AVANT d'ouvrir la nouvelle version de l'application.
-- Sans danger si relancé.

ALTER TABLE "fin_demande" ADD COLUMN IF NOT EXISTS "idFinanceur" TEXT;

-- Les demandes déjà envoyées à Grenke par l'API portent leur identifiant technique (un UUID) dans « refFinanceur » : on le recopie.
-- Le numéro lisible (ex. 100-145711) est renseigné ensuite par le bouton « Actualiser depuis Grenke ».
UPDATE "fin_demande" SET "idFinanceur" = "refFinanceur"
WHERE "idFinanceur" IS NULL AND "refFinanceur" ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
