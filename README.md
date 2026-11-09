# Nimba — Atelier IA

SaaS de génération de **sites web et de montages vidéo** par IA. Interface type Arena (zone de prompt, cartes de départ, historique, aperçu live dans un iframe sandboxé) et landing type GeniusCrea (crédits, tarifs en **FCFA**).

> Décrivez votre idée en français → Nimba **build** un site HTML complet ou **monte** une vidéo (storyboard + aperçu animé) → affinez par messages successifs → exportez le code.

**Nimba fait 2 choses** : l'atelier **Site** et l'atelier **Vidéo**, dans le même studio, avec le même solde de crédits et le même historique.

## Stack

Next.js 15 (App Router, React 19, TypeScript strict) · Supabase (auth, base, crédits atomiques) · API Anthropic pour la génération · paiement via un adaptateur à brancher.

## Démarrage

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

**Aucune clé n'est nécessaire pour essayer** : sans variables Supabase, l'application démarre automatiquement en **mode démo** :

- comptes, crédits et projets stockés en mémoire côté serveur (3 crédits offerts) ;
- générateur local déterministe (aucun appel réseau, site complet et responsive) ;
- achat de crédits simulé de bout en bout (`/api/checkout` → page de confirmation → `/api/webhook`) ;
- badge « mode démo » affiché dans l'interface.

Pour la production, un projet Supabase **dédié** est déjà créé et configuré : voir [Configuration Supabase de production](#configuration-supabase-de-production). `NIMBA_MODE=production` désactive tout repli vers le stockage en mémoire.

### Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique (auth côté client/serveur) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur : RPC de crédits, écriture des projets — **jamais exposée** |
| `ANTHROPIC_API_KEY` | Clé API de génération. Absente → générateur local |
| `ANTHROPIC_MODEL` | Modèle (défaut `claude-sonnet-4-5`) |
| `ANTHROPIC_MAX_TOKENS` | Budget de sortie (défaut `8000`) |
| `NEXT_PUBLIC_APP_URL` | URL publique utilisée pour les retours de paiement |
| `PAYMENT_WEBHOOK_SECRET` | Secret de vérification de signature pour votre adaptateur |
| `NIMBA_MODE` | `production` = jamais de repli démo (fail-fast) · `demo` = forcé · absent = auto |
| `NIMBA_TEST_ADMIN_EMAIL` / `NIMBA_TEST_ADMIN_PASSWORD` | **Démo uniquement** : amorce le compte de test. Ignorés quand `NIMBA_MODE=production` |
| `NIMBA_COOKIE_PARTITIONED` | `1` force `SameSite=None; Secure; Partitioned` si la détection de l'iframe échoue. Inutile en production top-level |

## Configuration Supabase de production

Un projet **dédié** a été créé ; le projet existant `Gestion Optima` (kolo-shop, 25 tables) n'a été ni lu en écriture ni modifié.

| Élément | Valeur |
| --- | --- |
| Organisation | `DBsdiawara` (`gryavhvcpfcuhmvptuqw`) |
| Projet | **Nimba AI** — ref `jyyqgymkxfqirgzeyjcw` |
| Région | `eu-central-1` |
| Plan | Free |
| URL | `https://jyyqgymkxfqirgzeyjcw.supabase.co` |
| Santé | `ACTIVE_HEALTHY` (`db`, `auth`, `rest`) |

### Base de données

`supabase/schema.sql` a été appliqué par la migration versionnée `nimba_initial_schema`. Vérifié sur le projet réel :

- 4 tables : `profiles`, `credit_transactions`, `projects` (`kind` + `storyboard jsonb`), `payments` ;
- RLS activée sur les 4 tables et **4 politiques de lecture seule** par `auth.uid()` ;
- trigger `on_auth_user_created` → 3 crédits offerts + ligne de journal, trigger `projects_touch_updated_at` ;
- 3 fonctions `SECURITY DEFINER` (`consume_credit`, `refund_credit`, `confirm_payment`) avec `EXECUTE` **réservé au `service_role`** ;
- test de bout en bout : inscription → 3 crédits, débit → 2, remboursement → 3, paiement de 40 crédits → 43, **webhook rejoué → `false`** (aucun double crédit), 4 écritures de journal. Utilisateur de test supprimé ensuite ; les tables sont vides.

### Authentification

| Paramètre | Valeur |
| --- | --- |
| `external_email_enabled` | `true` (e-mail + mot de passe) |
| `external_phone_enabled` | `false` |
| `disable_signup` | `false` |
| `mailer_autoconfirm` | `true` — aucun SMTP n'est configuré ; **à repasser à `false`** après branchement d'un SMTP et activation de la confirmation d'e-mail |
| `jwt_exp` | `3600` s |
| rotation du refresh token | activée, intervalle de réutilisation `10` s |
| `site_url` | `https://nimba-ai-sdiawara.vercel.app` (production Vercel) |
| `uri_allow_list` | `https://nimba-ai-sdiawara.vercel.app/**,https://nimba-ai-git-arena-f0ba93da-nimba-ai-sdiawara.vercel.app/**,https://*.vercel.app/**,http://localhost:3000/**` |

### Variables de l'application

`.env.production.local` (ignoré par Git, chargé par `next build` / `next start`, **pas** par `next dev`) contient `NIMBA_MODE=production`, l'URL du projet, les deux clés et les emplacements `ANTHROPIC_API_KEY` / `PAYMENT_WEBHOOK_SECRET`. Ces variables sont **déjà déclarées sur le projet Vercel** (voir [Déploiement Vercel](#déploiement-vercel)) : `NIMBA_MODE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `ANTHROPIC_MODEL`, `ANTHROPIC_MAX_TOKENS`. Il reste à renseigner `ANTHROPIC_API_KEY`, `PAYMENT_WEBHOOK_SECRET` et les clés du prestataire de paiement.

> Les clés renseignées sont les clés JWT « legacy » `anon` / `service_role` fournies à la création du projet, compatibles avec la version installée de `@supabase/supabase-js`. La clé `sb_secret_…` est masquée par l'API de gestion : la récupérer dans le dashboard pour l'utiliser à la place.

### Durcissements appliqués au code

- `NIMBA_MODE=production` **interdit le repli démo** : si une clé manque, l'application échoue de façon visible au lieu de recréer silencieusement des comptes en mémoire.
- **Renouvellement automatique du JWT** via `refreshSession` avec réécriture des cookies `httpOnly`, compatible avec la rotation des refresh tokens.
- **Déconnexion globale** : `auth.admin.signOut(jwt, 'global')` en plus de la suppression des cookies, ce qui invalide les refresh tokens côté Supabase.
- **`GET /api/health`** : diagnostic sans secret (`status`, `mode`, variables manquantes, IA, paiement) ; renvoie `503` si la production est mal configurée.

### Ce qu'il reste à brancher

- **Paiement réel** : en production, aucun adaptateur n'est enregistré et `/api/checkout` renvoie **HTTP 501 `PAYMENT_NOT_CONFIGURED`**. Il faut implémenter `createPayment` / `verifyWebhook` dans `src/lib/payments.ts` (Mobile Money, Wave, Orange Money, cartes…), vérifier la signature du webhook avec `PAYMENT_WEBHOOK_SECRET` et renvoyer la référence créée par `/api/checkout`. Tant que ce n'est pas fait, la recharge est indisponible en production — les 3 crédits offerts fonctionnent.
- **`ANTHROPIC_API_KEY`** : absente → générateur local déterministe, fonctionnel mais sans IA.
- **Accès public** : le projet Vercel applique par défaut la protection « Vercel Authentication » (`ssoProtection: all_except_custom_domains`). Tant qu'elle est active, l'URL `*.vercel.app` renvoie une page de connexion Vercel ; la désactiver dans *Project Settings → Deployment Protection* ou attacher un domaine personnalisé (les domaines personnalisés ne sont pas soumis à cette protection). Le connecteur Vercel disponible ici ne permet pas de modifier ce réglage.
- **Limite de ce sandbox** : l'environnement de développement ne peut pas joindre `*.supabase.co`, ni l'URL Vercel protégée. L'inscription/connexion réelles n'ont donc pas pu être exercées depuis l'aperçu local ; elles ont été validées au niveau SQL via le connecteur Supabase. L'aperçu (`next dev`) reste volontairement en **mode démo**, `.env.production.local` n'étant pas chargé en développement. Premier contrôle après ouverture du site : `GET /api/health` doit renvoyer `{"status":"ok","mode":"production"}`, puis tester inscription → génération → historique.

## Déploiement Vercel

| Élément | Valeur |
| --- | --- |
| Projet | `nimba-ai` — `prj_DDNnqcyLum6KJ5CzoFeaHTxzWt0p` |
| Équipe | `Sdiawara` — `team_rNftP3gJ7YJxA9TvfO5OVP1G` |
| URL de production | `https://nimba-ai-sdiawara.vercel.app` |
| Déploiement promu | `dpl_H2pRnktC9HFnHZNdf52bMym3sLLB` (commit `6ccae81`, branche `arena/f0ba93da-nimba-ai`, `READY` / `PROMOTED`) |
| Framework / Node | Next.js 15 · Node 26.x |
| Cible | `production`, région `iad1` |

Le dépôt GitHub `sdiawara224/Nimba-AI` est relié au projet ; la branche de la session a été commitée et poussée, puis déployée via le connecteur Vercel. `NEXT_PUBLIC_APP_URL`, `site_url` et `uri_allow_list` Supabase pointent désormais sur cette URL. Les clés sont stockées chiffrées dans les variables d'environnement Vercel, jamais dans Git.

> **Important** : la protection Vercel SSO est active sur `*.vercel.app` et le connecteur ne permet pas de la désactiver. Pour rendre le site accessible à tous, désactiver *Vercel Authentication* dans le dashboard ou attacher un domaine personnalisé vérifié. Aucun test HTTP public (ni GoTrue réel) n'a donc été enregistré depuis l'extérieur après le déploiement.

## Compte de test

Un compte de test **avec mot de passe** est disponible, avec les **mêmes identifiants** dans l'aperçu démo et dans le projet Supabase « Nimba AI » :

| | |
| --- | --- |
| E-mail | `admin.test@nimba.ai` |
| Mot de passe | voir `TEST_ACCESS.local.md` (fichier local, ignoré par Git, non versionné) |
| Crédits | **999** au lieu de 3 |

- **Aperçu / mode démo** : le compte est amorcé au premier appel à `/api/auth` depuis `.env.development.local`. Trois portes d'entrée : `/login` → onglet **Connexion** (e-mail + mot de passe), le bouton **« Connexion compte de test (999 crédits) »** sur `/login` ou sur la page de garde de `/studio`, et le bouton équivalent sur la garde de `/admin`. Le mot de passe est lu côté serveur et n'est jamais envoyé au bundle client.
- **Aperçu intégré (iframe)** : voir la section dédiée ci-dessous. Une session sans cookie prend le relais quand le navigateur bloque les cookies tiers.
- **Supabase** : utilisateur `auth.users` + identité `email`, mot de passe haché en bcrypt `$2a$10$` (vérifié en base), e-mail confirmé, 999 crédits et 2 écritures de journal. Utilisable une fois l'application déployée : ce sandbox ne peut pas joindre `*.supabase.co`, la connexion réelle GoTrue n'a donc pas pu être exercée depuis l'aperçu.
- La connexion démo **vérifie désormais le mot de passe** (ce n'était pas le cas auparavant) : un mauvais mot de passe renvoie `401`.

### Rôle administrateur et back-office `/admin`

Ce compte porte un **vrai rôle admin** (`isAdmin` dans la session) et donne accès à `/admin` : statistiques globales (comptes, projets, crédits, paiements confirmés, total FCFA), liste de tous les utilisateurs et **octroi manuel de +10 crédits** par compte. Un lien « ⚙ Admin » apparaît dans l'en-tête.

| Environnement | Origine du rôle | Écriture des crédits |
| --- | --- | --- |
| Démo | `DemoUser.isAdmin`, posé par `ensureDemoTestAccount()` | `grantDemoCredits()` en mémoire |
| Supabase | `auth.users.raw_app_meta_data.nimba_admin = true` (**app_metadata**, non modifiable par l'utilisateur) | RPC atomique `grant_credits(uuid, integer)`, réservée au `service_role`, journalisée (`admin_grant`), montant borné 1–100 |

L'API `/api/admin` vérifie **côté serveur** `session.isAdmin` sur chaque requête : `401` si non connecté, `403` pour un compte normal, quel que soit le contenu envoyé par le client. Le back-office lit au-delà de la RLS avec la clé `service_role`, uniquement après cette vérification.

**À supprimer avant mise en ligne** : le compte de test, `.env.development.local`, `TEST_ACCESS.local.md`, le raccourci `action: 'test-admin'`, puis décider si `/admin` doit être conservé (dans ce cas : ajouter un journal d'audit, une limitation de débit et une authentification renforcée). Côté Supabase :

```sql
DELETE FROM auth.users WHERE email = 'admin.test@nimba.ai';
```

La suppression en cascade retire aussi le profil, le journal de crédits, les projets et l'identité e-mail.


## Sessions dans l'aperçu intégré (iframe)

Un aperçu affiché en iframe **cross-site** pose un problème classique : le navigateur peut refuser de conserver/renvoyer les cookies tiers. `/api/auth` répond alors `200` mais `/api/session` reste anonyme, et l'utilisateur reste bloqué sur « Votre atelier vous attend ». Trois niveaux de repli sont en place :

1. **Cookies adaptés** : `SameSite=None; Secure; Partitioned` (CHIPS) quand la requête vient de `*.e2b.app` / `*.vercel.app` (détection via `Origin`, `X-Forwarded-Host`, `X-Forwarded-Proto`), sinon `SameSite=Lax; Secure`. Variable `NIMBA_COOKIE_PARTITIONED=1` pour forcer ce mode si la détection échoue.
2. **Session sans cookie** (le plus robuste) : en mode démo, `/api/auth` renvoie un `sessionToken` aléatoire (64 caractères). Le client le conserve en mémoire JS + `localStorage` (`src/lib/client-session.ts`) et l'envoie sur **tous** les appels `/api/*` via `Authorization: Bearer …`. `getSession()` le résout côté serveur quand aucun cookie n'est présent. Le pont `fetch` ne modifie que les URL `/api/…` en chaîne, jamais les requêtes internes du routeur Next.js. Le token est révoqué à la déconnexion.
3. **Nouvel onglet** : si malgré tout la session est vide après connexion, un message explicite s'affiche avec un bouton **« ↗ Ouvrir l'aperçu dans un nouvel onglet »** (sur `/login`, `/studio` et `/admin`). En contexte top-level, les cookies de premier niveau fonctionnent toujours.

Parcours vérifié **avec zéro cookie** : connexion → `/api/session` (999 crédits, `isAdmin: true`) → `/api/admin` `200` → génération site + vidéo → historique → checkout → webhook `applied:true` puis `false` → logout → token révoqué et session vide.

> Le jeton sans cookie est **réservé au mode démo** : il est stocké côté serveur en mémoire et côté client dans `localStorage`. Ce n'est pas un mécanisme à utiliser pour la production (préférer le domaine top-level et les cookies `httpOnly` Supabase). Il n'est pas émis quand `NIMBA_MODE=production`.

## Fonctionnement

- **Inscription** : 3 crédits offerts via le trigger SQL `handle_new_user` (ou à la création du compte démo).
- **`/api/generate`** : vérifie la session, débite 1 crédit de façon **atomique** (RPC `consume_credit`), appelle l'IA, enregistre le projet. **Crédit remboursé** (`refund_credit`) si l'appel à l'IA ou l'enregistrement échoue. Le corps accepte `kind: 'site' | 'video'` ; sans `projectId` c'est une création, avec c'est une modification (du HTML ou du storyboard).
- **`/studio`** : sélecteur `◇ Site / ▶ Vidéo`, cartes de départ et modifications rapides propres à chaque atelier, historique, aperçu dans un `iframe sandbox` (sans `allow-same-origin`), vue Code, vue Storyboard, copie et export `.html` (+ `.md` pour le storyboard).
- **Atelier Vidéo** (`src/lib/video.ts`) : un prompt produit un `Storyboard` (3 à 8 plans : titre, durée, visuel, voix off, transition, palette) et un **aperçu animé 16:9 autonome** — lecteur HTML/CSS/JS avec transitions, barre de progression, sous-titres, contrôles clavier et navigation par plans, sans aucune ressource externe. Les modifications courantes sont comprises : couleur, durée totale, rythme, titre, voix off, ajout/suppression de plan.
- **`/api/checkout` + `/api/webhook`** : commande créée côté serveur, confirmation de paiement **idempotente** (`confirm_payment`) : un webhook rejoué n'ajoute jamais deux fois les crédits.
- **Générateurs** : `src/lib/generator.ts` (sites) et `src/lib/video.ts` (vidéos). Avec clé Anthropic, l'IA rédige le HTML complet ou le storyboard JSON ; sans clé, des générateurs locaux déterministes prennent le relais. Le rendu du lecteur vidéo est toujours local, pour rester reproductible et sans dépendance.
- **Ce que la vidéo n'est pas** : aucun fichier MP4 n'est produit et aucun service de rendu externe n'est appelé. Le livrable est un storyboard lisible/exportable et un film animé HTML autonome, jouable dans le navigateur.

### Structure

```
src/app/
  page.tsx                    landing (fonctionnement, fonctionnalités, tarifs FCFA, FAQ)
  login/page.tsx              inscription / connexion / accès démo
  studio/page.tsx             atelier : prompt, cartes, historique, aperçu, export
  checkout/simulate/page.tsx  paiement simulé (mode démo uniquement)
  admin/page.tsx              back-office admin (statistiques, comptes, octroi de crédits)
  api/{auth,session,projects,generate,checkout,webhook,health,admin}/route.ts
src/lib/client-session.ts    jeton de session sans cookie + pont fetch (client)
  cgu/page.tsx               CGU / CGV (texte fourni par l'éditeur)
  confidentialite/page.tsx   politique de confidentialité
src/components/LegalArticle.tsx  rendu des pages légales (sommaire, ancres, mailto)
src/lib/legal.ts             contenu juridique structuré
src/lib/
  env.ts plans.ts session.ts supabase.ts store.ts payments.ts generator.ts
supabase/schema.sql           tables, RLS, trigger d'inscription, RPC atomiques
TEST_ACCESS.local.md          identifiants de test (ignoré par Git, non versionné)
```

### Schéma Supabase

`profiles` (solde), `projects` (avec `kind` = `site`/`video` et `storyboard` en `jsonb`), `credit_transactions` (journal), `payments` (référence = clé d'idempotence). Le script est rejouable : les colonnes des ateliers sont ajoutées par `ADD COLUMN IF NOT EXISTS` si la base existe déjà. RLS en lecture pour l'utilisateur ; toutes les mutations de solde passent par des fonctions `SECURITY DEFINER` réservées au `service_role` : `consume_credit`, `refund_credit`, `confirm_payment` et `grant_credits` (octroi admin).

## À finir avant la mise en ligne

- **Paiement** : implémenter `createPayment` et `verifyWebhook` dans `src/lib/payments.ts` pour votre prestataire (Mobile Money / Orange Money / Wave / cartes), puis appeler `registerPaymentProvider(...)` au démarrage du serveur. **Sans cela, l'achat renvoie une erreur explicite (HTTP 501)** au lieu de créditer gratuitement. L'adaptateur doit vérifier la signature du webhook et renvoyer la référence créée par `/api/checkout`.
- Ajuster prix et crédits dans `src/lib/plans.ts`.
- Ajouter une limitation de débit (rate limiting) sur `/api/generate`, `/api/auth` et `/api/admin` ; journaliser les actions d'administration.
- **Faire relire les pages légales par un conseil juridique** : voir les points de vigilance ci-dessous.
- Pour un vrai export MP4, brancher un service de rendu derrière une interface du même type que `src/lib/payments.ts` ; l'architecture du storyboard est déjà prête.
- Supprimer le compte de test et les fichiers de credentials locaux (voir ci-dessus), ou durcir `/admin` avant de le conserver.
- Configurer un SMTP Supabase et désactiver `mailer_autoconfirm` (`site_url` / `uri_allow_list` sont déjà alignés sur l'URL Vercel).
- Désactiver la protection Vercel SSO ou attacher un domaine personnalisé, puis vérifier `GET /api/health` depuis l'extérieur.
- Brancher les clés Anthropic et le prestataire de paiement (voir ci-dessus), puis rejouer un parcours complet sur le domaine public.
- Activer une protection anti-abus (captcha Supabase sur l'inscription + rate limiting distribué).
- Exécutez `npm run typecheck` et `npm run build` avant chaque déploiement.

## Pages légales

- `/cgu` : reproduction fidèle des **Conditions Générales d'Utilisation & de Vente** fournies (dernière mise à jour 25 septembre 2026), avec sommaire, ancres et lien `mailto:optimaworksgn@gmail.com`.
- `/confidentialite` : politique décrivant le traitement réellement mis en œuvre (e-mail, crédits, projets, cookies de session `httpOnly`, Supabase, Anthropic, conservation, droits). **Modèle à faire valider avant publication.**
- Liens présents dans le pied de page de la landing et à l'inscription (« En créant un compte, vous acceptez… »).

### Points de vigilance entre les CGU et l'application

Le texte des CGU décrit un produit et un modèle économique plus larges que cette implémentation. Avant mise en ligne, il faut soit aligner le produit, soit faire corriger le texte :

| Sujet | Dans les CGU | Dans l'application |
| --- | --- | --- |
| Objet du service | angles publicitaires, scripts 9:16, copies Meta/TikTok/Google, calendrier, prompts visuels multi-formats | 2 ateliers : build de sites HTML et montage vidéo storyboardé |
| Offres | Free 3 crédits, Starter 20/mois et Pro 60/mois (**abonnements**), Recharge 5 crédits | 3 packs à achat unique en FCFA, sans abonnement |
| Parrainage | 2 crédits au filleul, 20 % au parrain | non implémenté |
| Éditeur / propriété / droit | Optima Works (Conakry) / MonWe Infinity LLC / droit du Nouveau-Mexique | incohérences à trancher par l'éditeur |
| Responsabilité publicitaire | champs `[crochets]`, pas de chiffres inventés | règle non appliquée aux générateurs actuels |

## Interface

Refonte visuelle inspirée des références fournies : thème nuit GeniusCrea (magenta → orange → doré), bandeau « 1 crédit = 1 génération », 3 étapes Décrivez / Générez / Publiez, en-tête avec sélecteur FR/EN, pastille de crédits et espace de travail, et cartes de démarrage type Arena (icône + titre + description) sur la landing et dans le studio.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (vérifie aussi les types) |
| `npm start` | Serveur de production |
| `npm run typecheck` | `tsc --noEmit` seul |
