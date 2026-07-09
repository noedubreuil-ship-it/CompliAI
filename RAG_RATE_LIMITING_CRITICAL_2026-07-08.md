# Rapport Chantier P0-4 — Rate Limiting Critique

**Date :** 2026-07-08
**Branche :** claude-code/fix-rate-limiting-critical
**Statut :** TERMINÉ — en attente feu vert déploiement

---

## Constat préalable

L'infrastructure rate limiting était déjà en place dans la codebase :
- `lib/rate-limit.ts` — rate limiter in-memory avec fallback Redis
- `lib/rate-limit-distributed.ts` — rate limiter Upstash Redis REST (multi-instance Vercel)
- `RATE_LIMITS` — dictionnaire de limites prédéfinies
- La plupart des routes critiques étaient déjà protégées.

---

## Couverture avant / après P0-4

| Route | Avant | Après | Limite |
|---|---|---|---|
| `/api/chat` | ✓ 20/min/user | ✓ inchangé | 20/min |
| `/api/generate/*` (via `authenticateForGenerate`) | ✓ 10/min/user | ✓ inchangé | 10/min |
| `/api/audit` | ✓ 5/min/user | ✓ inchangé | 5/min |
| `/api/search` | ✓ 30/min/user | ✓ inchangé | 30/min |
| `/api/brain/chat` | ✓ 20/min/user | ✓ inchangé | 20/min |
| `/api/arrets-guide` | ✓ 10/min/user | ✓ inchangé | 10/min |
| `/api/auth/request-reset` | ✓ 3/15min/email + 5/h/IP | ✓ inchangé | double limite |
| `/api/stripe/webhook` | ✓ signature Stripe | ✓ inchangé | signature |
| `/api/auth/signin` | ✓ Supabase Auth | ✓ inchangé | Supabase |
| `/api/auth/signup` | ✓ Supabase Auth | ✓ inchangé | Supabase |
| `/api/generate/certificate` | ✗ manquant | **✓ 10/min/user** | 10/min |
| `/api/admin/ai-logs` | ✗ manquant | **✓ 30/min/admin** | 30/min |
| `/api/admin/credits` GET | ✗ manquant | **✓ 30/min/admin** | 30/min |
| `/api/admin/credits` POST | ✗ manquant | **✓ 30/min/admin** | 30/min |
| `/api/admin/ingest-supplementary-corpus` | ✗ manquant | **✓ 30/min/admin** | 30/min |

---

## Ajouts

### `RATE_LIMITS.admin` — `lib/rate-limit.ts`
```typescript
admin: { limit: 30, windowSec: 60 }  // 30 req/min pour les routes admin
```

### 4 routes protégées
- `/api/generate/certificate` — `rateLimitUser(user.id, "certificate", RATE_LIMITS.generate)`
- `/api/admin/ai-logs` GET — `rateLimitUser(user.id, "admin", RATE_LIMITS.admin)`
- `/api/admin/credits` GET + POST — `rateLimitUser(user.id, "admin", RATE_LIMITS.admin)`
- `/api/admin/ingest-supplementary-corpus` POST — `rateLimitUser(user.id, "admin", RATE_LIMITS.admin)`

---

## Réponse 429

Toutes les routes retournent :
```json
{ "error": "Trop de requêtes. Veuillez réessayer dans quelques minutes." }
```
Avec headers :
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` (en secondes)

---

## Phase 2 — Routes restantes (P1 backlog)

Les 87 routes restantes sans rate limiting sont principalement :
- Routes de lecture de profil/settings (faible risque)
- Routes de préférences utilisateur (faible risque)
- Routes de lecture de données (faible risque)

Une couverture systématique via middleware Next.js sur `/api/generate/**` et `/api/v1/**` est documentée dans `RAG_FUTURE_IMPROVEMENTS.md`.

---

## Vérification

```
✓ npm run build — 0 erreurs
✓ TypeScript strict — aucune erreur de type
```
