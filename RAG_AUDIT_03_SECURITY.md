# Audit 03 — Sécurité

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — analyse statique du code

---

## 3.1 Résumé Exécutif Sécurité

| Niveau | Nb | Items |
|---|---|---|
| CRITICAL | 2 | next@14.2.18 CVE DoS + vitest CVE RCE |
| HIGH | 5 | form-data CRLF, glob CLI injection, ws mémoire, eslint-next, vite |
| MEDIUM | 3 | Rate limiter in-memory, absence headers sécurité, dangerouslySetInnerHTML blog |
| LOW | 2 | NEXT_PUBLIC_SUPABASE_URL dans scripts serveur (nommage trompeur), absence cookies banner |

---

## 3.2 Variables d'Environnement Exposées Côté Client

### NEXT_PUBLIC_ dans le code
Les variables `NEXT_PUBLIC_*` sont visibles côté navigateur. Analyse :

| Variable | Usage | Risque |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase (attendu public) | Faible — URL publique par design Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase (attendue publique) | Faible — clé publique par design, RLS protège |
| `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` | Price ID Stripe (côté client) | Faible — Price IDs ne permettent pas d'actions non autorisées |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN Sentry | Faible — standard |
| `NEXT_PUBLIC_CRISP_WEBSITE_ID` | ID widget Crisp | Faible |

**Observation :** `NEXT_PUBLIC_SUPABASE_URL` est utilisé dans les scripts serveur CLI (`scripts/cron-ingestion.ts:11`) — nommage trompeur mais sans risque de sécurité car ces scripts s'exécutent côté serveur uniquement.

**SUPABASE_SERVICE_ROLE_KEY** n'est jamais exposé côté client — vérifié. Pas de fuite de clé service role.

---

## 3.3 Routes Admin — Protection

**Méthode de protection :** Fonction `isAdmin()` dans `lib/admin.ts`

```
isAdmin() = user connecté ET (user.id dans ADMIN_USER_IDS env OR profiles.role = 'admin')
```

### Routes admin vérifiées

| Route | Protection isAdmin | Statut |
|---|---|---|
| `app/api/admin/ai-logs/route.ts` | ✅ `if (!(await isAdmin())) return 403` | OK |
| `app/api/admin/credits/route.ts` | ✅ `if (!(await isAdmin())) return 403` | OK |
| `app/api/admin/credits/metrics/route.ts` | ✅ OK | OK |
| `app/api/admin/ingest-supplementary-corpus/route.ts` | ✅ OK | OK |
| `app/api/admin/rag-validation/documents/route.ts` | ✅ OK | OK |
| `app/api/admin/rag-validation/stats/route.ts` | ✅ OK | OK |
| `app/api/admin/rag-validation/validate/route.ts` | ✅ OK | OK |
| `app/api/admin/rag-validation/documents/[id]/chunks/route.ts` | ✅ `isAdmin()` l.49 | OK |

**Verdict :** Toutes les routes admin vérifiées utilisent `isAdmin()`. Pas de route admin sans protection identifiée.

**Dette connue :** Pas de middleware centralisé pour `/api/admin/**` — chaque route implémente sa propre vérification. Si une nouvelle route admin est créée sans `isAdmin()`, elle serait exposée.

---

## 3.4 dangerouslySetInnerHTML

**1 occurrence trouvée :**

```
app/(marketing)/blog/[slug]/page.tsx:144
dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
```

**Analyse :** Le contenu provient de `lib/blog/articles.ts` (données statiques hardcodées dans le code source). Pas d'input utilisateur. **Risque XSS : faible** — le contenu est statique et contrôlé par les développeurs.

**Recommandation MEDIUM :** Utiliser `react-markdown` (déjà présent dans `package.json`) plutôt que `dangerouslySetInnerHTML` même pour contenu statique.

---

## 3.5 Routes Cron — Authentification

Les crons Vercel s'authentifient via `Bearer CRON_SECRET`. Vérification dans chaque route :

| Route Cron | Protection CRON_SECRET | Robustesse |
|---|---|---|
| `cron/benchmark-aggregation` | `authHeader !== \`Bearer \${process.env.CRON_SECRET}\`` | ✅ OK |
| `cron/case-law-seeds` | Vérifie aussi `expectedSecret === "your-secret-cron-token"` | ✅ OK + check valeur par défaut |
| `cron/deadline-alerts` | `authHeader !== \`Bearer \${process.env.CRON_SECRET}\`` | ✅ OK |
| `cron/national-corpus-agents` | Vérifie aussi valeur par défaut | ✅ OK |

**Verdict :** Toutes les routes cron inspectées ont l'authentification Bearer. Certaines (`case-law-seeds`, `national-corpus-agents`) ajoutent une vérification du secret par défaut — meilleure pratique.

---

## 3.6 Webhook Stripe — Signature

**Fichier :** `app/api/stripe/webhook/route.ts:18-27`

```typescript
const sig = request.headers.get("stripe-signature");
if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });
event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
```

**Verdict :** ✅ Signature Stripe vérifiée correctement.

---

## 3.7 Rate Limiting

| Rate limiter | Fichier | Méthode | Problème |
|---|---|---|---|
| In-memory | `lib/rate-limit.ts` | `Map<string, entry>` en mémoire Node | **MEDIUM** — ne fonctionne pas en multi-instance Vercel |
| Distribué (Redis) | `lib/rate-limit-distributed.ts` | Upstash Redis REST | ✅ Distribué |
| Distribué auth | `lib/rate-limit-distributed.ts` | Fenêtre auth + DB | ✅ Robuste |

**Problème :** Le rate limiter in-memory est utilisé dans les routes critiques (`app/api/chat/route.ts:30`, `app/api/audit/route.ts:37`). Sur Vercel, chaque instance serverless a son propre état mémoire — un utilisateur peut dépasser la limite en appelant plusieurs instances.

Le rate limiter distribué (`lib/rate-limit-distributed.ts`) existe mais n'est pas utilisé universellement.

---

## 3.8 Headers de Sécurité HTTP

**Vérification `next.config.mjs` :** Aucun en-tête de sécurité HTTP configuré.

| Header | Statut | Impact |
|---|---|---|
| `Content-Security-Policy` | ❌ Absent | HIGH — XSS |
| `X-Frame-Options` | ❌ Absent | MEDIUM — clickjacking |
| `X-Content-Type-Options` | ❌ Absent | LOW |
| `Strict-Transport-Security` | ❌ Absent | MEDIUM (Vercel gère HTTPS mais pas le header) |
| `Referrer-Policy` | ❌ Absent | LOW |
| `Permissions-Policy` | ❌ Absent | LOW |

**Note :** Vercel ajoute automatiquement certains headers (HSTS sur le domaine custom), mais une configuration explicite dans `next.config.mjs` est recommandée.

---

## 3.9 Vulnérabilités npm audit

**Date audit :** 2026-07-08

| Sévérité | Count | Packages |
|---|---|---|
| CRITICAL | 2 | `next` (DoS Server Actions), `vitest` (RCE via UI server) |
| HIGH | 5 | `form-data` (CRLF injection), `glob` (CLI injection), `ws` (mémoire), `vite`, `eslint-config-next` |
| MODERATE | 11 | Diverses dépendances transitives |
| LOW | 2 | Mineures |

### Détails CRITICAL

**1. `next@14.2.18` — GHSA-7m27-7ghc-44w9**
- Titre : DoS avec Server Actions
- CVSS : 5.3 (moderate)
- Fix : mettre à jour vers `next >= 14.2.21`
- **Impact :** Déni de service possible sur les Server Actions

**2. `vitest@^3.0.5` — GHSA-5xrq-8626-4rwp**  
- Titre : Lecture et exécution de fichiers arbitraires si le serveur UI Vitest est exposé
- CVSS : 9.8 (CRITICAL)
- Fix : mettre à jour vers `vitest >= 3.2.6`
- **Impact PRODUCTION :** Faible — Vitest est une devDependency, jamais exécutée en production Vercel. **Impact DEV :** Élevé si `vitest --ui` est lancé sur un port accessible.

### Détails HIGH

**3. `form-data` (GHSA-hmw2-7cc7-3qxx)**
- CRLF injection dans les noms de champs multipart
- Dépendance transitive (non utilisée directement)

**4. `glob >= 10.2.0 < 10.5.0` (GHSA-5j98-mcp5-4vw2)**
- CLI injection via `-c/--cmd` avec `shell: true`
- Impact direct limité (usage CLI uniquement)

---

## 3.10 Injection SQL

**Vérification :** Toutes les requêtes Supabase utilisent le client ORM (`supabase.from(...).select(...).eq(...)`) qui paramètre automatiquement les requêtes. Pas de concaténation directe d'input utilisateur dans du SQL raw identifiée.

**Verdict :** Risque d'injection SQL : **faible**.

---

## 3.11 API Publique v1 — Authentification

Les routes `app/api/v1/**` utilisent `resolveApiKeyUserId(request)` pour valider les clés API. Le hash de la clé est stocké dans `api_keys.key_hash` et comparé via Supabase.

**Verdict :** ✅ API v1 correctement protégée par clé API hashée.

---

## 3.12 Verdict Global Sécurité

**Score sécurité : 6.5/10**

| Priorité | Item | Action |
|---|---|---|
| P1 HIGH | `next@14.2.18` → DoS Server Actions | Mise à jour `next@14.2.21+` |
| P2 MEDIUM | Rate limiter in-memory multi-instance | Migrer vers distribué sur routes critiques |
| P2 MEDIUM | Headers HTTP sécurité absents | Ajouter `headers()` dans `next.config.mjs` |
| P3 LOW | `dangerouslySetInnerHTML` blog | Remplacer par `react-markdown` |
| P3 LOW | `vitest` CVE (dev-only) | Mise à jour `vitest@3.2.6+` |
