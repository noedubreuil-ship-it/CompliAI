# Audit 04 — Pipeline RAG

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — analyse `lib/rag-ingestion/`, `lib/rag-production-indexer/`, `lib/rag-monitoring/`

---

## 4.1 Architecture Globale du Pipeline

```
Sources officielles
      │
      ▼
lib/rag-monitoring/sources/   (12 connecteurs)
      │ Monitoring → pending_documents (table Supabase)
      ▼
lib/rag-ingestion/pipeline.ts (staging)
      │ Parse + embed → staging_chunks
      ▼
app/(app)/dashboard/admin/rag-validation/ (validation admin)
      │ Approve/Reject → validation_log
      ▼
lib/rag-production-indexer/   (promotion)
      │ → legal_chunks (production)
      │ → historical_chunks (archivage)
      └ → Cache Upstash (invalidation)
```

---

## 4.2 Sources de Monitoring (12 connecteurs)

| Connecteur | Fichier | Type | Test |
|---|---|---|---|
| EUR-Lex RSS | `eurlex-rss.ts` | RSS feed | ✅ `.test.ts` |
| EUR-Lex CELLAR | `eurlex-cellar.ts` | API SPARQL | ✅ `.test.ts` |
| CNIL | `cnil-rss.ts` | RSS | — |
| EDPB | `edpb-scraping.ts` | Scraping HTML | ✅ `.test.ts` |
| AEPD | `aepd-rss.ts` | RSS | ✅ `.test.ts` |
| Garante | `garante-scraping.ts` | Scraping HTML | ✅ `.test.ts` |
| CURIA | `curia-rss.ts` | RSS | ✅ `.test.ts` |
| DPC (Irlande) | `dpc-scraping.ts` | Scraping | ✅ `.test.ts` |
| AI Office | `ai-office-rss.ts` | RSS | ✅ `.test.ts` |
| AP (Portugal) | `ap-scraping.ts` | Scraping | ✅ `.test.ts` |
| IPSI | `ipsi-scraping.ts` | Scraping | — |

**Couverture tests :** 9/11 connecteurs ont des tests unitaires.

**Sources registrées en DB (staging) :** EUR-Lex RSS, CNIL, AEPD (validées lors du run staging du 26/06/2026 selon CLAUDE.md).

---

## 4.3 GitHub Actions — Crons RAG

**Fichier :** `.github/workflows/rag-automation-crons.yml`

| Job | Schedule | Commande |
|---|---|---|
| Monitoring | Quotidien 06:00 UTC | `npx tsx scripts/cron-monitoring.ts` |
| Ingestion | Toutes les 6h | `npx tsx scripts/cron-ingestion.ts` |

**Note CLAUDE.md :** Les crons ne sont pas encore activés en production (état au 26/06/2026). Le workflow est présent dans le repo mais son statut d'activation sur GitHub Actions est À VÉRIFIER.

---

## 4.4 Pipeline d'Ingestion Staging

**Fichier :** `lib/rag-ingestion/pipeline.ts`

Étapes :
1. Lecture `pending_documents` (status = 'pending')
2. Fetch contenu (fixtures locales en dev, URL réelle en prod)
3. Parsing via Claude Sonnet 4.6 (temperature 0, max_tokens 8192)
4. Validation schéma (`lib/rag-ingestion/validator.ts`)
5. Génération embeddings OpenAI `text-embedding-3-small` (1536d)
6. Insertion dans `staging_chunks`
7. Mise à jour `pending_documents.status = 'processed'`

**Gestion des erreurs :**
- Try/catch par document avec `pending_documents.status = 'error'`
- Retry count via `retry_count` column (migration 042)
- Pas de dead letter queue — les documents en erreur restent dans `pending_documents`

**Idempotence :** ✅ Garantie par hash de contenu (`chunk_hash` dans `staging_chunks` — contrainte UNIQUE)

---

## 4.5 Producteur Indexer (staging → production)

**Fichier :** `lib/rag-production-indexer/`

Composants :
- `pipeline.ts` : orchestration promotion
- `archiver.ts` : archivage dans `historical_chunks`
- `cache-invalidator.ts` : invalidation cache Upstash
- `notifier.ts` : notifications slack/email post-promotion

**Flux :**
1. Lecture `staging_chunks` avec statut 'approved'
2. Vérification doublons par `chunk_hash` sur `legal_chunks`
3. Insertion dans `legal_chunks` avec `parent_chunk_id` (migration 046)
4. Archivage ancienne version dans `historical_chunks` (si mise à jour)
5. Invalidation cache Upstash (`cache-invalidator.ts`)

**Règle non-négociable :** Aucune modification directe de `legal_chunks` sans passer par ce pipeline.

---

## 4.6 Cache Sémantique Upstash

**Fichier :** `lib/ai/semantic-cache.ts`

- Implémentation : appels REST directs vers Upstash Redis (pas de SDK `@upstash/redis`)
- Clé : hash SHA-256 de l'embedding de la question
- TTL : configurable (default probablement 24h — À VÉRIFIER)
- Désactivation propre si `UPSTASH_REDIS_REST_URL` non configuré

**Invalidation :** `lib/rag-production-indexer/cache-invalidator.ts` invalide les entrées liées à un règlement lors d'une promotion.

---

## 4.7 Fonction de Recherche Hybride

**Migration :** `049_hybrid_search_ef_search.sql`

```sql
search_legal_chunks_hybrid(
  query_embedding vector(1536),
  query_text text,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 8,
  filter_regulation_prefix text DEFAULT NULL
)
```

- **Algorithme :** Vector cosine (60%) + BM25/tsvector (40%)
- **ef_search :** 1000 (migration 049 — augmenté depuis 64 pour résoudre problème rappel Art.50)
- **Index HNSW :** m=16, ef_construction=64 sur `legal_chunks.embedding`
- **Filtre regulation :** `filter_regulation_prefix` pour éviter collisions cross-corpus

**Problème résolu (migration 049) :** ef_search trop bas ne permettait pas de retrouver les chunks AI Act Art.50 dans un corpus dense (Commission Guidelines). Fixé à 1000.

---

## 4.8 Intégrité Parent-Child

**Migration 046 :** `legal_chunks.parent_chunk_id uuid REFERENCES legal_chunks(id) ON DELETE SET NULL`

- Index partiel sur `parent_chunk_id IS NOT NULL`
- Architecture : article (parent) → paragraphes/points (enfants)
- **État actuel :** Parent-child implémenté pour RGPD (rechunk fait). AI Act, DSA, DMA, CRA, Data Act : non encore rechunkés en parent-child (dette Q02, Q04, Q05, Q15 golden set).

---

## 4.9 Doublons et Nettoyage

**Migration 045 :** `cleanup_regulation_doublons.sql` — nettoyage des doublons détectés.

**Migration 048 :** Suppression de l'overload SQL ambigu sur `search_legal_chunks_hybrid` (4 paramètres vs 5) pour éviter les erreurs ORM.

**Script :** `scripts/cleanup-corpus.ts` disponible pour maintenance.

---

## 4.10 Verdict Pipeline RAG

**Score : 8/10**

| Aspect | Score | Commentaire |
|---|---|---|
| Architecture | 9/10 | Bien découpé, staging/prod séparés |
| Tests | 8/10 | 9/11 connecteurs testés |
| Gestion erreurs | 7/10 | Retry count OK, pas de dead letter queue |
| Idempotence | 9/10 | Hash chunks garantit l'idempotence |
| Cache | 8/10 | Upstash REST, invalidation lors de promotion |
| Parent-child | 6/10 | Implémenté mais seulement RGPD, pas AI Act |

**Dettes prioritaires :**
- Rechunking parent-child AI Act (résout Q02, Q04, Q05, Q15)
- Activation crons production à valider
- Dead letter queue pour documents en erreur persistante
