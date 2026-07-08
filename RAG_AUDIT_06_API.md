# Audit 06 — API et Routes

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — app/api/**

---

## 6.1 Inventaire Complet des Routes API

97 routes identifiées. Classées par domaine :

### Routes Admin

| Route | Méthode | Auth | Rate Limit | Validation Zod | Notes |
|---|---|---|---|---|---|
| `/api/admin/ai-logs` | GET | isAdmin() | Non | Non | Dashboard logs IA |
| `/api/admin/credits` | GET, POST | isAdmin() | Non | Oui (AdjustSchema) | Gestion crédits admin |
| `/api/admin/credits/metrics` | GET | À vérifier | Non | Non | Métriques crédits |
| `/api/admin/ingest-supplementary-corpus` | POST | À vérifier | Non | Non | Ingestion manuelle |
| `/api/admin/rag-validation/documents` | GET | isAdmin() | Non | Non | Liste documents staging |
| `/api/admin/rag-validation/documents/[id]/chunks` | GET | À vérifier | Non | Non | Chunks par document |
| `/api/admin/rag-validation/stats` | GET | isAdmin() | Non | Non | Stats validation |
| `/api/admin/rag-validation/validate` | POST | isAdmin() | Non | Non | Valider/rejeter chunks |

### Routes Chat et IA

| Route | Méthode | Auth | Rate Limit | Validation Zod | Notes |
|---|---|---|---|---|---|
| `/api/chat` | POST | Supabase Auth | Oui (distribué) | Non | **Principale route consultant RAG** — streaming SSE |
| `/api/chat/sessions` | GET, POST, DELETE | Supabase Auth | Non | Non | Sessions de chat |
| `/api/ai` | POST | Auth + crédits | Oui | Oui | Route IA générique |
| `/api/ai/credits` | GET | Auth | Non | Non | Solde crédits |
| `/api/brain/chat` | POST | Auth | Non | Non | Chat Brain personnel |
| `/api/arrets-guide` | POST | Auth | Non | Non | Guide jurisprudence |

### Routes Génération Documents

| Route | Méthode | Auth | Rate Limit | Validation | Notes |
|---|---|---|---|---|---|
| `/api/generate/scanner` | POST | Auth + crédits | Non | Non | Scanner conformité |
| `/api/generate/checklist` | POST | Auth + crédits | Non | Non | Checklist AI Act |
| `/api/generate/classifier` | POST | Auth + crédits | Non | Oui | Classificateur IA |
| `/api/generate/dpia` | POST | Auth + crédits | Non | Non | DPIA Art. 35 |
| `/api/generate/dpia/pdf` | POST | Auth | Non | Non | Export PDF DPIA |
| `/api/generate/fria` | POST | Auth + crédits | Non | Non | FRIA AI Act |
| `/api/generate/fria/pdf` | POST | Auth | Non | Non | Export PDF FRIA |
| `/api/generate/ropa` | POST | Auth + crédits | Non | Non | Registre RGPD |
| `/api/generate/ropa/pdf` | POST | Auth | Non | Non | Export PDF ROPA |
| `/api/generate/art11` | POST | Auth + crédits | Non | Non | Documentation Art. 11 |
| `/api/generate/policy` | POST | Auth + crédits | Non | Non | Politique IA |
| `/api/generate/contract` | POST | Auth + crédits | Non | Non | Contrat IA |
| `/api/generate/clauses-contrat` | POST | Auth + crédits | Non | Non | Clauses contractuelles |
| `/api/generate/memoire-conformite` | POST | Auth + crédits | Non | Non | Mémoire conformité |
| `/api/generate/plan-memoire` | POST | Auth + crédits | Non | Non | Plan mémoire |
| `/api/generate/explication-article` | POST | Auth + crédits | Non | Non | Explication article |
| `/api/generate/jurisprudence` | POST | Auth + crédits | Non | Non | Recherche jurisprudentielle |
| `/api/generate/resume-arret` | POST | Auth + crédits | Non | Non | Résumé arrêt |
| `/api/generate/simulateur` | POST | Auth + crédits | Non | Non | Simulateur obligations |
| `/api/generate/comparateur` | POST | Auth + crédits | Non | Non | Comparateur réglements |
| `/api/generate/quiz` | POST | Auth + crédits | Non | Non | Quiz conformité |
| `/api/generate/investor-report` | POST | Auth + crédits | Non | Non | Rapport investisseur |
| `/api/generate/audit-qr` | POST | Auth + crédits | Non | Non | Audit QR |
| `/api/generate/analyse-decision` | POST | Auth + crédits | Non | Non | Analyse décision DPA |
| `/api/generate/certificate` | POST | Auth | Non | Non | Certificat conformité |
| `/api/generate/recherche-jurisprudentielle` | POST | Auth + crédits | Non | Non | Recherche jurisprudentielle avancée |
| `/api/generate/export-pdf` | POST | Auth | Non | Non | Export PDF générique |
| `/api/consultant/export-pdf` | POST | Auth | Non | Non | Export PDF consultant |

### Routes Projets et Audits

| Route | Méthode | Auth | Rate Limit | Notes |
|---|---|---|---|---|
| `/api/audit` | GET, POST | Auth | Non | Création/liste audits |
| `/api/audits-list` | GET | Auth | Non | Liste audits |
| `/api/audits/share` | POST | Auth | Non | Partage audit |
| `/api/audit-trail/export` | GET | Auth | Non | Export audit trail |
| `/api/pdf/[auditId]` | GET | Auth | Non | PDF audit |
| `/api/projects/[id]/issues/[issueId]` | PATCH, DELETE | Auth | Non | Gestion issues |

### Routes Stripe

| Route | Méthode | Auth | Notes |
|---|---|---|---|
| `/api/stripe/checkout` | POST | Auth | Checkout abonnement |
| `/api/stripe/checkout-credits` | POST | Auth | Achat crédits |
| `/api/stripe/portal` | POST | Auth | Portail client Stripe |
| `/api/stripe/webhook` | POST | Signature HMAC | **Webhook Stripe — sécurisé** |
| `/api/stripe/confirm-credit-pack` | POST | Auth | Confirmation achat crédits |
| `/api/stripe/auto-recharge` | GET, POST, DELETE | Auth | Rechargement auto |
| `/api/stripe/setup-payment-method` | POST | Auth | Setup méthode paiement |

### Routes Cron

| Route | Méthode | Auth | Notes |
|---|---|---|---|
| `/api/cron/benchmark-aggregation` | GET | Secret header ? | Agrégation benchmarks |
| `/api/cron/case-law-seeds` | GET | Secret header ? | Seeds jurisprudence |
| `/api/cron/deadline-alerts` | GET | Secret header ? | Alertes deadlines |
| `/api/cron/deadline-reminders` | GET | Secret header ? | Rappels deadlines |
| `/api/cron/low-credits` | GET | Secret header ? | Alertes crédits bas |
| `/api/cron/national-corpus-agents` | GET | Secret header ? | Agents corpus national |
| `/api/cron/national-corpus-agents/[country]` | GET | Secret header ? | Agent par pays |
| `/api/cron/regulatory-watch` | GET | Secret header ? | Veille réglementaire |
| `/api/cron/supplementary-corpus` | GET | Secret header ? | Corpus supplémentaire |

**Attention :** Les routes cron doivent être protégées par un header secret (ex: `CRON_SECRET`). À vérifier que chaque handler valide bien ce header — non visible dans l'inventaire ci-dessus.

### Autres Routes

| Route | Méthode | Auth | Notes |
|---|---|---|---|
| `/api/v1/audits` | GET | API Key | API publique v1 |
| `/api/v1/me` | GET | API Key | API publique v1 |
| `/api/v1/projects` | GET | API Key | API publique v1 |
| `/api/search` | GET | Auth | Recherche sémantique |
| `/api/documents/search` | GET | Auth | Recherche documents |
| `/api/documents/index-semantic` | POST | Auth | Indexation sémantique |
| `/api/documents/share` | POST | Auth | Partage document |
| `/api/brain` | GET, POST | Auth | Brain nodes |
| `/api/brain/[id]` | GET, PATCH, DELETE | Auth | Node spécifique |
| `/api/brain/notes` | GET, POST | Auth | Notes brain |
| `/api/brain/notes/[id]` | PATCH, DELETE | Auth | Note spécifique |
| `/api/brain/graph` | GET | Auth | Graphe brain |
| `/api/journal` | GET, POST | Auth | Journal réglementaire (1326 lignes) |
| `/api/alerts/preferences` | GET, POST | Auth | Préférences alertes |
| `/api/alerts/seed` | POST | Admin ? | Seed alertes |
| `/api/notifications` | GET, POST | Auth | Notifications |
| `/api/organizations` | GET, POST | Auth | Organisations |
| `/api/organizations/[orgId]/members` | GET, POST, DELETE | Auth | Membres org |
| `/api/organizations/join` | POST | Auth | Rejoindre org |
| `/api/profile/product-funnel` | POST | Auth | Funnel produit |
| `/api/register` | GET, POST | Auth | Registre traitements |
| `/api/register/[id]` | GET, PATCH, DELETE | Auth | Entrée registre |
| `/api/register-list` | GET | Auth | Liste registres |
| `/api/scan/site` | POST | Auth | Scan site web |
| `/api/slack/commands` | POST | Slack signing | Commandes Slack |
| `/api/test-slack` | POST | Admin ? | Test Slack |
| `/api/user/api-keys` | GET, POST, DELETE | Auth | Gestion clés API |
| `/api/templates` | GET | Auth | Templates documents |
| `/api/legal-tools` | GET | Auth | Outils juridiques |
| `/api/webhooks` | GET, POST, DELETE | Auth | Webhooks externes |
| `/api/auth/request-reset` | POST | Non | Reset mot de passe |
| `/api/feedback` | POST | Auth | Feedback utilisateur |
| `/api/lawyers/listing-request` | POST | Auth | Demande avocat |

---

## 6.2 Routes Streaming (SSE)

- `/api/chat` — streaming Claude via `streamClaude()`
- `/api/generate/*` — la majorité des générateurs streament la réponse

---

## 6.3 Observations Critiques

| Observation | Sévérité |
|---|---|
| Validation Zod absente sur la majorité des routes POST | **HIGH** |
| Rate limiting absent sur les routes `/api/generate/*` (consomment des crédits mais pas de rate limit HTTP) | **MEDIUM** |
| Routes cron non vérifiées pour la présence d'un secret de protection | **HIGH** |
| `/api/test-slack` présente en production | **LOW** |
| Routes admin sans check isAdmin() sur certaines (ingest-supplementary-corpus, credits/metrics) | **MEDIUM** |

---

## 6.4 Points Forts

- Route `/api/chat` : authentification + rate limit distribué + gestion crédits + guardrails + logging structuré
- Route `/api/stripe/webhook` : vérification signature HMAC + idempotence
- Routes `/api/admin/*` documentées et protégées (pour la majorité)
- API v1 publique avec gestion de clés API distincte
