# Audit 02 — Base de Données Supabase

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — migrations SQL 001 à 049

---

## 2.1 Schéma Reconstruit par Migrations

### Tables Applicatives (Migrations 001–031)

| Table | Migration | Description |
|---|---|---|
| `profiles` | 001 | Utilisateurs (id=auth.uid, full_name, company, stripe_customer_id, subscription_tier, role) |
| `subscriptions` | 001 | Abonnements Stripe (stripe_subscription_id, status, period) |
| `projects` | 001 | Projets clients (user_id, name, sector, target_audience) |
| `audits` | 001 | Audits de conformité (project_id, status, score, results JSONB) |
| `generated_documents` | 001 | Documents générés (user_id, type, content, metadata) |
| `legal_chunks` | 001 | Corpus RAG principal (regulation, article_number, content, embedding vector(1536)) |
| `notifications` | 003 | Notifications utilisateur |
| `onboarding_steps` | 003 | Étapes d'onboarding |
| `brain_nodes` | 004-005 | Graphe de connaissances privé |
| `brain_notes` | 029 | Notes avec embedding sémantique |
| `credits` | 006 | Solde de crédits (user_id, balance, plan) |
| `credit_packs` | 007 | Packs de crédits achetables |
| `ai_rate_limits` | 006 | Fenêtres de rate limit par utilisateur |
| `api_keys` | 008 | Clés API v1 |
| `organizations` | 009 | Organisations multi-utilisateurs |
| `organization_members` | 009 | Membres d'organisations |
| `webhooks` | 009 | Webhooks configurés |
| `ai_interaction_logs` | 010 | Logs complets des interactions IA |
| `national_legal_texts` | 011 | Corpus DPA nationaux |
| `sector_benchmarks` | 019 | Benchmarks sectoriels |
| `auth_rate_limits` | 024 | Rate limit réinitialisation mot de passe |
| `processed_stripe_events` | (stripe webhook) | Idempotence Stripe |
| `auto_recharge_settings` | 031 | Rechargement automatique Stripe |

### Tables RAG Pipeline (Migrations 032–049)

| Table | Migration | Description |
|---|---|---|
| `monitoring_sources` | 032 | Registre des sources surveillées |
| `pending_documents` | 033 | File d'attente ingestion |
| `staging_chunks` | 034 | Chunks en attente de validation admin |
| `validation_log` | 035 | Journal des validations admin |
| `historical_chunks` | 036 | Archives des chunks remplacés |
| `rag_quality_history` | 038 | Historique des scores qualité |
| `monitoring_log` | 042 | Journal des runs de monitoring |

---

## 2.2 Colonnes Clés de `legal_chunks`

Colonnes ajoutées par les migrations successives :

| Colonne | Migration | Type |
|---|---|---|
| `id`, `regulation`, `article_number`, `content`, `embedding` | 001 | uuid, text, text, text, vector(1536) |
| `source_url` / `eurlex_url` | 001/post | text |
| `tsv` | 030 | tsvector GENERATED ALWAYS AS (to_tsvector('french', content)) STORED |
| `pipeline_source`, `pipeline_version`, `content_hash` | 037 | text |
| `granularity` | 040 | text ('article', 'paragraph', 'point', 'annexe', 'considerant') |
| `parent_chunk_id` | 046 | uuid REFERENCES legal_chunks(id) ON DELETE SET NULL |
| `article_title` | 043 | text |

---

## 2.3 Index Présents

| Index | Table | Type | Migration |
|---|---|---|---|
| `legal_chunks_embedding_idx` | legal_chunks | HNSW vector(1536) m=16 ef_construction=64 | 001 |
| `legal_chunks_tsv_idx` | legal_chunks | GIN (tsv) | 030 |
| `idx_legal_chunks_parent_chunk_id` | legal_chunks | B-tree (parent_chunk_id) WHERE NOT NULL | 046 |
| `idx_monitoring_sources_active` | monitoring_sources | B-tree (active, check_frequency) | 032 |
| `auth_rate_limits_identifier_action_idx` | auth_rate_limits | B-tree (identifier, action, created_at DESC) | 024 |
| `ai_interaction_logs_perf_index` | ai_interaction_logs | B-tree | 028 |

**ef_search (migration 049) :** `hnsw.ef_search` forcé à 1000 via `set_config()` dans la fonction `search_legal_chunks_hybrid` pour garantir le rappel sur les queries difficiles. Remplace l'ancienne valeur par défaut (ef_search = 40).

---

## 2.4 Fonctions SQL Clés

### `search_legal_chunks_hybrid` (migration 049, version finale)

```sql
LANGUAGE plpgsql STABLE
-- ef_search forcé à 1000 via set_config()
-- Recherche hybride : vector(cosine 60%) + tsvector BM25(40%)
-- Paramètres : query_embedding, query_text, match_threshold, match_count, filter_regulation_prefix
```

**Note :** La migration 048 supprime les overloads SQL ambigus à 4 paramètres (bug d'ambiguïté PostgreSQL).

---

## 2.5 RLS (Row Level Security)

| Table | Politique |
|---|---|
| `profiles` | SELECT/UPDATE par auth.uid() = id |
| `subscriptions` | SELECT par auth.uid() = user_id |
| `projects`, `audits` | SELECT/UPDATE/DELETE par user_id |
| `legal_chunks` | READ public (SELECT sans auth — intentionnel pour le RAG) |
| `monitoring_sources` | Admin uniquement (role = 'admin') |
| `staging_chunks` | Admin uniquement |
| `auth_rate_limits` | RLS activé mais accès service_role uniquement |

**Attention :** `legal_chunks` en lecture publique via anon_key. Les embeddings vectoriels sont accessibles sans authentification via l'API Supabase. Ce comportement est intentionnel pour le RAG (lecture seule) mais doit être documenté comme choix délibéré.

---

## 2.6 Index Potentiellement Manquants

| Table | Colonne | Besoin |
|---|---|---|
| `legal_chunks` | `regulation` | Filtres fréquents par règlement (WHERE regulation LIKE 'AI Act%') |
| `legal_chunks` | `granularity` | Filtres par type de chunk |
| `legal_chunks` | `content_hash` | Déduplication (actuellement scan séquentiel ?) |
| `pending_documents` | `status` | File d'attente (WHERE status = 'pending') |
| `ai_interaction_logs` | `user_id, created_at` | Dashboard admin — déjà couvert par migration 028 ? |
| `staging_chunks` | `document_id, status` | Validation admin |

---

## 2.7 Résumé des Migrations Clés

| Plage | Thème |
|---|---|
| 001–005 | Schéma de base (profiles, projects, audits, brain) |
| 006–010 | Crédits, packs, API keys, orgs, logs IA |
| 011–016 | Corpus national, recherche, jugements |
| 017–023 | Correctifs, documents sémantiques, benchmarks |
| 024–031 | Rate limits auth, crédits avancés, rechargement auto |
| 032–042 | Pipeline RAG complet (monitoring → staging → indexer) |
| 043–049 | Affinements RAG (article_title, granularity, cleanup, parent-child, HNSW ef_search) |

---

## 2.8 Points de Vigilance

1. **Index HNSW ef_construction=64** : valeur conservatrice. Pour un corpus dense (388 chunks Commission Guidelines), ef_search=1000 compense mais ajoute de la latence à chaque requête vectorielle.
2. **`processed_stripe_events`** : table d'idempotence créée directement dans le webhook sans migration SQL versionnée identifiable dans la liste — à vérifier si elle existe en base.
3. **`auto_recharge_settings`** (migration 031) : stocke la méthode de paiement pour le rechargement automatique. Données financières sensibles — RLS à vérifier.
4. **Supabase MCP** recommandé pour valider l'état exact de la production car les migrations peuvent diverger de la réalité en base.
