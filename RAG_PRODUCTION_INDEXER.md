# RAG Production Indexer — Phase 4

> Module : `lib/rag-production-indexer/`  
> Auteur : Noé Dubreuil · CompliAI  
> Créé : 2026-06-25 · Statut : **Production-ready**

## Vue d'ensemble

Ce module orchestre la promotion des `staging_chunks` validés par l'admin vers la table production `legal_chunks`. Il gère :

1. **Upsert intelligent** (insert / update+archive / skip) basé sur le `chunk_hash` SHA-256
2. **Archivage préservatif** dans `historical_chunks` (embedding original conservé)
3. **Invalidation du cache sémantique** Upstash/Redis (cosine ≥ 0.85)
4. **Notification email** post-batch via Resend
5. **Rollback** d'une indexation récente en une commande

---

## Architecture des fichiers

```
lib/rag-production-indexer/
├── types.ts               Types TypeScript partagés
├── indexer.ts             Logique upsert d'un chunk individuel
├── archiver.ts            Archivage dans historical_chunks
├── cache-invalidator.ts   Invalidation Upstash Redis
├── notifier.ts            Email de rapport post-indexation
├── rollback.ts            Rollback d'un document indexé
├── pipeline.ts            Orchestrateur du flux complet
└── pipeline.test.ts       Tests (19 tests, 100% verts)
```

---

## Logique d'upsert (3 cas)

Pour chaque `staging_chunk` avec `validation_status = 'approved'` :

### Cas 1 — Hash identique → Ignoré (skip)
```
staging.chunk_hash == legal_chunks.chunk_hash
→ Aucune action (pas de duplication)
```
Le chunk exact est déjà en production. La table `legal_chunks` a une contrainte `UNIQUE (chunk_hash)`.

### Cas 2 — Même identité, hash différent → Mise à jour
```
Même (regulation + article_number + paragraph_number + point_letter + language)
  ET staging.chunk_hash ≠ legal_chunks.chunk_hash
→ Archiver l'ancien dans historical_chunks (embedding préservé)
→ UPDATE legal_chunks avec nouveau contenu + nouvel embedding
```
L'identité d'un chunk est définie par le tuple `(regulation, article_number, paragraph_number, point_letter, language)`.

### Cas 3 — Nouveau chunk → Insertion
```
Aucun legal_chunk trouvé avec ce hash ni cette identité
→ Générer l'embedding OpenAI (text-embedding-3-small, dim=1536)
→ INSERT dans legal_chunks
```

---

## Variables d'environnement requises

| Variable | Description | Exemple |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (contourne RLS) | `eyJhbGci...` |
| `OPENAI_API_KEY` | Pour la génération d'embeddings | `sk-...` |
| `UPSTASH_REDIS_REST_URL` | URL Redis Upstash (optionnel) | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash (optionnel) | `AXxx...` |
| `RESEND_API_KEY` | API Resend pour les emails (optionnel) | `re_xxx` |
| `RAG_NOTIFY_EMAIL` | Email du mainteneur pour les rapports | `noe@compliai.eu` |
| `RESEND_FROM_EMAIL` | Expéditeur des emails | `alerts@compliai.eu` |

> **Note** : Sans `UPSTASH_REDIS_REST_URL`, l'invalidation cache est ignorée silencieusement.  
> Sans `RESEND_API_KEY` ou `RAG_NOTIFY_EMAIL`, aucun email n'est envoyé.

---

## Utilisation

### Mode dry-run (simulation — défaut)

```bash
# Indexer tous les documents "approved" en dry-run
npx tsx lib/rag-production-indexer/pipeline.ts

# Indexer un document spécifique en dry-run
npx tsx lib/rag-production-indexer/pipeline.ts --document-id=<uuid>
```

### Mode production (écriture réelle)

```bash
# ⚠️ Écriture en production — valider le dry-run d'abord
npx tsx lib/rag-production-indexer/pipeline.ts --prod

# Document spécifique en production
npx tsx lib/rag-production-indexer/pipeline.ts --document-id=<uuid> --prod
```

### Sortie console typique

```
🚀 RAG Production Indexer (DRY RUN — passez --prod pour écrire)
[rag-indexer] 3 document(s) à indexer (DRY RUN)...
[rag-indexer] → document a1b2c3d4-...
[rag-indexer]   insérés=47 mis-à-jour=2 ignorés=5 erreurs=0 (3.2s)
[rag-indexer] → document e5f6g7h8-...
[rag-indexer]   insérés=12 mis-à-jour=0 ignorés=0 erreurs=0 (1.1s)

📊 Résumé global :
  Documents traités : 3
  Chunks insérés    : 59
  Chunks mis à jour : 2
  Chunks ignorés    : 5
  Erreurs           : 0
  Cache invalidé    : 14
  Durée totale      : 5432ms

⚠️  DRY RUN : aucune modification appliquée. Relancez avec --prod.
```

---

## Procédure de rollback

Le rollback permet d'annuler l'indexation d'un document spécifique dans `legal_chunks` et de restaurer les chunks archivés dans `historical_chunks`.

### Quand utiliser le rollback ?

- Un document a été indexé par erreur (motif technique)
- Le contenu du document était incorrect (détecté après indexation)
- Un retour utilisateur signale des réponses incorrectes du consultant IA

### Procédure

#### Étape 1 — Identifier le document à rollback

Récupérer le `pending_document_id` via l'interface admin RAG Validation ou via SQL :

```sql
SELECT id, title, document_type, status
FROM pending_documents
WHERE status = 'approved'
ORDER BY updated_at DESC
LIMIT 20;
```

#### Étape 2 — Dry-run du rollback

```bash
npx tsx lib/rag-production-indexer/rollback.ts --document-id=<uuid> --dry-run
```

Sortie attendue :
```
🔄 Rollback document <uuid> (DRY RUN)...

Résultat :
  ✓ Chunks supprimés  : 12
  ✓ Chunks restaurés  : 3
⚠️  DRY RUN : aucune modification appliquée.
```

#### Étape 3 — Rollback réel

```bash
npx tsx lib/rag-production-indexer/rollback.ts --document-id=<uuid>
```

#### Ce que fait le rollback

| Chunk | Action |
|---|---|
| Chunk **nouveau** (pas d'historique) | Supprimé de `legal_chunks` |
| Chunk **mis à jour** (historique dans `historical_chunks`) | Restauré à la version précédente (content + embedding original) |

Après le rollback :
- `staging_chunks.validation_status` → remis à `"pending"`
- `pending_documents.status` → remis à `"staged"`
- Le document réapparaît dans l'interface admin de validation

#### Sécurité du rollback

- Seuls les chunks avec `source_method = 'automated_pipeline'` sont affectés
- Les données manuelles (`source_method = 'manual'`) ne peuvent **pas** être rollbackées par ce script
- Le rollback est **atomique par chunk** : si un chunk échoue, les autres sont quand même traités

---

## Invalidation du cache sémantique

Après chaque indexation, le module scanne le cache Upstash Redis pour invalider les entrées obsolètes.

### Principe

Pour chaque nouveau chunk inséré ou mis à jour :
1. Récupérer son embedding depuis `legal_chunks`
2. Comparer avec chaque entrée du cache (`sc:emb:{sha}`) via similarité cosinus
3. Si `cosine(new_chunk_embedding, cached_query_embedding) ≥ 0.85` → supprimer l'entrée

### Structure Redis invalidée

```
sc:idx         → SET des SHAs d'index
sc:emb:{sha}   → JSON { embedding, cached_at } — SUPPRIMÉ
sc:resp:{sha}  → Réponse complète cachée — SUPPRIMÉE
```

### Paramètre de seuil

Par défaut : **0.85** (plus conservateur que le seuil de hit du cache à 0.95).

> Raisonnement : on invalide plus agressivement que l'on ne sert depuis le cache, pour s'assurer que les nouvelles données sont bien reflétées dans les réponses.

---

## Exemple d'upsert réel avec log de traçabilité

Exemple d'un batch d'indexation pour l'AI Act Art. 53 §1 (a) :

### Staging chunk source

```json
{
  "id": "sc-abc123",
  "document_id": "doc-456",
  "regulation": "Règlement (UE) 2024/1689 (AI Act)",
  "article_number": "53",
  "paragraph_number": "1",
  "point_letter": "a",
  "content": "Les fournisseurs de systèmes d'IA à haut risque doivent...",
  "text_type": "reglement_ue",
  "chunk_hash": "sha256:abc123...",
  "validation_status": "approved"
}
```

### Log de traçabilité dans validation_log

```sql
SELECT * FROM validation_log WHERE document_id = 'doc-456';
-- action: "bulk_approved", performed_by: <admin_uuid>, performed_at: 2026-06-25T22:50:00Z
```

### Résultat dans legal_chunks

```sql
SELECT id, regulation, article_number, paragraph_number, point_letter,
       chunk_hash, pending_document_id, source_method, created_at
FROM legal_chunks
WHERE pending_document_id = 'doc-456';
-- 47 rows: source_method = 'automated_pipeline'
```

### Vérification du rollback possible

```sql
SELECT COUNT(*) FROM historical_chunks
WHERE original_chunk_id IN (
  SELECT id FROM legal_chunks WHERE pending_document_id = 'doc-456'
);
-- Nombre de chunks mis à jour (avec version précédente restaurable)
```

---

## Migration 037 appliquée

La migration `037_legal_chunks_pipeline_columns.sql` ajoute à `legal_chunks` :

| Colonne | Type | Défaut | Description |
|---|---|---|---|
| `text_type` | `text` | — | Catégorie RAG (reglement_ue, jurisprudence_cjue, etc.) |
| `country` | `text` | `'EU'` | Pays d'origine |
| `pending_document_id` | `uuid` | `NULL` | FK vers pending_documents (traçabilité pipeline) |
| `source_method` | `text` | `'manual'` | `'manual'` ou `'automated_pipeline'` |
| `paragraph_number` | `text` | `NULL` | Numéro de paragraphe (identité granulaire) |
| `point_letter` | `text` | `NULL` | Point lettré (identité granulaire) |

> **Note** : `paragraph_number` et `point_letter` ont été ajoutés au-delà du périmètre documenté initial car ils sont nécessaires à la détection correcte des mises à jour (distinguer Art. 9 §1 de Art. 9 §2).

### Appliquer sur staging

```bash
supabase db push --dry-run  # vérifier d'abord
supabase db push
```

### Appliquer sur production

```bash
supabase db push --project-ref <production-ref>
```

---

## Tests (19 tests — 100% verts)

```bash
npx vitest run lib/rag-production-indexer/pipeline.test.ts
```

| Groupe | Tests | Description |
|---|---|---|
| Upsert / cosineSimilarity | 6 | Vecteurs identiques, orthogonaux, nuls, proches, différents |
| Archivage | 2 | Embedding préservé, archive_reason correct |
| Cache invalidation | 4 | Seuil 0.85, Upstash absent, dry-run |
| Rollback | 4 | Suppression, restauration, dry-run, document vide |
| Échec partiel | 1 | 1 chunk sur 5 échoue, les 4 autres insérés |
| Types | 2 | Discrimination ChunkOutcome, champs obligatoires |
