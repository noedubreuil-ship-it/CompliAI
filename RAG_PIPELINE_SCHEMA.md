# RAG Pipeline — Schéma de base de données cible
> Phase 0 — CompliAI RAG Automation System

## Contraintes de conception (non négociables pour ce chantier)

| Contrainte | Valeur |
|---|---|
| **Modèle d'embedding** | OpenAI `text-embedding-3-small`, dimension **1536** — inchangé pour toutes les Phases 1–5 |
| **Index vectoriel** | HNSW en production (`legal_chunks`), HNSW en staging (`staging_chunks`) — cohérence requise |
| **Langue d'ingestion** | Français uniquement pour EUR-Lex, EDPB, CJUE — la colonne `language` est renseignée sur tous les chunks |
| **Migration Voyage-3-large** | Hors scope — documentée dans `RAG_FUTURE_IMPROVEMENTS.md` |
| **Mode multilingue** | Hors scope — documenté dans `RAG_FUTURE_IMPROVEMENTS.md` |

---

## Vue d'ensemble

Le système d'ingestion automatique s'appuie sur **5 nouvelles tables** et **2 migrations minimes** sur l'existant. Le principe : aucun chunk n'est écrit directement dans `legal_chunks` (production) sans être passé par le pipeline de staging et de validation.

```
Sources officielles
       │
       ▼
[monitoring_sources] ──→ [monitoring_log]
       │
       ▼  (documents détectés)
[pending_documents]
       │
       ▼  (parsing + embeddings)
[staging_chunks]  ──→ [validation_log]
       │
       ▼  (validation admin)
[legal_chunks] (production existante)
       │
       ▼  (versions archivées)
[historical_chunks]
```

---

## Nouvelles tables

### 1. `monitoring_sources`
Registre des sources officielles surveillées.

```sql
CREATE TABLE monitoring_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,                      -- "EUR-Lex RSS Données personnelles"
  source_type     text NOT NULL CHECK (source_type IN (
                    'eurlex_rss', 'curia_rss',
                    'edpb_scraping', 'ai_office_scraping',
                    'national_authority_scraping', 'national_authority_rss'
                  )),
  url             text NOT NULL,                      -- URL du flux ou de la page
  authority       text,                               -- "EUR-Lex" | "CJUE" | "EDPB" | "CNIL" | ...
  country         text DEFAULT 'EU',                  -- "EU" | "FR" | "DE" | "IE" | ...
  language        text,                               -- langue attendue des documents ("fr","en","de","it","es","nl","sl")
  check_frequency text DEFAULT 'daily' CHECK (check_frequency IN ('hourly','daily','weekly')),
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_document_detected_at timestamptz,             -- dernière fois qu'un nouveau doc a été trouvé
  consecutive_failures        int DEFAULT 0,
  consecutive_silence_days    int DEFAULT 0,         -- jours sans nouveau document détecté
  expected_min_frequency_days int,                   -- intervalle max normal entre 2 publications (ex. 95 pour DPC)
  silence_alert_threshold_days int,                  -- déclenche alerte si dépassé (= expected_min_frequency_days)
  page_structure_hash         text,                  -- hash du markup HTML lors du dernier scraping réussi
  active          boolean DEFAULT true,
  config          jsonb DEFAULT '{}',                 -- paramètres spécifiques (filtres mots-clés, etc.)
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_monitoring_sources_active ON monitoring_sources(active, check_frequency);
```

### 2. `monitoring_log`
Journal d'exécution de chaque cycle de monitoring.

```sql
CREATE TABLE monitoring_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           uuid REFERENCES monitoring_sources(id) ON DELETE SET NULL,
  executed_at         timestamptz DEFAULT now(),
  duration_ms         int,
  documents_found     int DEFAULT 0,
  documents_new       int DEFAULT 0,
  documents_duplicate int DEFAULT 0,
  error_message       text,
  raw_response_size   int,                            -- taille brute de la réponse (octets)
  metadata            jsonb DEFAULT '{}'
);

CREATE INDEX idx_monitoring_log_source_date ON monitoring_log(source_id, executed_at DESC);
```

### 3. `pending_documents`
File d'attente des documents détectés, avant parsing.

```sql
CREATE TABLE pending_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       uuid REFERENCES monitoring_sources(id) ON DELETE SET NULL,
  
  -- Identifiants externes (déduplication)
  external_id     text,                               -- CELEX, ECLI, ou hash URL
  celex           text,                               -- "32024R1689"
  ecli            text,                               -- "ECLI:EU:C:2023:21"
  source_url      text NOT NULL,
  
  -- Métadonnées du document
  title           text,
  document_type   text CHECK (document_type IN (
                    'eu_regulation', 'eu_directive', 'eu_decision',
                    'cjeu_judgment', 'edpb_guideline', 'edpb_recommendation',
                    'edpb_binding_decision', 'ai_office_guidance',
                    'national_decision', 'national_guideline', 'other'
                  )),
  language        text DEFAULT 'fr',
  country         text DEFAULT 'EU',
  publication_date date,
  detected_at     timestamptz DEFAULT now(),
  
  -- Pipeline status
  status          text DEFAULT 'pending' CHECK (status IN (
                    'pending',      -- détecté, pas encore traité
                    'fetching',     -- téléchargement du contenu en cours
                    'parsing',      -- parsing par Claude en cours
                    'staged',       -- chunks dans staging_chunks, attente validation
                    'approved',     -- validé, chunks copiés en production
                    'rejected',     -- rejeté manuellement
                    'error'         -- échec technique
                  )),
  error_message   text,
  retry_count     int DEFAULT 0,
  last_attempted_at timestamptz,
  
  -- Contenu brut
  raw_content_url  text,                              -- URL du PDF ou HTML
  raw_content_text text,                              -- texte extrait (peut être vide si stocké S3)
  
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  
  -- Déduplication
  UNIQUE (celex),
  UNIQUE (ecli),
  UNIQUE (source_url)
);

CREATE INDEX idx_pending_documents_status ON pending_documents(status, detected_at);
CREATE INDEX idx_pending_documents_source ON pending_documents(source_id, status);
```

### 4. `staging_chunks`
Chunks parsés en attente de validation admin avant mise en production.

```sql
CREATE TABLE staging_chunks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       uuid NOT NULL REFERENCES pending_documents(id) ON DELETE CASCADE,
  
  -- Identifiants du chunk
  regulation        text NOT NULL,                    -- identique au champ production
  article_number    text,
  paragraph_number  text,
  point_letter      text,
  article_title     text,
  chapter           text,
  
  -- Contenu
  content           text NOT NULL,
  language          text DEFAULT 'fr',
  country           text DEFAULT 'EU',
  
  -- Classification
  text_type         text CHECK (text_type IN (
                      'reglement_ue', 'directive_ue', 'jurisprudence_cjue',
                      'lignes_directrices', 'recommandation_edpb', 'decision_edpb_art65',
                      'decision_autorite_nationale', 'traite_fondateur',
                      'droits_fondamentaux', 'code_pratiques', 'guidance_ai_office'
                    )),
  source_type       text,                             -- "eu_regulation" | "cjeu_judgment" | ...
  
  -- Références
  source_url        text,
  eurlex_url        text,
  publication_date  date,
  
  -- Embedding
  embedding         vector(1536),
  
  -- Validation
  validation_status text DEFAULT 'pending' CHECK (validation_status IN (
                      'pending', 'approved', 'rejected', 'correction_needed'
                    )),
  validated_at      timestamptz,
  validated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason  text,
  
  -- Hashes
  chunk_hash        text,                             -- SHA-256 du contenu
  
  -- Audit
  parsed_at         timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now(),
  
  UNIQUE (chunk_hash)
);

CREATE INDEX idx_staging_chunks_document ON staging_chunks(document_id);
CREATE INDEX idx_staging_chunks_validation ON staging_chunks(validation_status, parsed_at);
-- HNSW pour cohérence avec legal_chunks (même opérateur, même logique de recherche)
CREATE INDEX idx_staging_chunks_embedding ON staging_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### 5. `validation_log`
Trace immuable de toutes les actions de validation.

```sql
CREATE TABLE validation_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid REFERENCES pending_documents(id) ON DELETE SET NULL,
  chunk_id      uuid REFERENCES staging_chunks(id) ON DELETE SET NULL,
  performed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at  timestamptz DEFAULT now(),
  action        text NOT NULL CHECK (action IN (
                  'approved', 'rejected', 'corrected', 'bulk_approved'
                )),
  reason        text,
  before_hash   text,                                 -- hash du contenu avant correction
  after_hash    text,                                 -- hash du contenu après correction
  metadata      jsonb DEFAULT '{}'
);

CREATE INDEX idx_validation_log_document ON validation_log(document_id, performed_at);
CREATE INDEX idx_validation_log_user ON validation_log(performed_by, performed_at);
```

### 6. `historical_chunks`
Archive des versions précédentes des chunks mis à jour.

```sql
CREATE TABLE historical_chunks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_chunk_id   uuid,                           -- id dans legal_chunks au moment de l'archivage
  regulation          text,
  article_number      text,
  content             text,
  embedding           vector(1536),
  chunk_hash          text,
  version_date        date,
  archived_at         timestamptz DEFAULT now(),
  archive_reason      text CHECK (archive_reason IN ('updated', 'deleted', 'superseded')),
  superseded_by       uuid                             -- id du nouveau chunk dans legal_chunks
);

CREATE INDEX idx_historical_chunks_original ON historical_chunks(original_chunk_id);
CREATE INDEX idx_historical_chunks_regulation ON historical_chunks(regulation);
```

---

## Gestion des mises à jour de règlements existants

### CELEX original vs CELEX consolidé

EUR-Lex distingue deux types de CELEX pour un même acte :

| Type | Exemple | Description |
|---|---|---|
| **Original** | `32024R1689` | Version publiée au JO — jamais modifiée |
| **Consolidé** | `02024R1689-20250801` | Version intégrant les amendements à une date donnée |

Les consolidations ne remplacent pas l'original — elles coexistent dans EUR-Lex. La contrainte `UNIQUE(celex)` dans `pending_documents` **ne bloque pas** une mise à jour légitime, car le CELEX consolidé est structurellement différent de l'original.

### Chaîne complète détection → archivage → ingestion

```
1. Détection
   ├── EUR-Lex RSS détecte un acte modificatif (ex. règlement délégué)
   │   ou une consolidation plus récente d'un règlement existant
   └── Le document est inséré dans pending_documents avec son CELEX consolidé
       (ex. "02024R1689-20250801") — UNIQUE(celex) non violé

2. Comparaison de version
   ├── Le pipeline identifie que pending_documents.title correspond à un texte
   │   déjà présent dans legal_chunks (même regulation string, même CELEX de base)
   ├── Il compare pending_documents.publication_date avec max(legal_chunks.version_date)
   │   pour ce règlement
   └── Si publication_date > version_date existante → mise à jour nécessaire

3. Archivage des chunks obsolètes
   ├── Les chunks existants dans legal_chunks dont la version est dépassée
   │   sont copiés dans historical_chunks avec archive_reason = 'superseded'
   ├── Le champ superseded_by est renseigné après ingestion du nouveau chunk
   └── Les chunks archivés sont supprimés de legal_chunks

4. Ingestion de la nouvelle version
   ├── Les staging_chunks du document consolidé sont validés (admin)
   └── Le upsert en production s'appuie sur chunk_hash :
       - Si le contenu d'un article n'a pas changé → upsert no-op (hash identique)
       - Si le contenu a changé → nouveau hash → nouvelle ligne dans legal_chunks
         (et l'ancien chunk est déjà archivé en étape 3)

5. Mise à jour de la source d'origine
   └── monitoring_sources.last_document_detected_at est mis à jour
```

### Contrainte UNIQUE(celex) — cas limites

La contrainte `UNIQUE(celex)` dans `pending_documents` a trois colonnes nullable séparément :

```sql
UNIQUE (celex),   -- bloquerait si on réinsère "32024R1689" → on insère "02024R1689-YYYYMMDD"
UNIQUE (ecli),    -- bloquerait si on réinsère un arrêt CJUE déjà traité
UNIQUE (source_url)  -- bloque si l'URL exacte a déjà été détectée
```

**Règle opérationnelle** :
- Pour les règlements EU : toujours utiliser le CELEX consolidé daté pour les mises à jour
- Pour les arrêts CJUE : l'ECLI est stable — une mise à jour est traitée comme correction manuelle (pas via le pipeline automatique)
- Pour les documents sans CELEX/ECLI (DPA nationales) : la déduplication repose sur `UNIQUE(source_url)` — une décision mise à jour sur la même URL est détectée par changement de hash de contenu, puis traitée comme un nouveau `pending_document` avec l'ancienne URL nullifiée et une nouvelle URL source

---

## Migrations sur l'existant (`legal_chunks`)

> **Contrainte Phase 0** : ces migrations sont documentées ici mais **non appliquées** jusqu'à validation explicite.

### Migration A — Colonnes de traçabilité pipeline

```sql
-- À appliquer en Phase 4 seulement
ALTER TABLE legal_chunks
  ADD COLUMN IF NOT EXISTS text_type text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'EU',
  ADD COLUMN IF NOT EXISTS pending_document_id uuid REFERENCES pending_documents(id),
  ADD COLUMN IF NOT EXISTS source_method text DEFAULT 'manual'
    CHECK (source_method IN ('manual', 'automated_pipeline'));

COMMENT ON COLUMN legal_chunks.text_type IS 
  'Catégorie : reglement_ue | directive_ue | jurisprudence_cjue | lignes_directrices | ...';
COMMENT ON COLUMN legal_chunks.pending_document_id IS 
  'FK vers pending_documents pour traçabilité du pipeline automatisé (NULL pour ingestions manuelles)';
COMMENT ON COLUMN legal_chunks.source_method IS
  'manual = ingestion manuelle par scripts, automated_pipeline = pipeline automatique validé';
```

### Migration B — Index complémentaires

```sql
-- Optimise les requêtes de monitoring de couverture
CREATE INDEX IF NOT EXISTS idx_legal_chunks_text_type ON legal_chunks(text_type);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_country ON legal_chunks(country);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_version_date ON legal_chunks(version_date);
```

---

## Fichiers de migration Supabase

Les migrations seront placées dans :
```
supabase/migrations/
├── 032_rag_pipeline_monitoring_sources.sql
├── 033_rag_pipeline_pending_documents.sql
├── 034_rag_pipeline_staging_chunks.sql
├── 035_rag_pipeline_validation_log.sql
├── 036_rag_pipeline_historical_chunks.sql
└── 037_legal_chunks_pipeline_columns.sql   ← Phase 4 seulement
```

### Règles de gestion des migrations (non négociables)

1. **SQL versionné** : chaque fichier suit le format `NNN_description.sql`. Le numéro est séquentiel et ne peut pas être réutilisé.

2. **Bloc ROLLBACK obligatoire** : chaque fichier se termine par un bloc commenté documentant l'annulation exacte :
```sql
-- ==== ROLLBACK ====
-- DROP TABLE IF EXISTS monitoring_sources CASCADE;
-- ==================
```

3. **Test sur staging avant production** : les migrations 032–036 sont appliquées et validées sur un projet Supabase de staging séparé (variables `SUPABASE_STAGING_URL` + `SUPABASE_STAGING_KEY` dans `.env.staging`) avant tout push en production. Procédure :
```bash
# 1. Appliquer sur staging
supabase db push --db-url $SUPABASE_STAGING_URL

# 2. Valider (smoke test)
npx tsx scripts/validate-staging-schema.ts

# 3. Appliquer en production uniquement si ✅
supabase db push
```

4. **Migration 037 (modification `legal_chunks`) est séparée et conditionnelle** : elle ne s'applique pas avant la Phase 4, et uniquement après validation explicite. Elle est maintenue dans `supabase/migrations/` mais exclue des pipelines CI automatiques par un commentaire `-- PHASE_4_ONLY`.

5. **Pas de migration destructive sans sauvegarde** : avant toute `ALTER TABLE` sur `legal_chunks`, un `pg_dump` de la table est effectué et stocké pendant 30 jours.

---

## RLS (Row Level Security)

```sql
-- staging_chunks : lisible et modifiable uniquement par les admins
ALTER TABLE staging_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only" ON staging_chunks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- validation_log : insertion par admins, lecture par admins
ALTER TABLE validation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin insert" ON validation_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admin read" ON validation_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- pending_documents, monitoring_sources, monitoring_log : admin only
ALTER TABLE pending_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_log ENABLE ROW LEVEL SECURITY;
```

---

## Notes d'architecture

1. **Pas de colonne `embedding` dans `pending_documents`** : les embeddings ne sont calculés que sur les chunks, pas sur les documents entiers.
2. **`staging_chunks.chunk_hash` = `legal_chunks.chunk_hash`** : le upsert en production s'appuie sur ce hash — si le contenu est identique, pas de doublon.
3. **`historical_chunks` ne stocke pas de chunk_hash unique** : une même version peut théoriquement apparaître deux fois si un texte est réingéré puis annulé.
4. **Le cache sémantique Redis/Upstash existant** est invalidé en Phase 4 — aucune modification du schéma n'est nécessaire, l'invalidation est logique (suppression des clés dont l'embedding dépasse 0.85 de similarité avec les nouveaux chunks).
