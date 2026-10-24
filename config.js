/* Configuration PUBLIQUE du site. Aucune clé secrète ne doit être placée ici. */
window.KAIROS_CONFIG = Object.freeze({
  // Facultatif : clé PUBLIQUE Clerk, commençant par pk_test_ ou pk_live_.
  // Laisser vide pour conserver la préinscription sans compte pour le moment.
  clerkPublishableKey: "",

  // Laisser vide si les routes /api/ sont hébergées dans le même projet Vercel.
  // Sinon, indiquer uniquement l’origine HTTPS de votre serveur.
  apiBase: ""
});

// CLERK_SECRET_KEY et RESEND_API_KEY vont dans les variables du projet Vercel.
// Elles ne doivent figurer dans aucun fichier envoyé au navigateur.
