#!/bin/bash
# Lanceur pour Mac : double-cliquer sur ce fichier.
cd "$(dirname "$0")"
# Le Mac marque les fichiers téléchargés ; on retire cette marque pour que le programme puisse démarrer.
xattr -dr com.apple.quarantine . 2>/dev/null
chmod +x ./LEVAD-Releve
./LEVAD-Releve
