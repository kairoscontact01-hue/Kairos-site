# Kairos — pages HTML et inscription sur Vercel

Architecture HTML/CSS/JavaScript, fonctions Vercel Node.js, comptes Clerk, fiches Neon, e-mails Resend. **Installation : lire CONNEXIONS.md.** Ces fichiers sont préparés localement ; ils ne sont pas publiés automatiquement.

## Fichiers

- Pages HTML, style.css, script.js, config.js et logo-kairos.png : interface du site.
- admin.html et admin.js : interface privée de consultation ; données accessibles uniquement via les routes administrateur.
- api/ : fonctions HTTP Vercel.
- server/ : authentification, validation, base, projection publique, e-mails.
- scripts/build.mjs : copie seulement les fichiers de l’interface autorisés dans public/ et y injecte la clé publique Clerk si elle est définie dans Vercel.
- package.json, pnpm-lock.yaml, vercel.json : dépendances et déploiement.
- .env.example : noms des variables sans secrets.

Aucun profil fictif ni calendrier de lancement. Les offres et l’essai restent des intentions : aucun paiement, abonnement récurrent ou contrôle d’éligibilité étudiant n’est implémenté.

## Parcours du compte

Le logo est placé à gauche dans les en-têtes. Après connexion, le lien « Créer mon compte » devient « Mon profil ». La page d’inscription affiche d’abord la création de compte ou la connexion ; le questionnaire reste masqué et inactif jusqu’à l’ouverture d’une session Clerk. Il apparaît ensuite sur la même page. Une déconnexion masque le questionnaire et efface les informations affichées du compte précédent, sans effacer la fiche en base ni le brouillon enregistré explicitement sur l’appareil.

## Routes

| Route | Accès | Résultat |
| --- | --- | --- |
| POST /api/waitlist | Session Clerk et e-mail vérifié | Enregistrement ou mise à jour, confirmation après écriture en base |
| GET /api/waitlist | Session Clerk | Fiche privée du compte courant |
| GET /api/waitlist/profiles | Public, session facultative | Jusqu’à 100 aperçus approuvés et consentis, sans biographie ni description complète du projet |
| GET /api/waitlist/profiles/:id | Session Clerk | Détails approuvés d’une fiche consentie ; aucun accès à la fiche privée complète |
| POST /api/waitlist/profiles/:id/like | Session Clerk | Corps JSON avec liked: true ou false ; réponse likesCount et liked |
| GET /api/profile-photo?id=… | Profil approuvé et consenti | Image raster autorisée, aucun accès aux photos privées |
| GET /api/admin/session | Session Clerk et adresse principale vérifiée autorisée | Confirmation d’accès administrateur |
| GET /api/admin/profiles | Administrateur | Recherche filtrée, 24 fiches par page, sans photos dans la liste |
| GET /api/admin/profiles/:id | Administrateur | Questionnaire privé complet et photo |

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
- Publication et effacement traités manuellement ; administration en lecture seule pour la consultation.
- Configurer une instance Clerk de production avant lancement public.
- Les archives excluent les secrets et le rattachement Vercel.

## Préparation locale

Node.js 24, installation des dépendances avec le verrouillage pnpm, puis pnpm build. La préparation ne contacte ni Clerk, ni Neon, ni Resend. Les API s’exécutent sur Vercel ; un HTML local ne peut pas les exécuter.

## Fiche déjà enregistrée

La page Mon profil récupère automatiquement la fiche privée de la session. Une fiche existante s’affiche en lecture avec les réponses complètes. Le questionnaire ne réapparaît que sur Modifier ma fiche, et l’action devient Enregistrer mes modifications. Une erreur de récupération n’est jamais interprétée comme une absence de fiche : le formulaire reste masqué jusqu’à la confirmation du serveur. La même route conserve une seule fiche par compte.

## Accès au profil personnel

`mon-profil.html` est la page de consultation privée. Le bouton Mon profil et la photo du compte y conduisent. Elle lit les réponses enregistrées depuis GET /api/waitlist et n’affiche aucun formulaire ni brouillon. Modifier mes informations ouvre inscription.html?modifier=1 avec les réponses existantes. Une fiche déjà enregistrée sur inscription.html est redirigée vers Mon profil. Après chaque enregistrement réussi, le site ouvre Mon profil.

La photo de l’en-tête mène au profil Kairos. Les paramètres de compte Clerk et la déconnexion sont accessibles dans l’espace personnel. Le serveur continue de vérifier l’identité avant de retourner les données privées. Le build ajoute des versions aux URL des fichiers CSS et JavaScript pour éviter l’affichage d’un ancien contrôleur mis en cache.

## Administration

Configurer `KAIROS_ADMIN_EMAILS` côté serveur, avec les adresses principales vérifiées Clerk autorisées, séparées par des virgules. Aucune adresse n’est autorisée par défaut. Le lien Administration apparaît dans Mon profil et le pied de page après confirmation par le serveur. Toutes les routes administrateur refont cette vérification. Les fiches ne sont pas publiées par leur consultation.

## Découverte des projets et profils

La page publique affiche au maximum six aperçus réels issus du répertoire. Aucun faux profil ni compteur inventé n’est fourni. Les membres qui ouvrent l’accueil sont dirigés vers profils.html. Cette page contient les catégories Tout, Projets, Profils et Investisseurs et des filtres de recherche.

Un aperçu contient seulement les champs explicitement sélectionnés par server/discovery.js : prénom et initiale, photo consentie, ville et informations générales. Le clic sur une fiche, un favori ou un like sans session ouvre une invitation à créer un compte gratuit ou se connecter. Le choix de fiche est conservé temporairement dans sessionStorage, sous la forme d’un UUID et d’un horodatage, pour retrouver la fiche après connexion. Aucun jeton ni réponse de questionnaire n’y est enregistré par cette fonctionnalité.

L’API de liste ne renvoie jamais les descriptions détaillées. La nouvelle route GET /api/waitlist/profiles/:id vérifie la session Clerk existante et les conditions published/public_consent avant de renvoyer uniquement les données de présentation approuvées. L’API personnelle /api/waitlist et l’administration gardent leurs accès distincts. Les détails affichés sont effacés à la déconnexion, au changement de compte et à la fermeture de la fiche. Les requêtes tardives ne peuvent pas les réafficher pour un autre compte.

Aucun paiement n’est demandé pour consulter une fiche. Les favoris restent locaux ; les likes utilisent la route existante. La messagerie n’est pas implémentée. Les clés, le système de connexion, l’écriture des questionnaires, les e-mails et le schéma Neon n’ont pas été remplacés.
