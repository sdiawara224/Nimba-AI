# Journaux de test — Nimba Atelier

Collecte des logs de validation de la session. **Aucun mot de passe, JWT, clé `service_role` ou valeur chiffrée Vercel n'est reproduit ici.** Les fichiers `/tmp/nimba-*.log` ont été copiés dans `logs/` pour rester dans le dépôt.

## 1. Résumé

| Bloc | Résultat | Preuve |
| --- | --- | --- |
| `npm run typecheck` | exit 0 | `logs/dev-server.log` |
| `npm run build` local | 4 builds OK, 15 → 17 routes, 0 erreur de type | `logs/build-*.log` |
| Build Vercel final | `READY` / `PROMOTED`, 17 routes, 0 erreur | `logs/vercel-build.log` |
| E2E démo sans cookie | 13 étapes OK, jeton révoqué au logout | `logs/e2e-demo.log` |
| Mode production local | `test-admin`/`demo` 403, bearer ignoré, secrets absents du bundle | `logs/prod-*.log` + relevés historiques |
| Supabase | `ACTIVE_HEALTHY`, 2 migrations, 4 tables, 4 politiques, 6 fonctions, 2 triggers | `logs/supabase.log` |
| Domaine | attaché + vérifié côté Vercel, **CNAME DNS encore absent** | `logs/vercel-env-dns.log` |
| HTTP public déployé | **non validé** (SSO Vercel + DNS en attente) | voir § 8 |
| Devise GNF / $ | `check:currency`, typecheck, build et E2E OK ; migration SQL appliquée | `logs/build-gnf-usd.log`, `logs/e2e-gnf-usd.log`, § 10 |

## 2. Fichiers bruts

| Fichier | Contenu |
| --- | --- |
| `logs/e2e-demo.log` | Smoke E2E frais, zéro cookie, 22:03 UTC |
| `logs/vercel-build.log` | Build Vercel `dpl_EFi42nTY9ficxQJMXmSnDVg5dFn9` |
| `logs/dev-server.log` | Log du serveur `npm run dev` + health + typecheck |
| `logs/supabase.log` | Santé, migrations, objets SQL, config auth |
| `logs/vercel-env-dns.log` | Variables (noms seulement), domaines, `get_domain_config` |
| `logs/build-token.log` | Dernier build local après le fallback sans cookie |
| `logs/build-admin.log` / `build-cookies.log` / `build-final.log` | Builds intermédiaires |
| `logs/prod-token.log` / `prod-admin.log` / `prod-cookies.log` / `prod.log` / `prod3.log` | Démarrages `next start -p 3100` en mode production |
| `logs/prod2.log` | Erreur historique `ENOENT prerender-manifest.json` (build écrasé par le dev, corrigé depuis) |
| `logs/build-gnf-usd.log` | Build local après le passage en GNF / $ |
| `logs/e2e-gnf-usd.log` | Smoke E2E après le passage en GNF / $ (zéro cookie, 22:28 UTC) |

## 3. Builds locaux

Extraits de `logs/build-token.log` :

```text
▲ Next.js 15.5.29
- Environments: .env.production.local
✓ Compiled successfully in 7.9s
Linting and checking validity of types ...
✓ Generating static pages (11/11)
17 lignes dans la table des routes : 9 statiques (○) + 8 dynamiques (ƒ)
```

| Build | Routes | Résultat |
| --- | --- | --- |
| `build-final.log` | 15 | OK |
| `build-admin.log` | 16 | OK |
| `build-cookies.log` | 16 | OK |
| `build-token.log` | 17 | OK |

`npm run typecheck` : `tsc --noEmit` → exit 0. Les 4 builds ont été faits **après avoir arrêté le dev**, car `npm run build` en même temps que `npm run dev` corrompt `.next` (voir `logs/prod2.log`).

## 4. E2E démo — zéro cookie (frais)

`logs/e2e-demo.log` : ouverture `urllib` **sans cookie jar**, uniquement `Authorization: Bearer <sessionToken>`.

| # | Appel | HTTP | Résultat |
| --- | --- | --- | --- |
| 1 | `POST /api/auth` `test-admin` | 200 | `sessionToken=7dffecca…`, `credits=997` |
| 2 | `GET /api/session` Bearer seul | 200 | `credits=997`, `isAdmin=True` |
| 3 | `GET /api/admin` Bearer seul | 200 | `mode=demo`, `stats={users:3, projects:2, credits:1003, paidPayments:0, revenueFcfa:0}` *(ancien nom avant renommage GNF)* |
| 4 | `POST /api/generate` site | 200 | `credits=996`, `engine=atelier-local`, HTML 13 528 caractères |
| 5 | `POST /api/generate` vidéo | 200 | `credits=995`, 5 scènes, HTML 12 208 caractères |
| 6 | `GET /api/projects` | 200 | `['video','site','video','site']` |
| 7 | `POST /api/checkout` `createur` | 200 | `reference=nimba_9f88c2c96bfe4d319d2739f880b74d55` |
| 8 | `POST /api/webhook` 1er appel | 200 | `applied=True` |
| 9 | `POST /api/webhook` rejoué | 200 | `applied=False` (idempotence) |
| 10 | `POST /api/auth` `logout` | 200 | jeton révoqué |
| 11 | `GET /api/session` jeton révoqué | 200 | `session=None` |
| 12 | `signup` avec cookies | 200 | `credits=3`, 1 cookie posé |
| 13 | `GET /api/admin` utilisateur normal | 403 | `Accès réservé aux administrateurs.` |

> Le solde de départ est 997 (et non 999) parce que des smoke tests précédents ont déjà consommé 2 crédits sur le compte de test en mémoire.

### Unité du pont `fetch` (historique)

`/tmp/nimba-bridge-test.mjs` sur `/tmp/nimba-client-session.mts` :

```text
1) sans token        -> aucun en-tête Authorization
2) avec token        -> Authorization: Bearer TOKEN-TEST-123 | content-type préservé
3) objet Request     -> non modifié, init undefined
4) après suppression -> null
```

Aucun navigateur Chromium n'était disponible dans le sandbox : il s'agit d'un test unitaire Node, **pas** d'une validation de l'iframe Arena réelle.

## 5. Mode production — tests négatifs (historiques)

Relevés `next start -p 3100` avec `NIMBA_MODE=production` :

```text
GET /api/health -> {"status":"ok","mode":"production","supabase":{"configured":true,"missing":[]},
                    "anthropic":{"enabled":false},"payments":{"configured":false,"adapterRequired":true},
                    "timestamp":"2026-11-09T17:17:08.307Z"}
POST /api/auth test-admin -> 403
POST /api/auth demo       -> 403
Authorization: Bearer <token démo> -> ignoré : {"session":null,"mode":"supabase"}
/, /login, /studio, /admin -> 200
```

Contrôles bundle : absence du préfixe du mot de passe de test, du mot de passe complet, de la clé `service_role` et du mot de passe DB dans `.next/static`.

## 6. Admin / crédits / génération (historiques)

| Test | Résultat |
| --- | --- |
| `/api/admin` anonyme | 401 |
| `/api/admin` utilisateur normal | 403 |
| `/api/admin` admin | 200, `mode=demo`, stats `users=5, projects=1, credits=1010, paidPayments=0, revenueFcfa=0` *(ancien nom)* |
| `grant_credits` montant 0 | 400 |
| `grant_credits` utilisateur inconnu | 404 |
| `grant_credits +10` | 200, cible 3 → 13 |
| mot de passe test erroné | 401 |
| e-mail inconnu | 404 |

Parcours initial 3 crédits :

```text
Maison Savane : 13 646 caractères, crédits 3 → 2
édition       : 14 084 caractères, --accent:#22c55e, crédits 2 → 1
4e génération : 402 "Vous n'avez plus de crédits…"
checkout ref  : nimba_35839765fa7543738ab437feecec1e4e
webhook       : applied=true puis false → 40 crédits
```

Atelier Vidéo : `/tmp/v1.json` 5 scènes / 15 s / 12 346 caractères ; `/tmp/t3.json` + `/tmp/t4.json` 5 scènes / 30 s / `[6,6,6,6,6]` ; historique `['video','site']`.

## 7. Vercel — build du déploiement promu

`logs/vercel-build.log` (extrait) :

```text
Cloning github.com/sdiawara224/Nimba-AI (Branch: arena/f0ba93da-nimba-ai, Commit: ee7a2c3)
Detected Next.js version: 15.5.29
✓ Compiled successfully in 2.6s
✓ Generating static pages (11/11)
Build Completed in /vercel/output [22s]
Deployment completed
ready_state=READY, readySubstate=PROMOTED, target=production
```

Table des routes : 9 statiques + 8 dynamiques, dont `/api/health`, `/api/admin`, `/api/generate`, `/api/checkout`, `/api/webhook`, `/studio`, `/admin`, `/cgu`, `/confidentialite`.

Déploiements successifs de la session :

| ID | État |
| --- | --- |
| `dpl_AkYFvy4bEYnZ5gTEy51rASqwbsxh` | READY / PROMOTED |
| `dpl_5xP1rw7MmK2CKL5jZ4PRZHRkNUwN` | READY / PROMOTED |
| `dpl_H2pRnktC9HFnHZNdf52bMym3sLLB` | READY / PROMOTED |
| `dpl_EFi42nTY9ficxQJMXmSnDVg5dFn9` | READY / PROMOTED (actuel) |

## 8. Supabase / domaine / limites

Voir `logs/supabase.log` et `logs/vercel-env-dns.log` :

- `auth`, `db`, `rest` : `ACTIVE_HEALTHY`.
- `site_url = https://nimba.optima-works.gn`, allow-list inclut aussi les URLs Vercel et localhost.
- `mailer_autoconfirm = true`, SMTP non configuré, captcha désactivé.
- `nimba.optima-works.gn` : `verified=true` côté Vercel mais `misconfigured=true` côté DNS.
- CNAME à publier : `nimba → d13183f263158da0.vercel-dns-017.com.`
- Migration `20261109222655 nimba_currency_gnf_usd` : `payments.amount_fcfa → amount_gnf`, `confirm_payment(p_amount_fcfa → p_amount_gnf)`. Requête de contrôle : colonne `amount_gnf`, signature `confirm_payment(p_reference text, p_user_id uuid, p_credits integer, p_amount_gnf integer)`, `EXECUTE` réservé à `service_role`.

**Non validé / restant** :

1. `GET /api/health` depuis l'extérieur : `fetch_page` sur `https://nimba-ai-sdiawara.vercel.app/api/health` renvoie la page de login Vercel (SSO `all_except_custom_domains`) ; `https://nimba.optima-works.gn/api/health` échoue tant que le CNAME n'est pas propagé.
2. Aucune inscription / connexion GoTrue réelle réussie depuis l'hôte déployé (le sandbox ne joint pas `*.supabase.co` en local, et l'URL publique est bloquée).
3. Aucune validation dans le vrai iframe Arena avec cookies tiers bloqués (pas de Chromium).
4. Paiement réel non branché : `/api/checkout` renvoie `501 PAYMENT_NOT_CONFIGURED` en production ; le webhook simulé n'est actif qu'en démo.
5. `ANTHROPIC_API_KEY` absente → générateur local déterministe.
6. Rate limiting / captcha applicatifs, SMTP + `mailer_autoconfirm=false`, relecture juridique des CGU, nettoyage éventuel du compte de test.

## 9. Erreurs connues (ne pas rejouer)

- `npm run build` pendant `npm run dev` → `.next` corrompu (`ENOENT prerender-manifest.json`, `Cannot find module './897.js'`) : arrêter le dev, `rm -rf .next`, rebuild, redémarrer. Voir `logs/prod2.log`.
- `curl` garde la ligne `#HttpOnly_…` dans son jar après logout alors que le cookie est bien expiré ; utiliser un `CookieJar` Python pour observer `[]`.
- `SameSite=None; Secure; Partitioned` a été validé dans les en-têtes mais **le navigateur de l'utilisateur refuse quand même les cookies tiers** (`/tmp/arena-coding-uploads/image-4.png`) : d'où le fallback par jeton Bearer.
- `VERCEL_AUTOMATION_BYPASS_SECRET` positionné manuellement puis supprimé : il n'a pas contourné le SSO Vercel.
- Le connecteur Vercel ne permet pas de modifier `ssoProtection` ni d'écrire les enregistrements DNS.

## 10. Passage en devise GNF / $ (2026-11-09)

Choix utilisateur : **GNF + $ affichés ensemble**, FCFA supprimé, conversion avec `1 $ ≈ 8 650 GNF` (taux indicatif non bancaire). Anciens prix 5 000 / 15 000 / 35 000 FCFA convertis via `575 FCFA/$` puis arrondis au multiple de 5 000 GNF.

| Vérification | Résultat |
| --- | --- |
| `npm run check:currency` | OK : `75 000 GNF · 8,67 $`, `225 000 GNF · 26,01 $`, `525 000 GNF · 60,69 $`, aucun `FCFA` dans l'UI ni `schema.sql` |
| `npm run typecheck` | exit 0 |
| `npm run build` (`logs/build-gnf-usd.log`) | exit 0, 17 routes (9 statiques + 8 dynamiques) |
| `logs/e2e-gnf-usd.log` | 13 étapes OK, zéro cookie : `stats={revenueGnf:0, revenueUsd:0}`, génération site/vidéo, checkout, webhook `applied=True` puis `False`, logout/jeton révoqué, utilisateur normal `403` |
| Relevé complémentaire | `POST /api/checkout createur` → `plan={priceGnf:225000, priceUsd:26.01}` ; après webhook 1× : `revenueGnf=…, revenueUsd=…` cohérents avec `/8650` |
| HTML `/` | `GNF / $`, `75 000 GNF · 8,67 $`, `225 000 GNF · 26,01 $`, `525 000 GNF · 60,69 $` ; `FCFA=0` |
| HTML `/checkout/simulate?...&amount=225000` | `formatPrice` rendu côté serveur en `0 GNF · 0,00 $` puis hydraté côté client avec le montant de l'URL ; `FCFA=0` |
| Supabase | migration `20261109222655 nimba_currency_gnf_usd` appliquée ; `payments.amount_gnf`, `confirm_payment(p_amount_gnf)`, `service_role` seul autorisé |

**Limites** : taux et montants restent indicatifs ; aucun paiement réel n'est branché ; la nouvelle version n'a pas encore été déployée sur Vercel ni testée sur le domaine public (CNAME toujours à publier). Le script `check:currency` et le smoke E2E sont locaux, pas des tests navigateur.
