# Section 2 — Base de données Supabase

**Date :** 2026-07-08 | **Mode :** Lecture seule

---

## 2.1 Migrations

**52 migrations SQL** versionnées séquentiellement. Chaque migration contient un bloc `-- ==== ROLLBACK ====`. Migrations 001 à 049 présentes.

| Migration | Objet |
|---|---|
| 030 | BM25/tsvector + GIN index sur `legal_chunks` |
| 041 | Filtre `regulation` sur `search_legal_chunks_hybrid` |
| 042 | `monitoring_log` + colonne `retry_count` |
| 048 | `ef_search` HNSW = 1000 |
| 049 | Overloads SQL `search_legal_chunks_hybrid` |

---

## 2.2 Corpus legal_chunks — données réelles (2026-07-08)

| Regulation | Chunks | Articles | Statut |
|---|---|---|---|
| EDPB WP243 (DPO) | 187 | 187 | ⚠️ Sur-représenté |
| EDPB WP248 (DPIA) | 158 | 158 | ⚠️ Sur-représenté |
| Directive DSM (UE 2019/790) | 85 | 27 | OK |
| Directive NIS2 (UE 2022/2555) | 80 | 35 | OK |
| Code bonnes pratiques GPAI | 66 | 66 | OK |
| DSA (UE 2022/2065) | 62 | 62 | ⚠️ Sans parent-child |
| Data Governance Act | 60 | 36 | OK |
| TFUE | 55 | 44 | OK |
| CJUE — Lindqvist | 49 | 49 | OK |
| Cyber Resilience Act | 44 | 43 | OK |
| DMA (UE 2022/1925) | 41 | 41 | ⚠️ Sans parent-child |
| Data Act (UE 2023/2854) | 22 | 22 | ⚠️ Incomplet |
| **AI Act (UE 2024/1689)** | **15** | **10** | 🔴 CRITIQUE |
| CEDH | 14 | 14 | OK |
| CJUE — Meta Platforms | 13 | 13 | OK |
| DORA (UE 2022/2554) | 12 | 12 | ⚠️ Incomplet |
| CJUE — Lindenapotheke | 9 | 9 | OK |
| **RGPD (UE 2016/679)** | **8** | **4** | 🔴 CRITIQUE |
| TUE | 7 | 7 | OK |
| Commission Guidelines Art.5 | 6 | 0 | ⚠️ |
| Règlement Machines | 5 | 4 | 🔴 Très incomplet |
| eIDAS 2 | 2 | 1 | 🔴 Quasi absent |
| **TOTAL** | **1 000** | | |

**Parent-child :** 264/1000 chunks avec `parent_chunk_id` (26%). 736 chunks plats sans hiérarchie.

---

## 2.3 Tables pipeline

| Table | État |
|---|---|
| `pending_documents` | 136 pending / 25 approved / 9 error / 17 staged |
| `legal_chunks` | 1 000 chunks production |
| `monitoring_sources` | 12 sources — **toutes `active=false`** |

---

## 2.4 Sources monitoring — toutes inactives ⚠️

Dernier check : 2026-06-27 à 2026-06-29. Aucune source ne collecte depuis ~10 jours.
Sources : CNIL RSS, EUR-Lex JO RSS, AEPD RSS, BfDI RSS, AI Office RSS, EDPB scraping, IP SI, AP NL, Garante IT, DPC IE, Curia CJUE, EUR-Lex CELLAR.

---

## 2.5 À vérifier (accès Supabase MCP requis)

```sql
-- RLS par table
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Taille tables
SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;

-- Index présents
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;

-- Foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass FROM pg_constraint WHERE contype = 'f';
```

---

## 2.6 Score

**72/100** — 52 migrations avec ROLLBACK, HNSW configuré, recherche hybride opérationnelle. Déductions : AI Act (15 chunks) et RGPD (8 chunks) quasi absents, toutes sources inactives, 136 documents en attente depuis plusieurs semaines.
