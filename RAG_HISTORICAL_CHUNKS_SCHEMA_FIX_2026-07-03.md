# Fix — Schéma historical_chunks — 2026-07-03

**Anomalie détectée lors du rechunk AI Act production (2026-07-03)**  
**Priorité** : non-bloquante (archivage en erreur, données préservées dans legal_chunks)  
**Statut** : migration créée, correction script appliquée — **EN ATTENTE APPLICATION MIGRATION**

---

## Symptôme

```
⚠️  Archivage historical_chunks : Could not find the 'article_title' column of 'historical_chunks' in the schema cache
→ Continuer sans archivage (les chunks seront supprimés directement)
165 chunks archivés  ← confusant : archivage a ÉCHOUÉ (le message suit le break)
```

Les 165 anciens chunks AI Act ont été **supprimés sans archivage** dans `historical_chunks`.  
Ils restent récupérables via `backup_legal_chunks_20260626_pre_042` (backup production pré-042 existant).

---

## Cause racine (2 bugs)

### Bug 1 — Colonne `article_title` manquante dans `historical_chunks`

| Table | `article_title` présente |
|---|---|
| `legal_chunks` | ✓ (migration 001) |
| `staging_chunks` | ✓ (migration 034) |
| `historical_chunks` | ✗ **ABSENT** (migrations 036, 039 — jamais ajoutée) |

Le script faisait `...c` (spread d'un row `legal_chunks`) → PostgREST rejetait `article_title` car absent du schéma cache `historical_chunks`.

### Bug 2 — `archive_reason` invalide

Le script utilisait `archive_reason: "rechunk-aiact-parent-child-2026-07"` — valeur non autorisée par le CHECK constraint (valeurs autorisées : `updated | deleted | superseded | rechunking_paragraph_level`).

### Bug 3 — `original_id` au lieu de `original_chunk_id`

Le script utilisait `original_id: c.id` mais le schéma `historical_chunks` définit `original_chunk_id`. Champ silencieusement ignoré + colonne `original_chunk_id` restait NULL.

---

## Corrections appliquées

### 1. Migration SQL — `supabase/migrations/043_historical_chunks_add_article_title.sql`

```sql
ALTER TABLE historical_chunks ADD COLUMN IF NOT EXISTS article_title text;
ALTER TABLE historical_chunks ADD COLUMN IF NOT EXISTS granularity text;
ALTER TABLE historical_chunks ADD COLUMN IF NOT EXISTS parent_chunk_id uuid;
ALTER TABLE historical_chunks DROP CONSTRAINT IF EXISTS historical_chunks_archive_reason_check;
ALTER TABLE historical_chunks ADD CONSTRAINT historical_chunks_archive_reason_check
  CHECK (archive_reason IN (
    'updated', 'deleted', 'superseded',
    'rechunking_paragraph_level',
    'rechunking_parent_child'    -- NOUVEAU
  ));
```

**⚠️ Migration à appliquer manuellement via Supabase dashboard (SQL editor) — staging puis production.**

### 2. Correction script — `scripts/rechunk-aiact.ts`

Remplacement du spread `...c` par une sélection explicite des colonnes :
- `original_chunk_id: c.id` (correction du nom de champ)
- `article_title`, `granularity`, `parent_chunk_id` inclus explicitement
- `archive_reason: "rechunking_parent_child"` (valeur autorisée dans le nouveau constraint)

---

## Application requise

### Étape 1 — Appliquer migration 043 en staging

```sql
-- Via Supabase dashboard > SQL Editor, projet compliai-staging :
-- Copier/coller le contenu de supabase/migrations/043_historical_chunks_add_article_title.sql
```

### Étape 2 — Valider avec un test rechunk limité

Tester l'archivage sur staging avant de valider en production.

### Étape 3 — Appliquer migration 043 en production

```sql
-- Via Supabase dashboard > SQL Editor, projet compliai (production) :
-- Même script
```

---

## Impact sur le rechunk AI Act production du 2026-07-03

- Les 165 anciens chunks AI Act (chunking taille-fixe) ont été supprimés **sans archivage**
- Le contenu est préservé dans `backup_legal_chunks_20260626_pre_042`
- Les nouveaux 1065 chunks parent-child sont en production et corrects
- L'archivage des prochains rechunks (DSA, DMA, etc.) nécessite l'application de la migration 043

---

## Colonnes finales `historical_chunks` après migration 043

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | auto-généré |
| `original_chunk_id` | uuid | ID du chunk dans legal_chunks au moment de l'archivage |
| `regulation` | text | |
| `article_number` | text | |
| `article_title` | text | **NOUVEAU** — aligne avec legal_chunks |
| `granularity` | text | **NOUVEAU** — article / paragraph / point |
| `parent_chunk_id` | uuid | **NOUVEAU** — pour les chunks parent-child |
| `content` | text | |
| `embedding` | vector(1536) | |
| `chunk_hash` | text | |
| `version_date` | date | |
| `archived_at` | timestamptz | |
| `archive_reason` | text CHECK | updated / deleted / superseded / rechunking_paragraph_level / rechunking_parent_child |
| `superseded_by` | uuid | |
