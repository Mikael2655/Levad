-- Financement, mise à jour n° 10 : observation libre sur une demande (ex. rachat d'un contrat dans le cadre de la demande).
-- À exécuter UNE FOIS dans la console SQL de Neon AVANT d'ouvrir la nouvelle version de l'application.
-- Sans danger si relancé.

ALTER TABLE "fin_demande" ADD COLUMN IF NOT EXISTS "observation" TEXT;
