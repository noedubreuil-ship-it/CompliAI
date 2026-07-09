-- Migration 038 — RAG Quality Assurance : table rag_quality_history
-- Stocke les résultats de chaque exécution du golden set et des mécanismes
-- de détection automatique (divergence, couverture, chunks morts).
-- Phase 5 du pipeline RAG automatique.

CREATE TABLE IF NOT EXISTS rag_quality_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at         timestamptz DEFAULT now(),

  -- Mode d'exécution (4 mécanismes)
  execution_mode      text NOT NULL CHECK (execution_mode IN (
                        'weekly_divergence',
                        'monthly_comparison',
                        'coverage_check',
                        'dead_chunks'
                      )),

  -- Question du golden set (null pour coverage_check et dead_chunks)
  question_id         text,

  -- Chunks retournés (top-N, avec regulation + article_number + similarité)
  returned_chunks     jsonb DEFAULT '[]',

  -- Articles extraits des chunks retournés
  articles_cited      text[] DEFAULT '{}',

  -- Qualification détectée (ex: "haut_risque", "pratique_interdite")
  qualification       text,

  -- Anomalies détectées (liste de codes d'erreur)
  anomalies_detected  text[] DEFAULT '{}',

  -- Score de couverture (pour coverage_check : proportion articles en top-3)
  coverage_score      float,

  -- Statut global de cette exécution
  status              text DEFAULT 'ok' CHECK (status IN ('ok', 'warning', 'critical')),

  -- Métadonnées supplémentaires (chunks morts, détails alertes, etc.)
  metadata            jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_rag_quality_history_mode
  ON rag_quality_history(execution_mode, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_quality_history_question
  ON rag_quality_history(question_id, executed_at DESC)
  WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rag_quality_history_status
  ON rag_quality_history(status, executed_at DESC);

-- Pas de RLS — accès service role uniquement (pipeline backend)
-- Les admins accèdent via l'API admin ou directement via Supabase Studio.

-- ==== ROLLBACK ====
-- DROP TABLE IF EXISTS rag_quality_history CASCADE;
-- ==================
