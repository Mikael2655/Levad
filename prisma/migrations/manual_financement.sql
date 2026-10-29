-- Financement : demandes de location financière et contrats (tables « fin_* »).
-- À coller UNE FOIS dans la console SQL de la base de données (Vercel > Storage > votre base > Open in Neon > SQL Editor).
-- Ce script ne crée que des tables nouvelles « fin_* » : il ne touche à aucune table existante (publications, parc...)
-- et peut être relancé sans danger. Il est généré à partir de prisma/schema.prisma.
-- Si vous avez DÉJÀ exécuté une version précédente de ce script, exécutez seulement les fichiers
-- manual_financement_2.sql (et suivants) : ils ajoutent les colonnes apparues depuis.

CREATE TABLE IF NOT EXISTS "fin_utilisateur" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "doitChangerMotDePasse" BOOLEAN NOT NULL DEFAULT true,
    "motDePasseChangeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "fin_utilisateur_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_financeur" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "connecteur" TEXT NOT NULL DEFAULT 'manuel',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "majorationMensuelleBp" INTEGER NOT NULL DEFAULT 150,
    "commissionBp" INTEGER,
    "fraisDossierCentimes" INTEGER NOT NULL DEFAULT 0,
    "signatureElectronique" BOOLEAN NOT NULL DEFAULT true,
    "envoiParMail" BOOLEAN NOT NULL DEFAULT false,
    "destinataireMailId" INTEGER,

CONSTRAINT "fin_financeur_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_correspondance_statut" (
    "id" SERIAL NOT NULL,
    "financeurId" INTEGER NOT NULL,
    "codeFinanceur" TEXT NOT NULL,
    "statut" TEXT NOT NULL,

CONSTRAINT "fin_correspondance_statut_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_grille" (
    "id" SERIAL NOT NULL,
    "financeurId" INTEGER NOT NULL,
    "utilisateurId" INTEGER,
    "type" TEXT NOT NULL,
    "base" TEXT NOT NULL,

CONSTRAINT "fin_grille_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_grille_ligne" (
    "id" SERIAL NOT NULL,
    "grilleId" INTEGER NOT NULL,
    "dureeMois" INTEGER NOT NULL,
    "montantMinCentimes" INTEGER NOT NULL,
    "coefficientBp" INTEGER NOT NULL,

CONSTRAINT "fin_grille_ligne_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_demande" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "archivee" BOOLEAN NOT NULL DEFAULT false,
    "infosManquantes" TEXT,
    "etapeSignature" TEXT,
    "refFinanceur" TEXT,
    "financeurId" INTEGER NOT NULL,
    "commercialId" INTEGER NOT NULL,
    "saisiParId" INTEGER NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "siret" TEXT NOT NULL DEFAULT '',
    "formeJuridique" TEXT,
    "adresse" TEXT NOT NULL,
    "codePostal" TEXT,
    "ville" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'France',
    "contactPrenom" TEXT NOT NULL,
    "contactNom" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactTel" TEXT,
    "dureeMois" INTEGER NOT NULL,
    "periodicite" TEXT NOT NULL,
    "loyerCentimes" INTEGER NOT NULL,
    "montantCommercialCentimes" INTEGER NOT NULL,
    "coefficientCommercialPpm" INTEGER NOT NULL,
    "montantReelCentimes" INTEGER,
    "coefficientReelPpm" INTEGER,
    "horsTranche" BOOLEAN NOT NULL DEFAULT false,

CONSTRAINT "fin_demande_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_demande_ligne" (
    "id" SERIAL NOT NULL,
    "demandeId" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "montantHtCentimes" INTEGER,
    "typeBien" TEXT,
    "constructeur" TEXT,

CONSTRAINT "fin_demande_ligne_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_piece_jointe" (
    "id" SERIAL NOT NULL,
    "demandeId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "stockage" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "ajouteParId" INTEGER NOT NULL,
    "ajouteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "fin_piece_jointe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_historique" (
    "id" SERIAL NOT NULL,
    "demandeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteurId" INTEGER NOT NULL,
    "ancienStatut" TEXT,
    "nouveauStatut" TEXT,
    "commentaire" TEXT,

CONSTRAINT "fin_historique_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_signature" (
    "id" SERIAL NOT NULL,
    "demandeId" INTEGER NOT NULL,
    "clientPrenom" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "fournisseurPrenom" TEXT NOT NULL,
    "fournisseurNom" TEXT NOT NULL,
    "fournisseurEmail" TEXT NOT NULL,
    "demandeeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signeeLe" TIMESTAMP(3),

CONSTRAINT "fin_signature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_contrat" (
    "id" SERIAL NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "demandeId" INTEGER,
    "importe" BOOLEAN NOT NULL DEFAULT false,
    "refFinanceur" TEXT,
    "statutFinanceur" TEXT,
    "financeurId" INTEGER NOT NULL,
    "commercialId" INTEGER NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "siret" TEXT,
    "materiel" TEXT NOT NULL,
    "periodicite" TEXT NOT NULL,
    "dureeMois" INTEGER NOT NULL,
    "loyerCentimes" INTEGER NOT NULL,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "montantCommercialCentimes" INTEGER,
    "montantReelCentimes" INTEGER,
    "banque" TEXT,
    "denonceLe" TIMESTAMP(3),
    "clotureLe" TIMESTAMP(3),
    "clotureMotif" TEXT,

CONSTRAINT "fin_contrat_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX IF NOT EXISTS "fin_utilisateur_email_key" ON "fin_utilisateur"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "fin_financeur_nom_key" ON "fin_financeur"("nom");

CREATE UNIQUE INDEX IF NOT EXISTS "fin_correspondance_statut_financeurId_codeFinanceur_key" ON "fin_correspondance_statut"("financeurId", "codeFinanceur");

CREATE INDEX IF NOT EXISTS "fin_grille_financeurId_type_idx" ON "fin_grille"("financeurId", "type");

CREATE INDEX IF NOT EXISTS "fin_grille_ligne_grilleId_idx" ON "fin_grille_ligne"("grilleId");

CREATE UNIQUE INDEX IF NOT EXISTS "fin_demande_reference_key" ON "fin_demande"("reference");

CREATE INDEX IF NOT EXISTS "fin_demande_commercialId_idx" ON "fin_demande"("commercialId");

CREATE INDEX IF NOT EXISTS "fin_demande_statut_idx" ON "fin_demande"("statut");

CREATE INDEX IF NOT EXISTS "fin_historique_demandeId_date_idx" ON "fin_historique"("demandeId", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "fin_signature_demandeId_key" ON "fin_signature"("demandeId");

CREATE UNIQUE INDEX IF NOT EXISTS "fin_contrat_demandeId_key" ON "fin_contrat"("demandeId");

CREATE INDEX IF NOT EXISTS "fin_contrat_commercialId_idx" ON "fin_contrat"("commercialId");

CREATE INDEX IF NOT EXISTS "fin_contrat_dateFin_idx" ON "fin_contrat"("dateFin");

DO $$ BEGIN
  ALTER TABLE "fin_correspondance_statut" ADD CONSTRAINT "fin_correspondance_statut_financeurId_fkey" FOREIGN KEY ("financeurId") REFERENCES "fin_financeur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_grille" ADD CONSTRAINT "fin_grille_financeurId_fkey" FOREIGN KEY ("financeurId") REFERENCES "fin_financeur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_grille" ADD CONSTRAINT "fin_grille_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "fin_utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_grille_ligne" ADD CONSTRAINT "fin_grille_ligne_grilleId_fkey" FOREIGN KEY ("grilleId") REFERENCES "fin_grille"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_demande" ADD CONSTRAINT "fin_demande_financeurId_fkey" FOREIGN KEY ("financeurId") REFERENCES "fin_financeur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_demande" ADD CONSTRAINT "fin_demande_commercialId_fkey" FOREIGN KEY ("commercialId") REFERENCES "fin_utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_demande" ADD CONSTRAINT "fin_demande_saisiParId_fkey" FOREIGN KEY ("saisiParId") REFERENCES "fin_utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_demande_ligne" ADD CONSTRAINT "fin_demande_ligne_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "fin_demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_piece_jointe" ADD CONSTRAINT "fin_piece_jointe_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "fin_demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_piece_jointe" ADD CONSTRAINT "fin_piece_jointe_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "fin_utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_historique" ADD CONSTRAINT "fin_historique_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "fin_demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_historique" ADD CONSTRAINT "fin_historique_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "fin_utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_signature" ADD CONSTRAINT "fin_signature_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "fin_demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_contrat" ADD CONSTRAINT "fin_contrat_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "fin_demande"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_contrat" ADD CONSTRAINT "fin_contrat_financeurId_fkey" FOREIGN KEY ("financeurId") REFERENCES "fin_financeur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_contrat" ADD CONSTRAINT "fin_contrat_commercialId_fkey" FOREIGN KEY ("commercialId") REFERENCES "fin_utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_financeur" ADD CONSTRAINT "fin_financeur_destinataireMailId_fkey" FOREIGN KEY ("destinataireMailId") REFERENCES "fin_utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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
