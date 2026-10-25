# Kairos — pages HTML et inscription sur Vercel

Architecture HTML/CSS/JavaScript, fonctions Vercel Node.js, comptes Clerk, fiches Neon, e-mails Resend. **Installation : lire CONNEXIONS.md.** Ces fichiers sont préparés localement ; ils ne sont pas publiés automatiquement.

## Fichiers

- Trois HTML, style.css, script.js, config.js et logo-kairos.png : site public.
- api/ : fonctions HTTP Vercel.
- server/ : authentification, validation, base, projection publique, e-mails.
- scripts/build.mjs : copie seulement les sept fichiers publics dans public/ et y injecte la clé publique Clerk si elle est définie dans Vercel.
- package.json, pnpm-lock.yaml, vercel.json : dépendances et déploiement.
- .env.example : noms des variables sans secrets.

Aucun profil fictif ni calendrier de lancement. Les offres et l’essai restent des intentions : aucun paiement, abonnement récurrent ou contrôle d’éligibilité étudiant n’est implémenté.

## Routes

| Route | Accès | Résultat |
| --- | --- | --- |
| POST /api/waitlist | Session Clerk et e-mail vérifié | Enregistrement ou mise à jour, confirmation après écriture en base |
| GET /api/waitlist | Session Clerk | Fiche privée du compte courant |
| GET /api/waitlist/profiles | Public, session facultative | Jusqu’à 100 fiches approuvées et consenties, compteurs et état du like |
| POST /api/waitlist/profiles/:id/like | Session Clerk | Corps JSON avec liked: true ou false ; réponse likesCount et liked |
| GET /api/profile-photo?id=… | Profil approuvé et consenti | Image raster autorisée, aucun accès aux photos privées |

Erreurs JSON avec code et message. Pas de CORS permissif ; déploiement normal sur la même origine. Jetons Clerk vérifiés par le SDK serveur avec origines autorisées. L’e-mail du formulaire doit être vérifié dans le compte. Requêtes SQL paramétrées.

## Données

Quatre tables créées si absentes au premier accès : kairos_profiles, kairos_profile_likes, kairos_rate_limits, kairos_mail_outbox. Les comptes restent dans Clerk, les fiches dans Neon.

Validation des champs, photo JPEG/PNG/WebP de 1 Mo maximum. Les photos sont conservées en base pour cette première version ; prévoir un stockage d’objets et une transformation des images si le volume augmente.

Une fiche n’est jamais publiée automatiquement. Toute modification retire le statut publié pour nouvelle validation. Publication manuelle avec consentement via server/moderation.sql. Les données publiques excluent e-mail, nom complet et établissement. Âge privé par défaut, préférences investisseurs privées par défaut.

Le compte peut reprendre sa fiche privée. Brouillon local facultatif après clic explicite ; favoris locaux. Pas de messagerie entre membres ni de recommandation algorithmique avancée. Les filtres portent sur les fiches publiques chargées.

## E-mails

L’écriture précède l’e-mail. Statuts sent, test_sent, pending et not_configured distincts de registered: true. En mode test par défaut, notification au propriétaire Resend uniquement, sans contenu privé de la fiche.

Contenu d’envoi figé et clé d’idempotence stable. Aucun renvoi après succès. Nouvelle tentative sur resoumission pendant 23 heures ; au-delà, intervention manuelle. Pas de tâche de relance planifiée.

## Limites opérationnelles

- 10 soumissions et 60 changements de like par compte et par heure.
- Purger périodiquement les anciennes lignes de limite de débit.
- Publication et effacement traités manuellement ; pas d’interface d’administration.
- Configurer une instance Clerk de production avant lancement public.
- Les archives excluent les secrets et le rattachement Vercel.

## Préparation locale

Node.js 24, installation des dépendances avec le verrouillage pnpm, puis pnpm build. La préparation ne contacte ni Clerk, ni Neon, ni Resend. Les API s’exécutent sur Vercel ; un HTML local ne peut pas les exécuter.
