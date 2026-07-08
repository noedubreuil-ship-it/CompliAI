# Audit 06 — API et Routes

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — inventaire `app/api/**`

---

## 6.1 Résumé

| Métrique | Valeur |
|---|---|
| Total routes `route.ts` | 97 |
| Routes admin | 8 |
| Routes cron | 8 |
| Routes Stripe | 6 |
| Routes API v1 (publique) | 3 |
| Routes generate/* | 26 |

---

## 6.2 Inventaire Complet par Domaine

### Admin (8 routes — protégées isAdmin)

| Route | Méthodes | Auth | Note |
|---|---|---|---|
| `/api/admin/ai-logs` | GET | isAdmin | Dashboard interactions IA |
| `/api/admin/credits` | GET, POST | isAdmin | Gestion crédits utilisateurs |
| `/api/admin/credits/metrics` | GET | isAdmin | Métriques crédits 30j |
| `/api/admin/ingest-supplementary-corpus` | POST | isAdmin | Déclenchement ingestion manuelle |
| `/api/admin/rag-validation/documents` | GET | isAdmin | Liste documents staging |
| `/api/admin/rag-validation/documents/[id]/chunks` | GET | isAdmin | Chunks d'un document |
| `/api/admin/rag-validation/stats` | GET | isAdmin | Stats validation RAG |
| `/api/admin/rag-validation/validate` | POST | isAdmin | Approuver/rejeter chunk |

### Cron (8 routes — protégées CRON_SECRET)

| Route | Schedule Vercel | Auth |
|---|---|---|
| `/api/cron/benchmark-aggregation` | 03:00 UTC quotidien | Bearer CRON_SECRET |
| `/api/cron/case-law-seeds` | 04:15 UTC quotidien | Bearer CRON_SECRET |
| `/api/cron/deadline-alerts` | 08:00 UTC quotidien | Bearer CRON_SECRET |
| `/api/cron/deadline-reminders` | 08:30 UTC quotidien | Bearer CRON_SECRET |
| `/api/cron/low-credits` | 09:00 UTC quotidien | Bearer CRON_SECRET |
| `/api/cron/national-corpus-agents` | 04:00 UTC quotidien | Bearer CRON_SECRET |
| `/api/cron/national-corpus-agents/[country]` | — | Bearer CRON_SECRET |
| `/api/cron/regulatory-watch` | 08:00 UTC quotidien | Bearer CRON_SECRET |
| `/api/cron/supplementary-corpus` | 04:30 UTC dimanche | Bearer CRON_SECRET |

### Stripe (6 routes)

| Route | Méthodes | Auth | Note |
|---|---|---|---|
| `/api/stripe/checkout` | POST | user auth | Création session checkout |
| `/api/stripe/checkout-credits` | POST | user auth | Achat pack crédits |
| `/api/stripe/confirm-credit-pack` | POST | user auth | Confirmation achat |
| `/api/stripe/portal` | POST | user auth | Portail client Stripe |
| `/api/stripe/webhook` | POST | signature Stripe | Webhook events |
| `/api/stripe/auto-recharge` | POST | user auth | Config recharge auto |
| `/api/stripe/setup-payment-method` | POST | user auth | Setup PM |

### Chat et IA

| Route | Méthodes | Auth | Rate limit | Streaming |
|---|---|---|---|---|
| `/api/chat` | POST | user auth | ✅ rateLimitUser | ✅ SSE |
| `/api/ai` | POST | user auth | — | — |
| `/api/ai/credits` | GET | user auth | — | — |
| `/api/arrets-guide` | POST | user auth | — | ✅ SSE |
| `/api/generate/consultant/export-pdf` | POST | user auth | — | — |

### Génération Documents (26 routes)

| Route | Méthodes | Auth | Validation |
|---|---|---|---|
| `/api/generate/analyse-decision` | POST | user auth | — |
| `/api/generate/art11` | POST | user auth | — |
| `/api/generate/art11/pdf` | POST | user auth | — |
| `/api/generate/audit-qr` | POST | user auth | — |
| `/api/generate/certificate` | POST | user auth | — |
| `/api/generate/checklist` | POST | user auth | — |
| `/api/generate/classifier` | POST | user auth | — |
| `/api/generate/clauses-contrat` | POST | user auth | — |
| `/api/generate/comparateur` | POST | user auth | — |
| `/api/generate/contract` | POST | user auth | — |
| `/api/generate/contract/pdf` | POST | user auth | — |
| `/api/generate/dpia` | POST | user auth | — |
| `/api/generate/dpia/pdf` | POST | user auth | — |
| `/api/generate/explication-article` | POST | user auth | — |
| `/api/generate/export-pdf` | POST | user auth | — |
| `/api/generate/fria` | POST | user auth | — |
| `/api/generate/fria/pdf` | POST | user auth | — |
| `/api/generate/investor-report` | POST | user auth | — |
| `/api/generate/jurisprudence` | POST | user auth | — |
| `/api/generate/memoire-conformite` | POST | user auth | — |
| `/api/generate/plan-memoire` | POST | user auth | — |
| `/api/generate/policy` | POST | user auth | — |
| `/api/generate/policy/pdf` | POST | user auth | — |
| `/api/generate/quiz` | POST | user auth | — |
| `/api/generate/recherche-jurisprudentielle` | POST | user auth | — |
| `/api/generate/resume-arret` | POST | user auth | — |
| `/api/generate/ropa` | POST | user auth | — |
| `/api/generate/ropa/pdf` | POST | user auth | — |
| `/api/generate/scanner` | POST | user auth | Zod `parseQuestionnaire()` |
| `/api/generate/simulateur` | POST | user auth | — |

### API Publique v1 (clé API)

| Route | Méthodes | Auth |
|---|---|---|
| `/api/v1/me` | GET | Bearer API key |
| `/api/v1/audits` | GET | Bearer API key |
| `/api/v1/projects` | GET | Bearer API key |

### Autres Routes

| Route | Méthodes | Auth | Note |
|---|---|---|---|
| `/api/audit` | POST | user auth | Audit IA Act |
| `/api/audit-trail/export` | GET | user auth | Export historique |
| `/api/audits-list` | GET | user auth | — |
| `/api/audits/share` | POST | user auth | Partage audit |
| `/api/alerts/preferences` | GET, POST | user auth | Préférences alertes |
| `/api/alerts/seed` | POST | user auth | Seed alertes |
| `/api/brain` | GET, POST | user auth | Cerveau IA |
| `/api/brain/[id]` | GET, PUT, DELETE | user auth | — |
| `/api/brain/chat` | POST | user auth | Chat Brain |
| `/api/brain/graph` | GET | user auth | Graphe Brain |
| `/api/brain/notes` | GET, POST | user auth | Notes |
| `/api/brain/notes/[id]` | GET, PUT, DELETE | user auth | — |
| `/api/documents/index-semantic` | POST | user auth | Indexation docs |
| `/api/documents/search` | GET | user auth | Recherche docs |
| `/api/documents/share` | POST | user auth | Partage docs |
| `/api/feedback` | POST | user auth | Feedback |
| `/api/journal` | GET, POST | user auth | Journal réglementaire |
| `/api/lawyers/listing-request` | POST | user auth | Demande mise en relation |
| `/api/legal-tools` | GET | user auth | — |
| `/api/notifications` | GET, POST | user auth | — |
| `/api/organizations` | GET, POST | user auth | — |
| `/api/organizations/[orgId]/members` | GET, POST | user auth | — |
| `/api/organizations/join` | POST | user auth | — |
| `/api/pdf/[auditId]` | GET | user auth | Génération PDF |
| `/api/profile/product-funnel` | POST | user auth | — |
| `/api/projects/[id]/issues/[issueId]` | GET, PUT | user auth | — |
| `/api/register` | GET, POST | user auth | Registre AI Act |
| `/api/register-list` | GET | user auth | — |
| `/api/register/[id]` | GET, PUT, DELETE | user auth | — |
| `/api/scan/site` | POST | user auth | Scanner site web |
| `/api/search` | GET | user auth | Recherche globale |
| `/api/slack/commands` | POST | Slack signature | Commandes Slack |
| `/api/templates` | GET, POST | user auth | Templates |
| `/api/test-slack` | POST | user auth | Test Slack |
| `/api/user/api-keys` | GET, POST, DELETE | user auth | Clés API |
| `/api/webhooks` | GET, POST | user auth | Webhooks |
| `/api/auth/request-reset` | POST | public | Réinitialisation mdp |

---

## 6.3 Observations et Anomalies

### Validation Input (Zod)
- La majorité des routes `generate/*` n'utilisent pas de schéma Zod explicite — elles récupèrent `req.json()` sans validation formelle.
- `app/api/generate/scanner/route.ts` a une fonction `parseQuestionnaire()` avec validation interne.
- `app/api/chat/route.ts` parse les paramètres sans Zod.
- **Recommandation :** Systématiser Zod sur toutes les routes `generate/*`.

### Rate Limiting
- Rate limiting appliqué : `/api/chat`, `/api/audit` (via `rateLimitUser()`)
- Absent sur : la plupart des routes `generate/*`
- **Risque :** Les outils de génération coûteux (FRIA, Art11, DPIA) n'ont pas de rate limit individuel.

### Routes Streaming SSE
- `/api/chat` : ✅ SSE avec `ReadableStream`
- `/api/arrets-guide` : ✅ SSE
- Autres routes generate : réponse JSON synchrone (pas de streaming)

### Route Journal (1326 lignes)
- `app/api/journal/route.ts` est la route la plus longue du projet (1326L)
- Contient la logique de filtres DPA, sources nationales, et construction du journal réglementaire
- À VÉRIFIER : séparation en sous-modules

---

## 6.4 Verdict API

**Score : 7/10**

| Aspect | Score | Commentaire |
|---|---|---|
| Auth coverage | 9/10 | Quasi-toutes les routes protégées |
| Validation input | 5/10 | Zod absent sur la majorité des routes generate |
| Rate limiting | 6/10 | Présent sur chat/audit, absent sur generate |
| Sécurité webhook | 10/10 | Signature Stripe vérifiée |
| Cohérence | 7/10 | Structure consistante mais routes monolithiques |
