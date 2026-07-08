# Section 1 — Architecture et structure du code

**Date :** 2026-07-08 | **Mode :** Lecture seule

---

## 1.1 Métriques codebase

| Métrique | Valeur |
|---|---|
| Fichiers TypeScript (`.ts`) | 466 |
| Fichiers React (`.tsx`) | 230 |
| Fichiers SQL (`.sql`) | 52 |
| Fichiers Markdown (`.md`) | 97 |
| **Total LOC TS/TSX** | **104 339** |
| Fichiers de tests | 62 |
| Dépendances production | 44 |
| Dépendances dev | 11 |

---

## 1.2 Top 15 fichiers les plus volumineux

| Rang | Fichier | Lignes | Rôle |
|---|---|---|---|
| 1 | `lib/ai/generators.ts` | 1 882 | Tous les générateurs IA — monolithe |
| 2 | `app/api/journal/route.ts` | 1 326 | Route journal réglementaire |
| 3 | `app/(app)/dashboard/tools/checklist/page.tsx` | 1 147 | Page checklist AI Act |
| 4 | `lib/data/eu27-registry-data.ts` | 1 074 | Données registre EU27 statiques |
| 5 | `components/chat/ChatInterface.tsx` | 1 064 | Interface chat principale |
| 6 | `app/(app)/dashboard/tools/jurisprudence/page.tsx` | 1 027 | Page jurisprudence |
| 7 | `scripts/rechunk-rgpd.ts` | 871 | Script re-chunking RGPD |
| 8 | `app/api/chat/route.ts` | 867 | Route chat IA principale |
| 9 | `scripts/rechunk-aiact.ts` | 823 | Script re-chunking AI Act |
| 10 | `scripts/rechunk-eidas2.ts` | 796 | Script re-chunking eIDAS2 |
| 11 | `app/(marketing)/page.tsx` | 762 | Landing page |
| 12 | `app/(app)/dashboard/tools/resume-arret/page.tsx` | 733 | Page résumé arrêts |
| 13 | `lib/rag-quality/coverage-articles.ts` | 714 | Couverture articles RAG |
| 14 | `app/(app)/dashboard/tools/ropa/page.tsx` | 660 | Page ROPA |
| 15 | `app/(app)/dashboard/brain/page.tsx` | 632 | Page Cerveau (KM) |

Autres fichiers > 500 lignes : `lib/blog/articles.ts` (596), `lib/data/eu-national-sources.ts` (586), `lib/data/legal-sources.ts` (559), `lib/rag-ingestion/pipeline.ts` (503).

---

## 1.3 Structure du projet

```
compliai/
├── app/                         # Next.js App Router
│   ├── (app)/dashboard/         # Interface authentifiée (25+ pages)
│   ├── (marketing)/             # Pages publiques, blog, legal
│   ├── (auth)/                  # Auth callback
│   └── api/                     # 100 routes API
├── components/                  # 57 composants React
│   ├── ui/                      # Primitives design system (Radix UI)
│   └── chat/                    # Interface chat
├── lib/                         # Modules métier (~300 fichiers)
│   ├── ai/                      # Clients IA, prompts, RAG (~80 fichiers)
│   ├── rag-monitoring/          # Connecteurs sources (12 sources)
│   ├── rag-ingestion/           # Pipeline ingestion Claude
│   ├── rag-production-indexer/  # Promotion staging → production
│   ├── rag-quality/             # Golden set, couverture, drift
│   ├── stripe/                  # Facturation et plans
│   └── data/                    # Données statiques EU27, blog
├── scripts/                     # Scripts maintenance RAG (~30 fichiers)
├── supabase/migrations/         # 52 migrations SQL versionnées avec ROLLBACK
├── tests/fixtures/              # Fixtures locales sources officielles
└── .github/workflows/           # 1 workflow GitHub Actions (crons RAG)
```

**Conventions :** kebab-case pour fichiers/dossiers ✓, PascalCase pour composants et types exportés ✓, camelCase pour variables/fonctions ✓. Cohérence globale satisfaisante.

**Séparation des responsabilités :** correcte. `lib/` contient la logique métier, `app/api/` les endpoints, `components/` l'UI. Pas de logique métier dans les composants.

---

## 1.4 Problèmes identifiés

### P2 — lib/ai/generators.ts (1 882 lignes) — Monolithe
Tous les générateurs IA (DPIA, ROPA, checklist, classifier, Art.11, FRIA, contrats, mémoire, investor report…) dans un seul fichier. Devrait être découpé par domaine : `generators/dpia.ts`, `generators/checklist.ts`, etc.
**Impact :** Diffs difficiles à lire, conflits Git fréquents, impossibilité de tester unitairement chaque générateur.

### P2 — app/api/journal/route.ts (1 326 lignes) — Route monolithique
Une route API de 1 326 lignes mélange logique métier, accès DB et formatage de réponse.
**Impact :** Maintenabilité dégradée, difficile à déboguer.

### P3 — Worktree résiduel dans .claude/
Le dossier `.claude/worktrees/romantic-ellis-8353c8/` contient des copies de fichiers de production et pollue les grep/wc. À supprimer.

### P3 — Couverture tests < 15% sur API et UI
62 fichiers de tests concentrés sur `lib/ai/` et `lib/rag-*/`. Aucun test sur les 100 routes API ni sur les 57 composants React.

### P3 — Coexistence lib/ai/prompts.ts et lib/ai/prompts/
Un fichier `lib/ai/prompts.ts` à la racine de `lib/ai/` coexiste avec le dossier `lib/ai/prompts/`. Vérifier si le fichier racine est encore utilisé ou s'il est un reliquat.

---

## 1.5 Score

**72/100** — Architecture Next.js App Router propre, conventions cohérentes, bonne séparation des responsabilités. Déductions : monolithe generators.ts, route journal trop volumineuse, couverture tests insuffisante sur API/UI.
