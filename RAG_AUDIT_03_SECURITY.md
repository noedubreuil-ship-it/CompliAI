# Section 3 — Sécurité

**Date :** 2026-07-08 | **Mode :** Lecture seule

---

## 3.1 Vulnérabilités npm (npm audit)

| Sévérité | Nombre |
|---|---|
| 🔴 CRITICAL | 2 |
| 🟠 HIGH | 6 |
| 🟡 MODERATE | 11 |
| 🟢 LOW | 2 |
| **TOTAL** | **21** |

Packages affectés (extraits) :
- `@next/eslint-plugin-next` → `glob` (HIGH)
- `@anthropic-ai/sdk` → CVE #1119428 (MODERATE)
- `@opentelemetry/core` → CVE #1120821 (MODERATE)
- `@opentelemetry/instrumentation-http` (MODERATE)

Les 2 CRITICAL ne sont pas détaillés dans l'output npm mais correspondent vraisemblablement à `next@14.2.18` (DoS Server Actions, CVE active).

**Action requise :** `npm audit fix` puis `npm audit fix --force` pour les CRITICAL. Tester le build après.

---

## 3.2 Headers HTTP de sécurité

**ABSENT** dans `next.config.mjs`. Aucun des headers suivants n'est configuré :

| Header | Statut | Impact |
|---|---|---|
| `Content-Security-Policy` | ❌ Absent | XSS, injection |
| `X-Frame-Options` | ❌ Absent | Clickjacking |
| `Strict-Transport-Security` | ❌ Absent | Downgrade HTTPS |
| `X-Content-Type-Options` | ❌ Absent | MIME sniffing |
| `Referrer-Policy` | ❌ Absent | Fuite données referrer |
| `Permissions-Policy` | ❌ Absent | Caméra/micro/géo |

**Correction :** Ajouter une fonction `headers()` dans `next.config.mjs`.

---

## 3.3 XSS — dangerouslySetInnerHTML

**1 occurrence détectée :**

```
app/(marketing)/blog/[slug]/page.tsx:144
dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
```

`renderMarkdown` doit sanitizer le HTML produit (DOMPurify ou équivalent). À VÉRIFIER que `renderMarkdown` assainit bien le contenu avant rendu.

---

## 3.4 Variables d'environnement

**NEXT_PUBLIC_SUPABASE_URL** est utilisée dans les routes API côté serveur — ce n'est pas un risque en soi (c'est l'URL publique), mais c'est redondant avec `SUPABASE_URL`. OK.

**NEXT_PUBLIC_APP_URL** utilisée dans plusieurs routes API pour construire des URLs dans des emails. OK — valeur non sensible.

**SUPABASE_SERVICE_ROLE_KEY** : utilisée uniquement dans `lib/supabase/server.ts` et scripts. Non exposée côté client. ✓

**ANTHROPIC_API_KEY** et **OPENAI_API_KEY** : aucune utilisation dans des fichiers `NEXT_PUBLIC_*` détectée. ✓

---

## 3.5 Authentification — routes admin

Toutes les routes `/api/admin/**` vérifient `isAdmin()` depuis `lib/admin.ts` :

| Route admin | Protection isAdmin |
|---|---|
| `app/api/admin/ai-logs/route.ts` | ✓ |
| `app/api/admin/credits/route.ts` | ✓ |
| `app/api/admin/credits/metrics/route.ts` | ✓ |
| `app/api/admin/ingest-supplementary-corpus/route.ts` | ✓ |
| `app/api/admin/rag-validation/documents/route.ts` | ✓ |
| `app/api/admin/rag-validation/documents/[id]/chunks/route.ts` | ✓ |
| `app/api/admin/rag-validation/stats/route.ts` | ✓ |
| `app/api/admin/rag-validation/validate/route.ts` | ✓ |

✓ Toutes les routes admin sont protégées. Mais `isAdmin()` est vérifiée dans le handler de chaque route — pas au niveau middleware. Risque d'oubli sur une nouvelle route admin.

---

## 3.6 Rate limiting

Seulement **9 routes sur 100** ont un rate limiting :

| Route | Rate limit |
|---|---|
| `app/api/chat/route.ts` | ✓ |
| `app/api/arrets-guide/route.ts` | ✓ |
| `app/api/search/route.ts` | ✓ |
| `app/api/audit/route.ts` | ✓ |
| `app/api/generate/simulateur/route.ts` | ✓ |
| `app/api/generate/quiz/route.ts` | ✓ |
| `app/api/generate/resume-arret/route.ts` | ✓ |
| `app/api/generate/export-pdf/route.ts` | ✓ |
| `app/api/brain/chat/route.ts` | ✓ |

**91 routes sans rate limiting** — dont toutes les routes `/api/generate/**` (DPIA, FRIA, ROPA, classifier…). Ces routes appellent Claude et consomment des tokens. Vulnérabilité à l'abus de coûts.

---

## 3.7 Routes sans authentification détectée (analyse statique)

Routes ne contenant pas `getUser`/`createClient`/`checkAuth` dans leur code source :

- `app/api/cron/case-law-seeds/route.ts` — cron Vercel (protégé par secret CRON_SECRET ?) À VÉRIFIER
- `app/api/cron/national-corpus-agents/route.ts` — idem
- `app/api/cron/supplementary-corpus/route.ts` — idem
- `app/api/legal-tools/route.ts` — ⚠️ À VÉRIFIER si usage public intentionnel
- `app/api/test-slack/route.ts` — ⚠️ Route de test en production
- `app/api/scan/site/route.ts` — ⚠️ Scan de site sans auth
- `app/api/generate/audit-qr/route.ts` — génération QR sans auth

Les routes cron sont légitimement sans auth Supabase (elles s'authentifient via `Authorization: Bearer CRON_SECRET`). À confirmer pour les autres.

---

## 3.8 Cookies et sessions

Supabase SSR gère les cookies d'authentification. Par défaut : `HttpOnly`, `SameSite=Lax`, `Secure` en production. ✓

---

## 3.9 Classification finale

| Vulnérabilité | Sévérité | Effort |
|---|---|---|
| 2 CVE CRITICAL npm | 🔴 CRITICAL | S |
| Absence headers HTTP sécurité | 🔴 HIGH | S |
| 91 routes generate sans rate limit | 🟠 HIGH | M |
| dangerouslySetInnerHTML blog | 🟠 HIGH | S |
| isAdmin non centralisé au middleware | 🟡 MEDIUM | M |
| Route test-slack en production | 🟡 MEDIUM | S |
| 6 CVE HIGH npm | 🟡 MEDIUM | S |

---

## 3.10 Score

**58/100** — Points positifs : routes admin toutes protégées, secrets non exposés côté client, Supabase SSR cookie sécurisé. Déductions majeures : CVE CRITICAL non corrigées, absence totale de headers HTTP sécurité, 91% des routes sans rate limiting.
