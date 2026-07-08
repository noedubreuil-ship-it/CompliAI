# Section 6 — API et Routes

**Date :** 2026-07-08 | **Mode :** Lecture seule

---

## 6.1 Inventaire global

**100 routes API** dans `app/api/`. Répartition par domaine :

| Domaine | Routes | Notes |
|---|---|---|
| `generate/` | 23 | Générateurs IA (DPIA, FRIA, ROPA, checklist, classifier…) |
| `cron/` | 9 | Tâches planifiées Vercel |
| `admin/` | 8 | Dashboard admin (RAG validation, crédits, logs) |
| `stripe/` | 7 | Paiements et abonnements |
| `brain/` | 6 | Module Cerveau (notes personnelles) |
| `v1/` | 3 | API publique (audits, projets, me) |
| `ai/` | 2 | IA générique |
| `documents/` | 3 | Documents partagés |
| `organizations/` | 3 | Gestion équipes |
| Autres | 36 | chat, search, audit, journal, alerts, etc. |

---

## 6.2 Tableau complet par catégorie

### Routes authentifiées principales

| Route | Méthode | Auth | Rate limit | Streaming |
|---|---|---|---|---|
| `/api/chat` | POST | ✓ | ✓ | SSE |
| `/api/arrets-guide` | POST | ✓ | ✓ | SSE |
| `/api/brain/chat` | POST | ✓ | ✓ | SSE |
| `/api/audit` | POST | ✓ | ✓ | Non |
| `/api/search` | GET | ✓ | ✓ | Non |
| `/api/journal` | GET/POST/PUT/DELETE | ✓ | ✗ | Non |
| `/api/generate/dpia` | POST | ✓ | ✗ | SSE |
| `/api/generate/fria` | POST | ✓ | ✗ | SSE |
| `/api/generate/ropa` | POST | ✓ | ✗ | SSE |
| `/api/generate/checklist` | POST | ✓ | ✗ | SSE |
| `/api/generate/classifier` | POST | ✓ | ✗ | SSE |
| `/api/generate/art11` | POST | ✓ | ✗ | SSE |
| `/api/generate/contract` | POST | ✓ | ✗ | SSE |
| `/api/generate/comparateur` | POST | ✓ | ✗ | SSE |

### Routes admin (toutes protégées isAdmin)

| Route | Méthode | Protection |
|---|---|---|
| `/api/admin/ai-logs` | GET | ✓ isAdmin |
| `/api/admin/credits` | GET/POST | ✓ isAdmin |
| `/api/admin/credits/metrics` | GET | ✓ isAdmin |
| `/api/admin/ingest-supplementary-corpus` | POST | ✓ isAdmin |
| `/api/admin/rag-validation/documents` | GET | ✓ isAdmin |
| `/api/admin/rag-validation/documents/[id]/chunks` | GET | ✓ isAdmin |
| `/api/admin/rag-validation/stats` | GET | ✓ isAdmin |
| `/api/admin/rag-validation/validate` | POST | ✓ isAdmin |

### Routes Stripe

| Route | Méthode | Auth | Notes |
|---|---|---|---|
| `/api/stripe/checkout` | POST | ✓ | Création session checkout |
| `/api/stripe/checkout-credits` | POST | ✓ | Achat pack crédits |
| `/api/stripe/portal` | POST | ✓ | Portail client |
| `/api/stripe/webhook` | POST | ✗ (signé Stripe) | Vérification signature |
| `/api/stripe/auto-recharge` | POST | ✓ | Rechargement auto |
| `/api/stripe/setup-payment-method` | POST | ✓ | Enregistrement CB |
| `/api/stripe/confirm-credit-pack` | POST | ✓ | Confirmation paiement |

### Routes cron Vercel (sans auth Supabase, protégées par CRON_SECRET)

`/api/cron/regulatory-watch`, `/api/cron/low-credits`, `/api/cron/deadline-alerts`, `/api/cron/deadline-reminders`, `/api/cron/national-corpus-agents`, `/api/cron/national-corpus-agents/[country]`, `/api/cron/case-law-seeds`, `/api/cron/supplementary-corpus`, `/api/cron/benchmark-aggregation`

### Routes API publique v1

| Route | Méthode | Auth | Notes |
|---|---|---|---|
| `/api/v1/me` | GET | API Key | Profil utilisateur |
| `/api/v1/audits` | GET/POST | API Key | CRUD audits |
| `/api/v1/projects` | GET/POST | API Key | CRUD projets |

---

## 6.3 Problèmes identifiés

### P1 — 91 routes sans rate limiting
Uniquement 9 routes sur 100 ont un rate limiting. Les 23 routes `/api/generate/**` appellent Claude et consomment des tokens facturés. Scénario d'abus : boucle sur `/api/generate/dpia` sans rate limit → coûts Anthropic illimités.

### P2 — Route test en production
`/api/test-slack/route.ts` est une route de test qui ne devrait pas être en production.

### P2 — Route /api/legal-tools sans auth détectée
À vérifier si intentionnellement publique (outil d'information général ?) ou oubli.

### P3 — Pas de documentation OpenAPI
100 routes sans documentation machine-readable. Complexifie les intégrations tierces et l'API publique v1.

### P3 — Validation inputs incohérente
Certaines routes utilisent Zod, d'autres valident manuellement. Pas de standard unifié.

---

## 6.4 Score

**62/100** — 100 routes bien organisées, séparation admin/public propre, webhook Stripe signé, streaming SSE sur les routes IA. Déductions : 91% sans rate limit, route test en prod, pas de documentation OpenAPI.
