# Installer la correction Kairos

Cette version garde les pages HTML et ajoute le serveur qui enregistre les fiches. Le même projet Vercel héberge les pages et les fonctions.

## 1. Ajouter les fichiers dans GitHub

1. Télécharger et extraire `Kairos-connexion-complete.zip` sur l’ordinateur.
2. Ouvrir le dépôt GitHub déjà relié au projet Kairos.
3. Choisir **Add file → Upload files**.
4. Glisser les fichiers ET les dossiers extraits à la racine du dépôt. Ne pas importer le ZIP ni un dossier parent contenant tout le site. `index.html`, `package.json` et `vercel.json` doivent se trouver au même niveau.
5. Valider avec **Commit changes**. Les fichiers du même nom sont remplacés. Si la branche est protégée, GitHub peut demander de créer une branche puis une demande de fusion.

Conserver l’arborescence, y compris le dossier `[id]`. Le dossier `api/` contient les fonctions ; `server/`, leur logique privée ; `scripts/`, la préparation du site.

Le lot complet inclut les pages, le style et le logo. Si votre design a évolué, utiliser plutôt `Kairos-correction-connexion.zip` : il conserve vos trois HTML, votre CSS, votre logo et votre `config.js`, en remplaçant `script.js` et en ajoutant les fichiers serveur. Il suppose les mêmes identifiants de formulaire que la version fournie dans cette conversation.

Ne jamais ajouter `.env.local`, `.vercel/` ou `node_modules/` à GitHub. Ils sont exclus des archives.

## 2. Vérifier les variables Vercel

Ouvrir **Vercel → projet Kairos → Settings → Environment Variables**. Garder les bonnes variables existantes ; ne pas créer de doublons.

| Nom exact | Valeur | Type conseillé |
| --- | --- | --- |
| `DATABASE_URL` | Connexion Neon existante, ajoutée normalement par l’intégration | Secret |
| `CLERK_PUBLISHABLE_KEY` | Clé publique Clerk `pk_test_…` ou `pk_live_…` | Config |
| `CLERK_SECRET_KEY` | Clé secrète `sk_test_…` ou `sk_live_…` de la même application et du même mode | Secret |
| `RESEND_API_KEY` | Clé d’envoi Resend `re_…` | Secret |
| `RESEND_TEST_TO` | Adresse e-mail utilisée pour créer le compte Resend | Config |

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` est aussi accepté si l’intégration l’a déjà créé. Le script de préparation injecte uniquement cette clé publique dans le `config.js` déployé. Aucun secret n’est copié dans les pages.

Si la clé publique est déjà dans votre `config.js`, la conserver. Renseigner aussi cette clé dans Vercel pour la vérification côté serveur. Les clés du navigateur et du serveur doivent correspondre à la même application Clerk.

### Sans nom de domaine

Le mode Resend par défaut est **test**. Il envoie uniquement une notification à `RESEND_TEST_TO`, qui doit être l’adresse du propriétaire du compte Resend. L’utilisateur inscrit ne reçoit pas d’e-mail dans ce mode ; sa fiche est tout de même enregistrée. Le message de succès le précise.

### Adresses du site et Clerk

Les adresses de déploiement et de production fournies automatiquement par Vercel sont autorisées côté serveur. Pour une adresse supplémentaire, ajouter `APP_URL` avec l’adresse HTTPS de base, sans `/inscription.html`. Plusieurs adresses contrôlées peuvent être indiquées dans `KAIROS_ALLOWED_ORIGINS`, séparées par des virgules.

La clé Clerk de test sert à la mise au point. Pour un lancement public, configurer l’instance de production et ses domaines dans Clerk, puis utiliser sa paire de clés de production. Le compte doit comporter un e-mail vérifié : l’adresse saisie dans le formulaire doit correspondre à une adresse vérifiée du compte.

### Badges « Needs Attention »

Le nom d’une variable ne garantit pas que sa valeur est correcte. Consulter le détail du badge dans Vercel. Conserver le lien des variables gérées par Neon avec cette intégration ; ne pas les supprimer au hasard.

## 3. Déployer

Dans **Vercel → projet Kairos → Settings → Build and Deployment**, utiliser le preset **Other** et Node.js **24.x**. Le fichier `vercel.json` fournit :

- Build Command : `node scripts/build.mjs` ;
- Output Directory : `public` ;
- installation : laisser Vercel détecter `pnpm-lock.yaml`.

Si d’anciens réglages du tableau de bord remplacent ces valeurs, les réinitialiser ou les aligner. La racine du projet doit contenir `package.json`.

Le commit GitHub peut lancer le déploiement automatiquement. Après un changement de variable, ouvrir **Deployments → dernier déploiement → ⋯ → Redeploy**. Attendre **Ready**, puis ouvrir ce nouveau déploiement ou l’adresse de production. Un ancien lien de déploiement reste attaché à son ancienne version.

## 4. Essayer une préinscription

1. Ouvrir le nouveau site HTTPS, pas un fichier local.
2. Créer un compte Clerk et vérifier son e-mail.
3. Compléter et envoyer la fiche avec cet e-mail vérifié.
4. La page doit confirmer l’enregistrement et préciser séparément le statut d’e-mail.

La première demande crée automatiquement quatre tables `kairos_…` dans la base existante. Le rôle Neon doit avoir le droit d’y créer des tables. Aucun effacement de table existante n’est prévu. Une même personne met à jour sa fiche sans créer de doublon. « Reprendre ma fiche enregistrée » récupère sa fiche privée après connexion.

En cas d’erreur, relever le texte et consulter **Vercel → Logs**. Ne pas publier les valeurs des clés, la connexion à la base ou les informations privées des personnes inscrites.

## Publication des profils

Les nouvelles fiches et les fiches modifiées restent privées, même si leur publication est autorisée. Le répertoire reste vide avant validation. `server/moderation.sql` fournit les requêtes pour consulter les fiches publiques proposées et publier manuellement une fiche approuvée avec consentement. Aucune interface d’administration n’est encore incluse.

Les e-mails, noms complets et établissements ne sont pas renvoyés dans le répertoire. L’âge et les préférences d’investissement respectent les choix de visibilité. Les likes nécessitent une session Clerk et sont conservés en base ; les favoris restent sur l’appareil.

## Quand vous aurez un domaine vérifié dans Resend

Ajouter `RESEND_MODE=live` et `RESEND_FROM` avec une adresse du domaine vérifié, puis redéployer. Les nouvelles inscriptions recevront une confirmation à leur adresse vérifiée. Modifier ce mode ne déclenche pas de campagne vers les personnes déjà inscrites.

Un échec Resend ne supprime pas la préinscription. Une nouvelle soumission peut retenter l’e-mail avec la même clé d’idempotence pendant 23 heures ; au-delà, une intervention manuelle est nécessaire. Aucun envoi par tâche planifiée n’est configuré.

## Documentation officielle

- [Variables Vercel](https://vercel.com/docs/environment-variables)
- [Fonctions Node.js Vercel](https://vercel.com/docs/functions/runtimes/node-js)
- [Sessions Clerk](https://clerk.com/docs/reference/backend/authenticate-request)
- [Limites de test Resend](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)
- [Connexion Neon](https://neon.com/docs/serverless/serverless-driver)
