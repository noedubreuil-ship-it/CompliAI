# Audit 01 — Architecture et Structure du Code

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — aucune modification  
**Répertoire :** `/Users/noedubreuil/projects/compliai`

---

## 1.1 Métriques Globales

| Métrique | Valeur |
|---|---|
| Fichiers TypeScript/TSX (hors node_modules, .next) | 696 |
| Lignes totales (TS/TSX) | ~104 339 |
| Migrations SQL | 49 (001 → 049) |
| Routes API | 97 fichiers `route.ts` |
| Pages (`page.tsx`) | 72 |
| Composants React | 57 |

---

## 1.2 Structure Principale

```
compliai/
├── app/
│   ├── (app)/dashboard/**      # Interface authentifiée (50+ pages)
│   │   ├── admin/              # Pages admin (ai-logs, credits, rag-validation)
│   │   └── tools/              # Outils métier (20+ outils)
│   ├── (auth)/auth/**          # Login, reset password
│   ├── (marketing)/**          # Landing, blog, legal, pricing
│   ├── (public)/share/**       # Pages partageables (audit, token)
│   └── api/**                  # 97 routes API
├── components/
│   ├── ui/                     # Primitives design system
│   ├── chat/                   # ChatInterface.tsx (1064 lignes)
│   ├── audit/, brain/, tools/  # Composants métier
│   └── dashboard/, marketing/
├── lib/
│   ├── ai/                     # Client Claude, RAG, guardrails, config
│   ├── rag-ingestion/          # Pipeline staging
│   ├── rag-monitoring/         # Sources officielles (12 connecteurs)
│   ├── rag-production-indexer/ # Promotion staging→prod
│   ├── rag-quality/            # Golden set, coverage, drift
│   ├── data/                   # Données statiques (eu27, calendar, sources)
│   ├── stripe/                 # Client Stripe, webhooks
│   ├── email.ts                # Resend (unique fichier)
│   └── credits.ts, pricing.ts, rate-limit*.ts
├── scripts/                    # Scripts CLI/cron (30+ scripts)
├── supabase/migrations/        # 49 migrations SQL
├── tests/fixtures/             # Fixtures locales pour tests
└── .github/workflows/          # ci.yml + rag-automation-crons.yml
```

---

## 1.3 Top 10 Fichiers les Plus Volumineux

| Rang | Fichier | Lignes | Rôle |
|---|---|---|---|
| 1 | `lib/ai/generators.ts` | 1882 | Générateurs de documents IA (20+ outils) |
| 2 | `app/api/journal/route.ts` | 1326 | Journal réglementaire (sources + DPA filters) |
| 3 | `app/(app)/dashboard/tools/checklist/page.tsx` | 1147 | Checklist conformité AI Act |
| 4 | `lib/data/eu27-registry-data.ts` | 1074 | Données statiques registre EU27 |
| 5 | `components/chat/ChatInterface.tsx` | 1064 | Interface chat principal |
| 6 | `app/(app)/dashboard/tools/jurisprudence/page.tsx` | 1027 | Outil jurisprudence |
| 7 | `app/api/chat/route.ts` | 867 | Route chat consultant RAG |
| 8 | `app/(marketing)/page.tsx` | 762 | Landing page |
| 9 | `app/(app)/dashboard/tools/resume-arret/page.tsx` | 733 | Résumé d'arrêt |
| 10 | `lib/rag-quality/coverage-articles.ts` | 714 | Coverage articles RAG |

**Problème identifié :** `lib/ai/generators.ts` (1882 lignes) est un fichier monolithique rassemblant tous les générateurs IA. Cela constitue une dette technique notable — le fichier devrait être découpé par domaine (AI Act, RGPD, NIS2, etc.).

---

## 1.4 Fichiers > 500 Lignes (Hors Top 10)

- `app/(app)/dashboard/tools/ropa/page.tsx` — 660 lignes  
- `app/(app)/dashboard/brain/page.tsx` — 632 lignes  
- `lib/blog/articles.ts` — 596 lignes  
- `lib/data/eu-national-sources.ts` — 586 lignes  
- `lib/data/legal-sources.ts` — 559 lignes  
- `app/(app)/dashboard/admin/rag-validation/RagValidationClient.tsx` — 563 lignes  
- `scripts/rechunk-rgpd.ts` — 871 lignes  
- `scripts/rechunk-aiact.ts` — 823 lignes  
- `scripts/rechunk-eidas2.ts` — 796 lignes  

---

## 1.5 Stack Technique Effectif

| Couche | Version Effective |
|---|---|
| Framework | Next.js 14.2.18 (App Router) |
| React | 18.3.1 |
| TypeScript | ^5 |
| Supabase JS | ^2.45.4 |
| Anthropic SDK | ^0.90.0 |
| OpenAI SDK | ^4.68.0 |
| Stripe | ^17.3.1 |
| Resend | ^4.0.1 |
| Framer Motion | ^12.38.0 |
| Sentry | ^10.51.0 |
| Zod | ^3.23.8 |
| Zustand | ^5.0.12 |
| Vitest | ^3.0.5 |

**Modèles IA effectifs :**
- Chat/consultant : `claude-sonnet-4-5` (config.ts default, surchargeble via `AI_DEFAULT_MODEL`)
- Parsing RAG : `claude-sonnet-4-6` (types.ts, figé)
- Embeddings : `text-embedding-3-small` 1536d (OpenAI, figé)
- Modèle routing premium : Opus disponible pour plan Pro (`claude-opus-4-5`)

**Attention :** `AI_CONFIG.model` pointe sur `claude-sonnet-4-5` alors que le CLAUDE.md mentionne `claude-sonnet-4-6`. Le modèle de chat n'est pas Sonnet 4.6 par défaut — c'est Sonnet 4.5 sauf si `AI_DEFAULT_MODEL` est surchargé en env.

---

## 1.6 Conventions de Nommage

**Observées :**
- Fichiers/dossiers : kebab-case (conforme)
- Composants React : PascalCase (conforme)
- Variables/fonctions : camelCase (conforme)
- Types/interfaces exportés : PascalCase (conforme)
- Routes API : `app/api/<domaine>/route.ts` (conforme)
- Migrations : `<NNN>_<description>.sql` (conforme)

---

## 1.7 Duplication et Dette Technique Identifiées

| Dette | Localisation | Impact |
|---|---|---|
| `generators.ts` monolithique (1882 lignes) | `lib/ai/generators.ts` | Maintenabilité difficile |
| Rate limiter in-memory (non distribué) | `lib/rate-limit.ts` | Multi-instance Vercel → state perdu |
| Rate limiter distribué existe mais non actif partout | `lib/rate-limit-distributed.ts` | Incohérence |
| Scripts rechunk dupliqués (rgpd/aiact/eidas2/reglements/eprivacy) | `scripts/rechunk-*.ts` | 5 fichiers très similaires |
| `createClient` avec service_role répété dans chaque route API | Multiple routes admin | Absence d'abstraction centralisée |
| Worktree `.claude/worktrees/` contient du code dupliqué | `.claude/worktrees/` | 987 lignes en doublon |

---

## 1.8 Organisation des Tests

- Tests unitaires : colocaux (`*.test.ts` à côté du code source)
- Fixtures : `tests/fixtures/`
- Couverture : pipeline RAG (`lib/rag-ingestion/`, `lib/rag-production-indexer/`, `lib/rag-quality/`), monitoring sources (12 fichiers `.test.ts`)
- Absence notable : tests sur les routes API (`app/api/**`) et les composants UI

---

## 1.9 GitHub Actions

Deux workflows actifs :
1. **`ci.yml`** : CI de validation
2. **`rag-automation-crons.yml`** : Monitoring quotidien 06:00 UTC + Ingestion toutes les 6h

**Attention :** Le workflow RAG est planifié (`schedule`) mais le CLAUDE.md indique que les crons ne sont pas encore activés en production (état au 26/06/2026). À vérifier si le workflow est réellement actif.

---

## 1.10 Verdict Architecture

**Points forts :**
- Structure Next.js App Router propre avec route groups logiques
- Séparation claire lib/app/components
- Pipeline RAG bien découpé en modules (monitoring → ingestion → staging → indexer → quality)
- TypeScript strict appliqué
- Migrations SQL versionnées séquentiellement avec blocs ROLLBACK

**Points à améliorer :**
- `generators.ts` doit être découpé
- Rate limiter in-memory inadapté à Vercel multi-instance
- Absence de tests API routes
- Modèle par défaut (`claude-sonnet-4-5`) diverge de la documentation (`claude-sonnet-4-6`)
