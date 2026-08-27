/* config.js — Configuration de l'application.
 *
 * ⚙️  POUR PASSER EN MODE MULTI-TÉLÉPHONE (synchro temps réel) :
 *   1. Créez un projet sur https://console.firebase.google.com (gratuit).
 *   2. Ajoutez une application « Web » et copiez l'objet firebaseConfig.
 *   3. Activez « Authentication → Sign-in method → Anonyme ».
 *   4. Activez « Firestore Database » (mode production).
 *   5. Collez vos identifiants ci-dessous à la place des « VOTRE_… ».
 *   6. Publiez les règles de sécurité fournies dans firestore.rules.
 *
 * Tant que la config n'est pas remplie, l'appli tourne en MODE DÉMO :
 * les données restent sur cet appareil (localStorage) et se synchronisent
 * seulement entre onglets du même navigateur. Pratique pour tester les
 * règles avant le jour J, mais PAS pour un vrai tournoi multi-téléphone.
 */
window.APP_CONFIG = {
  firebase: {
    apiKey:            "VOTRE_API_KEY",
    authDomain:        "VOTRE_PROJET.firebaseapp.com",
    projectId:         "VOTRE_PROJET",
    storageBucket:     "VOTRE_PROJET.appspot.com",
    messagingSenderId: "VOTRE_SENDER_ID",
    appId:             "VOTRE_APP_ID"
  },

  // Identifiant du tournoi (permet d'en gérer plusieurs). Modifiable via
  // l'URL : #/t/<id>. Par défaut « principal ».
  defaultTournamentId: "principal"
};

// Détecte si Firebase est configuré (sinon : mode démo local).
window.APP_CONFIG.firebaseReady = (function (c) {
  return c && c.apiKey && c.apiKey.indexOf("VOTRE_") !== 0 && !!c.projectId
    && c.projectId.indexOf("VOTRE_") !== 0;
})(window.APP_CONFIG.firebase);
