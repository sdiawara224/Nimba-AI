# Nimba — Atelier IA

SaaS de génération de **sites web et de montages vidéo** par IA. Interface type Arena (zone de prompt, cartes de départ, historique, aperçu live dans un iframe sandboxé) et landing type GeniusCrea (crédits, tarifs en **GNF / $**).

> Décrivez votre idée en français → Nimba **build** un site HTML complet ou **monte** une vidéo (storyboard + aperçu animé) → affinez par messages successifs → exportez le code.

**Nimba fait 2 choses** : l'atelier **Site** et l'atelier **Vidéo**, dans le même studio, avec le même solde de crédits et le même historique.

> **Mode de travail actuel : 100 % local.** Le projet tourne avec `vercel dev --local` sur `http://localhost:3000` : **aucun déploiement, aucun domaine public, aucun CNAME/DNS à publier**. Voir [Exécution locale avec Vercel](#exécution-locale-avec-vercel).

## Stack

Next.js 15 (App Router, React 19, TypeScript strict) · Supabase (auth, base, crédits atomiques) · API Anthropic pour la génération · paiement via un adaptateur à brancher.

## Démarrage — Vercel en local (sans publication)

```bash
npm install
npm run dev:vercel   # http://localhost:3000
```

`npm run dev:vercel` lance l'émulation Vercel **sans liaison à un projet, sans déploiement et sans domaine** : `vercel dev --local --listen 0.0.0.0:3000 --yes`. Le CLI démarre `next dev` et expose aussi les ressources locales Vercel (Queues `:4782`, Runtime Cache `:4783`, Schedules `:4784`). Le serveur écoute sur `0.0.0.0` pour être visible dans l'aperçu intégré. `npm run dev` (Next.js direct) reste disponible sur le même port.

Aucun `vercel link`, aucun `vercel deploy` et aucun `vercel.json` ne sont nécessaires. Le compte admin de test en un clic est optionnel : il lit `NIMBA_TEST_ADMIN_EMAIL` / `NIMBA_TEST_ADMIN_PASSWORD` depuis `.env.development.local` (fichier ignoré par Git). Sans lui, l'inscription libre du mode démo fonctionne toujours et donne 3 crédits.

**Aucune clé n'est nécessaire pour essayer** : sans variables Supabase, l'application démarre automatiquement en **mode démo** :

- comptes, crédits et projets stockés en mémoire côté serveur (3 crédits offerts) ;
- générateur local déterministe (aucun appel réseau, site complet et responsive) ;
- achat de crédits simulé de bout en bout (`/api/checkout` → page de confirmation → `/api/webhook`) ;
- badge « mode démo » affiché dans l'interface.

Pour la production, un projet Supabase **dédié** est déjà créé et configuré : voir [Configuration Supabase de production](#configuration-supabase-de-production). `NIMBA_MODE=production` désactive tout repli vers le stockage en mémoire. **Il n'est pas utilisé dans le mode local actuel.**

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
| `site_url` | `http://localhost:3000` (aligné sur le mode local) |
| `uri_allow_list` | `http://localhost:3000/**,http://127.0.0.1:3000/**` |

### Variables de l'application

`.env.production.local` (ignoré par Git, chargé par `next build` / `next start`, **pas** par `next dev`) contient `NIMBA_MODE=production`, l'URL du projet, les deux clés et les emplacements `ANTHROPIC_API_KEY` / `PAYMENT_WEBHOOK_SECRET`. **Elle n'est pas utilisée dans le mode local actuel.** Les mêmes variables restent déclarées sur le projet Vercel (voir [Exécution locale avec Vercel](#exécution-locale-avec-vercel)), mais `NEXT_PUBLIC_APP_URL` y a été remise à `http://localhost:3000` et **aucun nouveau déploiement n'est effectué**. Les clés ne sont jamais dans Git. Il reste à renseigner `ANTHROPIC_API_KEY`, `PAYMENT_WEBHOOK_SECRET` et les clés du prestataire de paiement le jour où une mise en ligne serait décidée.

> Les clés renseignées sont les clés JWT « legacy » `anon` / `service_role` fournies à la création du projet, compatibles avec la version installée de `@supabase/supabase-js`. La clé `sb_secret_…` est masquée par l'API de gestion : la récupérer dans le dashboard pour l'utiliser à la place.

### Durcissements appliqués au code

- `NIMBA_MODE=production` **interdit le repli démo** : si une clé manque, l'application échoue de façon visible au lieu de recréer silencieusement des comptes en mémoire.
- **Renouvellement automatique du JWT** via `refreshSession` avec réécriture des cookies `httpOnly`, compatible avec la rotation des refresh tokens.
- **Déconnexion globale** : `auth.admin.signOut(jwt, 'global')` en plus de la suppression des cookies, ce qui invalide les refresh tokens côté Supabase.
- **`GET /api/health`** : diagnostic sans secret (`status`, `mode`, variables manquantes, IA, paiement) ; renvoie `503` si la production est mal configurée.

### Ce qu'il reste à brancher

- **Paiement réel** : en production, aucun adaptateur n'est enregistré et `/api/checkout` renvoie **HTTP 501 `PAYMENT_NOT_CONFIGURED`**. Il faut implémenter `createPayment` / `verifyWebhook` dans `src/lib/payments.ts` (Mobile Money, Wave, Orange Money, cartes…), vérifier la signature du webhook avec `PAYMENT_WEBHOOK_SECRET` et renvoyer la référence créée par `/api/checkout`. Tant que ce n'est pas fait, la recharge est indisponible en production — les 3 crédits offerts fonctionnent.
- **`ANTHROPIC_API_KEY`** : absente → générateur local déterministe, fonctionnel mais sans IA.
- **Publication** : **aucune, conformément à la demande.** `nimba.optima-works.gn` a été **détaché du projet Vercel** (il reste simplement vérifié dans le compte). Aucun CNAME, aucun enregistrement DNS et aucun domaine personnalisé ne sont à publier. Le projet Vercel `nimba-ai` et ses anciens déploiements restent dans l'historique du compte, mais plus rien n'est déployé ni exposé : le travail se fait uniquement via `npm run dev:vercel`.
- **Limite de ce sandbox** : l'environnement de développement ne peut pas joindre `*.supabase.co`. L'inscription/connexion GoTrue réelles n'ont donc pas pu être exercées depuis l'aperçu local ; elles ont été validées au niveau SQL via le connecteur Supabase. L'aperçu (`vercel dev --local`) reste volontairement en **mode démo**, `.env.production.local` n'étant pas chargé en développement.

## Exécution locale avec Vercel (sans publication)

**Choix actuel** : tout le projet tourne en local via l'émulation Vercel. Aucun déploiement n'est créé, aucun domaine n'est publié, aucun enregistrement DNS n'est à modifier.

| Élément | Valeur |
| --- | --- |
| Commande | `npm run dev:vercel` → `vercel dev --local --listen 0.0.0.0:3000 --yes` |
| URL locale | `http://localhost:3000` (serveur lié sur `0.0.0.0:3000` pour l'aperçu intégré) |
| Ressources Vercel locales | Queues `:4782`, Runtime Cache `:4783`, Schedules `:4784` |
| Variables d'environnement | fichiers `.env.*.local` uniquement ; **aucune** n'est tirée du compte Vercel |
| Domaines du projet | **aucun domaine personnalisé** (`nimba.optima-works.gn` détaché) |
| Projet Vercel | conservé pour information : `nimba-ai` — `prj_DDNnqcyLum6KJ5CzoFeaHTxzWt0p`, équipe `team_rNftP3gJ7YJxA9TvfO5OVP1G` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (également remis à cette valeur sur le projet Vercel) |

`--local` démarre le CLI **sans `vercel link`** : pas d'authentification, pas de `vercel.json`, pas de récupération des variables distantes, pas de `create_deployment`. Le CLI détecte Next.js et lance `next dev --port $PORT`, ce qui reproduit en local les routes et les fonctions serverless. Le serveur écoute sur `0.0.0.0` afin d'accepter l'hôte de l'aperçu `*.e2b.app`.

### Compte Vercel / Supabase mis en cohérence avec le local

- `nimba.optima-works.gn` **retiré des domaines du projet** (`remove_project_domain` → `success: true`). Il reste simplement vérifié dans le compte Vercel, sans alias ni publication.
- Aucun CNAME à publier : `nimba → d13183f263158da0.vercel-dns-017.com.` n'est **plus** une étape du projet.
- `NEXT_PUBLIC_APP_URL` Vercel : `https://nimba.optima-works.gn` → `http://localhost:3000`.
- Supabase Auth : `site_url = http://localhost:3000`, `uri_allow_list = http://localhost:3000/**,http://127.0.0.1:3000/**`.
- Les anciens déploiements (`dpl_AkYF…`, `dpl_5xP1…`, `dpl_H2p…`, `dpl_EFi…`, `dpl_FDJ2…`) restent dans l'historique Vercel derrière le SSO `*.vercel.app` ; **aucun nouveau déploiement n'est effectué** et ces URLs ne sont pas utilisées.

### Vérifications locales effectuées

| Contrôle | Résultat |
| --- | --- |
| `npm run dev:vercel` | `Ready! Available at http://localhost:3000`, Next.js 15.5.29, `.env.development.local` chargé |
| `GET /api/health` | 200, `{"status":"ok","mode":"demo"}` |
| Pages avec hôte d'aperçu `*.e2b.app` | `/`, `/login`, `/studio`, `/admin`, `/cgu`, `/confidentialite`, `/checkout/simulate`, `/api/health`, `/api/session` → 200 |
| Smoke E2E zéro cookie (`logs/e2e-vercel-local.log`) | 13 étapes OK : admin, site, vidéo, checkout, webhook `true` puis `false`, logout/révocation, inscription, `403` utilisateur normal |
| `npm run typecheck` / `npm run build` | 0 / 17 routes (`logs/build-vercel-local.log`) |
| Tarifs rendus sur `/` | `75 000 GNF · 8,67 $`, `225 000 GNF · 26,01 $`, `525 000 GNF · 60,69 $` |

> **Non fait, volontairement** : rattacher un domaine, publier un CNAME, déployer en production, ouvrir un accès public ou valider GoTrue depuis un hôte externe. Le connecteur Vercel ne permet de toute façon ni de désactiver le SSO ni d'écrire les DNS ; ces étapes ne sont simplement plus au programme.

## Devise et tarifs

Les prix sont affichés **en GNF avec l'équivalent $ à côté** (`75 000 GNF · 8,67 $`). Le FCFA a été retiré de l'interface, des API et du schéma.

| Pack | Crédits | Ancien prix | Nouveau prix |
| --- | --- | --- | --- |
| Découverte | 10 | 5 000 FCFA | `75 000 GNF · 8,67 $` |
| Créateur | 40 | 15 000 FCFA | `225 000 GNF · 26,01 $` |
| Studio | 120 | 35 000 FCFA | `525 000 GNF · 60,69 $` |

Conversion **indicative** (non bancaire) définie dans `src/lib/plans.ts` :

```text
1 $ ≈ 575 FCFA
1 $ ≈ 8 650 GNF
→ 1 FCFA ≈ 15,04 GNF
```

Les anciens montants FCFA ont été convertis puis arrondis au multiple de 5 000 GNF. `GNF_PER_USD` sert à calculer l'équivalent `$` (`formatUsd`) et le total admin. La colonne Supabase `payments.amount_gnf`, le paramètre `confirm_payment(p_amount_gnf)` et les champs `amountGnf` / `revenueGnf` / `revenueUsd` ont été renommés en conséquence (migration `20261109222655 nimba_currency_gnf_usd`).

Migration SQL reproductible : `supabase/migrations/20261109222655_nimba_currency_gnf_usd.sql`. Vérification locale : `npm run check:currency` (prix, équivalents `$`, absence de FCFA dans l'UI et le schéma).

> **Avant mise en ligne** : remplacer ce taux indicatif et ces montants arrondis par les prix contractuels validés avec le prestataire de paiement.

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

Ce compte porte un **vrai rôle admin** (`isAdmin` dans la session) et donne accès à `/admin` : statistiques globales (comptes, projets, crédits, paiements confirmés, total GNF / $), liste de tous les utilisateurs et **octroi manuel de +10 crédits** par compte. Un lien « ⚙ Admin » apparaît dans l'en-tête.

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
  page.tsx                    landing (fonctionnement, fonctionnalités, tarifs GNF / $, FAQ)
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

## À finir avant une éventuelle mise en ligne

> Le mode actuel est **local et sans publication** : aucun de ces points n'est nécessaire pour travailler sur le projet. Ils restent notés pour le jour où une mise en ligne serait décidée.

- **Paiement** : implémenter `createPayment` et `verifyWebhook` dans `src/lib/payments.ts` pour votre prestataire (Mobile Money / Orange Money / Wave / cartes), puis appeler `registerPaymentProvider(...)` au démarrage du serveur. **Sans cela, l'achat renvoie une erreur explicite (HTTP 501)** au lieu de créditer gratuitement. L'adaptateur doit vérifier la signature du webhook et renvoyer la référence créée par `/api/checkout`.
- Ajuster prix et crédits dans `src/lib/plans.ts`, et remplacer le taux indicatif `1 $ ≈ 8 650 GNF` par les montants contractuels.
- Ajouter une limitation de débit (rate limiting) sur `/api/generate`, `/api/auth` et `/api/admin` ; journaliser les actions d'administration.
- **Faire relire les pages légales par un conseil juridique** : voir les points de vigilance ci-dessous.
- Pour un vrai export MP4, brancher un service de rendu derrière une interface du même type que `src/lib/payments.ts` ; l'architecture du storyboard est déjà prête.
- Supprimer le compte de test et les fichiers de credentials locaux (voir ci-dessus), ou durcir `/admin` avant de le conserver.
- Configurer un SMTP Supabase et désactiver `mailer_autoconfirm`, puis remettre `site_url` / `uri_allow_list` sur l'URL publique choisie.
- **Si** un domaine est décidé : le rattacher au projet Vercel, publier son CNAME chez le registrar, puis vérifier `GET /api/health` depuis l'URL publique. Rien de tout cela n'est fait aujourd'hui.
- Brancher les clés Anthropic et le prestataire de paiement (voir ci-dessus), puis rejouer un parcours complet sur l'environnement cible.
- Activer une protection anti-abus (captcha Supabase sur l'inscription + rate limiting distribué).
- Exécuter `npm run typecheck` et `npm run build` avant chaque déploiement.

## Pages légales

- `/cgu` : reproduction fidèle des **Conditions Générales d'Utilisation & de Vente** fournies (dernière mise à jour 25 septembre 2026), avec sommaire, ancres et lien `mailto:optimaworksgn@gmail.com`.
- `/confidentialite` : politique décrivant le traitement réellement mis en œuvre (e-mail, crédits, projets, cookies de session `httpOnly`, Supabase, Anthropic, conservation, droits). **Modèle à faire valider avant publication.**
- Liens présents dans le pied de page de la landing et à l'inscription (« En créant un compte, vous acceptez… »).

### Points de vigilance entre les CGU et l'application

Le texte des CGU décrit un produit et un modèle économique plus larges que cette implémentation. Avant mise en ligne, il faut soit aligner le produit, soit faire corriger le texte :

| Sujet | Dans les CGU | Dans l'application |
| --- | --- | --- |
| Objet du service | angles publicitaires, scripts 9:16, copies Meta/TikTok/Google, calendrier, prompts visuels multi-formats | 2 ateliers : build de sites HTML et montage vidéo storyboardé |
| Offres | Free 3 crédits, Starter 20/mois et Pro 60/mois (**abonnements**), Recharge 5 crédits | 3 packs à achat unique en GNF / $, sans abonnement |
| Parrainage | 2 crédits au filleul, 20 % au parrain | non implémenté |
| Éditeur / propriété / droit | Optima Works (Conakry) / MonWe Infinity LLC / droit du Nouveau-Mexique | incohérences à trancher par l'éditeur |
| Responsabilité publicitaire | champs `[crochets]`, pas de chiffres inventés | règle non appliquée aux générateurs actuels |

## Interface

Refonte visuelle inspirée des références fournies : thème nuit GeniusCrea (magenta → orange → doré), bandeau « 1 crédit = 1 génération », 3 étapes Décrivez / Générez / Publiez, en-tête avec sélecteur FR/EN, pastille de crédits et espace de travail, et cartes de démarrage type Arena (icône + titre + description) sur la landing et dans le studio.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js direct (`next dev -H 0.0.0.0`) |
| `npm run dev:vercel` | **Recommandé** : `vercel dev --local`, émulation Vercel sans déploiement ni domaine |
| `npm run build` | Build de production (vérifie aussi les types) |
| `npm start` | Serveur de production |
| `npm run typecheck` | `tsc --noEmit` seul |
| `npm run check:currency` | Vérifie les 3 prix GNF / $, le taux indicatif et l'absence de FCFA dans l'UI et le schéma |
