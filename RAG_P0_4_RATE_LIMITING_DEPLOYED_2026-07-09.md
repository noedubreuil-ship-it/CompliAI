# RAG_P0_4_RATE_LIMITING_DEPLOYED_2026-07-09

**Date** : 2026-07-09  
**Branche** : `claude-code/fix-rate-limiting-critical` → cherry-pick `1dd1989` sur `claude-code/fix-ai-act-art50`  
**Déploiement Vercel** : `dpl_4KpX1SqC5tqybkMcxyoaE5oTRe3G`  
**URL production** : https://www.compliai.eu  
**Statut** : ✅ DÉPLOYÉ — MONITORING 4H EN COURS

---

## Routes protégées par rate limiting

| Route | Limite | Fenêtre | Justification |
|---|---|---|---|
| `POST /api/generate/certificate` | 10 req | 60 s | Génération coûteuse (Claude + PDF) |
| `GET /api/admin/ai-logs` | 30 req | 60 s | Route admin sensible |
| `GET /POST /api/admin/credits` | 30 req | 60 s | Route admin sensible |
| `POST /api/admin/ingest-supplementary-corpus` | 30 req | 60 s | Opération coûteuse |

### Limites existantes (non modifiées)

| Route | Limite | Fenêtre |
|---|---|---|
| `POST /api/chat` | 20 req | 60 s |
| `POST /api/audit` | 5 req | 60 s |
| `POST /api/generate/*` | 10 req | 60 s |
| `GET/POST /api/search` | 30 req | 60 s |
| `GET /api/pdf/*` | 20 req | 60 s |

---

## Architecture rate limiting

**Couche 1 — Upstash Redis REST** (`lib/rate-limit-distributed.ts`) : active si `UPSTASH_REDIS_REST_URL` configuré. Partagée entre toutes les instances Vercel (robuste en prod multi-instance).

**Couche 2 — In-memory fallback** (`lib/rate-limit.ts`) : active si Upstash non configuré. Nettoyage automatique toutes les 5 minutes.

**Réponse 429** :
```json
{ "error": "Trop de requêtes. Veuillez réessayer dans quelques minutes." }
```
Headers inclus : `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

---

## Monitoring

**Pendant les 4 premières heures** : surveiller les logs Vercel pour des erreurs 429 inattendues.

**Seuils d'alerte** :
- Plus de 5 erreurs 429 en 10 minutes sur une même route = ajustement des limites requis
- Erreurs 429 sur `/api/admin/*` = comportement normal (usage admin limité)

**Ajustement limites si trop restrictives** : modifier `RATE_LIMITS` dans `lib/rate-limit.ts` et redéployer.

---

## Stack commits en production au moment du déploiement

```
1dd1989  fix(security): rate limiting sur routes admin et generate/certificate  ← P0-4
27e4653  fix(security): upgrade next 14.2.18→14.2.35, fix vitest CRITICAL CVE  ← P0-1
e668f8a  feat(admin): section Admin dans le panneau latéral droit pour les comptes admin
d11fd23  fix(compliance): Art. 50 — 5 ajustements contenu déclaration IA
2d37b7b  feat(compliance): Art. 50 AI Act — déclaration IA dans ChatInterface + page /transparence-ia
```

**Phase P0 complète en production.** ✅
