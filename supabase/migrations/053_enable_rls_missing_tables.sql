-- Migration 053 : CORRECTIF SÉCURITÉ CRITIQUE
-- Trois tables du schéma public avaient RLS désactivé → lisibles/modifiables
-- par n'importe qui via l'API REST avec la clé anon (rls_disabled_in_public).
--
-- Ces tables ne sont accédées QUE côté serveur (service role, qui contourne RLS) :
--   - historical_chunks       : archives RAG (archiver.ts, rollback.ts)
--   - processed_stripe_events : idempotence webhooks Stripe (webhook/route.ts)
--   - rag_quality_history     : historique qualité golden set (history.ts)
--
-- Activer RLS sans policy = refus par défaut pour anon/authenticated, accès
-- inchangé pour le service role. Aucune régression applicative attendue.

ALTER TABLE historical_chunks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_quality_history     ENABLE ROW LEVEL SECURITY;

-- ==== ROLLBACK ====
-- (Ne PAS désactiver RLS — ce serait rouvrir la faille.)
-- ALTER TABLE historical_chunks       DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE processed_stripe_events DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE rag_quality_history     DISABLE ROW LEVEL SECURITY;
