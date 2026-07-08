# Section 4 — Pipeline RAG

**Date :** 2026-07-08 | **Mode :** Lecture seule

---

## 4.1 Architecture pipeline

```
monitoring_sources (DB)
    ↓ (worker.ts — fetch RSS/scraping)
pending_documents (DB)
    ↓ (pipeline.ts — parsing Claude Sonnet 4.6)
staging_chunks (DB)
    ↓ (validation admin — /dashboard/admin/rag-validation)
legal_chunks (DB production)
    ↓ (indexer — embeddings OpenAI text-embedding-3-small 1536d)
legal_chunks.embedding (pgvector HNSW)
```

**4 étapes distinctes** avec séparation stricte staging/production. Aucune écriture directe en `legal_chunks` sans validation admin. ✓

---

## 4.2 Composants

| Fichier | Rôle | Lignes |
|---|---|---|
| `lib/rag-monitoring/worker.ts` | Dispatch vers 12 connecteurs sources | 305 |
| `lib/rag-ingestion/pipeline.ts` | Parsing Claude → staging_chunks | 503 |
| `lib/rag-ingestion/parsers/base-parser.ts` | Appel Claude, extraction JSON | ~200 |
| `lib/rag-production-indexer/pipeline.ts` | Promotion staging → production + embeddings | ~400 |
| `lib/rag-production-indexer/indexer.ts` | Orchestration indexer | ~150 |
| `lib/rag-quality/runner.ts` | Exécution golden set | 246 |
| `scripts/cron-monitoring.ts` | Cron monitoring (GitHub Actions) | ~130 |
| `scripts/cron-ingestion.ts` | Cron ingestion (GitHub Actions) | ~150 |

---

## 4.3 État réel (2026-07-08)

### Sources monitoring
**12 sources, toutes `active=false`.** Dernier check : 2026-06-27 à 2026-06-29.
Les crons GitHub Actions s'exécutent (monitoring ✓, ingestion ✓ depuis le fix du 2026-07-08) mais ne collectent rien car toutes les sources sont désactivées.

### Pending documents
- **136 en attente** de validation admin
- **25 approuvés** (non encore indexés en production ?)
- **9 en erreur** (parsing échoué)
- **17 stagés** (session ingestion 2026-07-08)

### Ingestion 2026-07-08 (run local)
- 20 documents traités, 17 stagés, 3 erreurs
- Erreurs : 2 notes de presse AEPD refusées par Claude (comportement correct du validateur), 1 document sans contenu récupérable
- Tokens : 610 926 input / 30 889 output — ~0.55€ pour 20 documents

---

## 4.4 Idempotence et déduplication

- **Déduplication par SHA-256** du contenu dans `pipeline.ts` ✓
- **Déduplication pending_documents** par `external_id` ET `source_url` dans `worker.ts` ✓
- **Déduplication staging_chunks** par `prompt_hash` ✓
- **Archivage** des chunks remplacés dans `historical_chunks` ✓

---

## 4.5 Gestion des erreurs

- Parsing Claude : retry non configuré sur erreur transitoire (timeout, rate limit Anthropic)
- Erreur de fetch source : loggée dans `monitoring_log`, non bloquante pour les autres sources ✓
- Erreur d'insertion staging : status `error` dans `pending_documents` ✓
- Pipeline ingestion : exit code 1 si ≥ 1 document en erreur (détecté par GitHub Actions) ✓

**Point faible :** pas de retry automatique sur échec Claude temporaire. Un document qui échoue une fois reste en `error` sans re-tentative automatique.

---

## 4.6 Golden set

| Métrique | Valeur |
|---|---|
| Questions total | 16 |
| Questions OK | 12 |
| Questions WARNING | 0 |
| Questions CRITICAL | 4 |

Questions CRITICAL : Q02, Q04, Q05, Q15 — toutes liées à l'absence de chunking parent-child sur l'AI Act. Le corpus AI Act ne contient que 15 chunks (10 articles) sur un règlement de 113 articles + 13 annexes.

---

## 4.7 Cache sémantique Upstash

- Configuré via variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`
- Se désactive proprement si non configuré (`lib/ai/semantic-cache.ts`) ✓
- Invalidation par `cache-invalidator.ts` lors de la promotion production ✓

---

## 4.8 Problèmes identifiés

### P0 — Re-chunking AI Act parent-child
15 chunks pour 113 articles + 13 annexes. Le script `scripts/rechunk-aiact.ts` existe (823 lignes) mais n'a pas encore été exécuté en production. C'est la cause directe des 4 questions CRITICAL du golden set.

### P1 — Toutes sources inactives
12 sources avec `active=false`. Aucune veille automatique. Les nouvelles décisions AEPD, CNIL, EDPB, etc. ne sont pas détectées. À activer progressivement source par source avec validation.

### P1 — 136 documents pending non traités
Documents collectés mais non validés depuis plusieurs semaines. Représente du corpus potentiel non exploité.

### P2 — Pas de retry automatique
Un document en erreur de parsing reste bloqué. Ajouter un mécanisme de re-tentative (max 3 fois) avec délai exponentiel.

---

## 4.9 Score

**80/100** — Architecture pipeline mature, idempotence SHA-256, déduplication multi-niveaux, cache sémantique, golden set. Déductions : AI Act sous-alimenté (cause P0), sources toutes inactives, pas de retry automatique.
