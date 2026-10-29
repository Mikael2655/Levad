-- Financement, mise à jour n° 6 : suivi de l'envoi des pièces jointes au financeur (API Grenke).
-- À exécuter UNE FOIS dans la console SQL de Neon AVANT d'ouvrir la nouvelle version de l'application.
-- Sans danger si relancé.

ALTER TABLE "fin_piece_jointe" ADD COLUMN IF NOT EXISTS "envoyeFinanceurLe" TIMESTAMP(3);
