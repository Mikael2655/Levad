-- Financement, mise à jour n° 2 : étape détaillée de la signature.
-- À exécuter UNE FOIS dans la console SQL de Neon si le premier script (manual_financement.sql) a déjà été exécuté.
-- Sans danger si relancé : ajoute seulement la colonne si elle manque, ne modifie aucune donnée.

ALTER TABLE "fin_demande" ADD COLUMN IF NOT EXISTS "etapeSignature" TEXT;
