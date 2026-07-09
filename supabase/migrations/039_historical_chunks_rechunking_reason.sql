-- Migration 039 : Étendre les valeurs autorisées pour archive_reason dans historical_chunks
-- Contexte : P2 re-chunking RGPD niveau paragraphe — besoin de tracer la raison "rechunking_paragraph_level"
-- La contrainte CHECK existante n'autorise que 'updated' | 'deleted' | 'superseded'

ALTER TABLE historical_chunks
  DROP CONSTRAINT IF EXISTS historical_chunks_archive_reason_check;

ALTER TABLE historical_chunks
  ADD CONSTRAINT historical_chunks_archive_reason_check
  CHECK (archive_reason IN ('updated', 'deleted', 'superseded', 'rechunking_paragraph_level'));
