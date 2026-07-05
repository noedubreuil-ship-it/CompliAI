/**
 * Types partagés pour le module rag-production-indexer (Phase 4).
 *
 * Ce module orchestre la promotion des staging_chunks validés vers
 * la table production legal_chunks, avec archivage dans historical_chunks
 * et invalidation du cache sémantique.
 */

// ─── Représentation d'un staging chunk prêt pour la promotion ────────────────

export interface StagingChunkApproved {
  id: string;
  document_id: string;
  regulation: string;
  article_number: string | null;
  paragraph_number: string | null;
  point_letter: string | null;
  article_title: string | null;
  chapter: string | null;
  granularity: string | null;
  parent_chunk_id: string | null;
  content: string;
  language: string;
  country: string;
  text_type: string;
  source_type: string | null;
  source_url: string | null;
  eurlex_url: string | null;
  publication_date: string | null;
  chunk_hash: string;
  parsed_at: string;
}

// ─── Chunk production (legal_chunks + colonnes migration 037) ─────────────────

export interface LegalChunkRow {
  id: string;
  regulation: string;
  article_number: string | null;
  paragraph_number: string | null;
  point_letter: string | null;
  article_title: string | null;
  chapter: string | null;
  granularity: string | null;
  parent_chunk_id: string | null;
  content: string;
  embedding: number[] | null;
  eurlex_url: string | null;
  language: string;
  chunk_hash: string | null;
  version_date: string | null;
  text_type: string | null;
  country: string | null;
  pending_document_id: string | null;
  source_method: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Résultat de traitement d'un chunk individuel ─────────────────────────────

export type ChunkOutcome =
  | { status: "skipped";  chunkHash: string; reason: "identical_hash" }
  | { status: "inserted"; chunkHash: string; embeddingDim: number }
  | { status: "updated";  chunkHash: string; embeddingDim: number; previousHash: string; archivedId: string }
  | { status: "error";    chunkHash: string; error: string };

// ─── Résultat global du pipeline d'indexation ─────────────────────────────────

export interface IndexationResult {
  documentId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  cacheInvalidated: number;
  details: ChunkOutcome[];
}

// ─── Options du pipeline ──────────────────────────────────────────────────────

export interface IndexationOptions {
  /** Si true : simule sans écrire en base ni invalider le cache. */
  dryRun?: boolean;
  /** Nombre max de chunks à traiter par document (sécurité). */
  maxChunksPerDocument?: number;
  /** Délai en ms entre les batches d'embedding (throttle OpenAI). */
  throttleMs?: number;
  /** Taille du batch d'embedding OpenAI. */
  embeddingBatchSize?: number;
  /** Seuil de similarité cosinus pour l'invalidation cache. */
  cacheInvalidationThreshold?: number;
}

// ─── Résultat du rollback ─────────────────────────────────────────────────────

export interface RollbackResult {
  documentId: string;
  chunksDeleted: number;
  chunksRestored: number;
  errors: string[];
}
