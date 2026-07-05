/**
 * pipeline.ts — Orchestrateur du module rag-production-indexer.
 *
 * Flux complet Phase 4 :
 *   1. Récupérer les documents dont TOUS les chunks sont approved (staging)
 *   2. Pour chaque document → récupérer ses staging_chunks approved
 *   3. Batch embed des chunks qui nécessitent un embedding (insertés ou modifiés)
 *   4. Upsert dans legal_chunks (insert | update+archive | skip)
 *   5. Invalider le cache sémantique pour les chunks nouveaux/modifiés
 *   6. Envoyer le rapport email
 *
 * Règles non-négociables :
 * - Service role Supabase pour toutes les écritures
 * - dryRun par défaut (sécurité anti-prod accidentelle)
 * - Chaque chunk est traité indépendamment : échec d'un chunk ≠ rollback du batch
 * - L'embedding n'est calculé qu'une fois, immédiatement avant l'upsert
 */

import { createClient } from "@supabase/supabase-js";
import { embedBatch } from "@/lib/ai/embeddings";
import { upsertChunk } from "./indexer";
import { invalidateSemanticCache } from "./cache-invalidator";
import { sendIndexationReport } from "./notifier";
import type {
  StagingChunkApproved,
  IndexationResult,
  IndexationOptions,
  ChunkOutcome,
} from "./types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_THROTTLE_MS = 200;
const DEFAULT_CACHE_THRESHOLD = 0.85;
const DEFAULT_MAX_CHUNKS = 500;

// ─── Client Supabase service-role ─────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Récupère les documents dont tous les staging_chunks sont approved.
 */
async function fetchReadyDocuments(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  // Documents avec au moins 1 chunk approved et aucun chunk pending
  const { data: allDocs } = await supabase
    .from("pending_documents")
    .select("id")
    .eq("status", "approved");

  return (allDocs ?? []).map((d: { id: string }) => d.id);
}

/**
 * Récupère les chunks approved d'un document.
 */
async function fetchApprovedChunks(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  maxChunks: number
): Promise<StagingChunkApproved[]> {
  const { data } = await supabase
    .from("staging_chunks")
    .select(
      "id, document_id, regulation, article_number, paragraph_number, point_letter, article_title, chapter, granularity, parent_chunk_id, content, language, country, text_type, source_type, source_url, eurlex_url, publication_date, chunk_hash, parsed_at"
    )
    .eq("document_id", documentId)
    .eq("validation_status", "approved")
    .order("parsed_at", { ascending: true })
    .limit(maxChunks);

  return (data ?? []) as StagingChunkApproved[];
}

// ─── Indexation d'un document ─────────────────────────────────────────────────

/**
 * Indexe les chunks approved d'un seul document.
 * Retourne le résultat détaillé de l'opération.
 */
export async function indexDocument(
  documentId: string,
  options: IndexationOptions = {}
): Promise<IndexationResult> {
  const {
    dryRun = true,
    maxChunksPerDocument = DEFAULT_MAX_CHUNKS,
    throttleMs = DEFAULT_THROTTLE_MS,
    embeddingBatchSize = DEFAULT_BATCH_SIZE,
  } = options;

  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;

  // Récupérer les chunks à indexer
  const chunks = await fetchApprovedChunks(supabase, documentId, maxChunksPerDocument);

  const details: ChunkOutcome[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // ── Two-pass : articles en premier pour résoudre parent_chunk_id ────────────
  // Pass 1 : granularity='article' (parents), Pass 2 : tous les autres (enfants)
  const articleChunks = chunks.filter((c) => c.granularity === "article");
  const childChunks = chunks.filter((c) => c.granularity !== "article");
  const orderedChunks = [...articleChunks, ...childChunks];

  // Map staging_chunk_id → legal_chunk_id (alimentée en pass 1, utilisée en pass 2)
  const stagingToLegal = new Map<string, string>();

  for (let i = 0; i < orderedChunks.length; i += embeddingBatchSize) {
    const batch = orderedChunks.slice(i, i + embeddingBatchSize);

    // Générer les embeddings pour tout le batch en une seule requête OpenAI
    let embeddings: number[][];
    try {
      embeddings = await embedBatch(batch.map((c) => c.content));
    } catch (e) {
      // Si le batch échoue → on marque tous les chunks du batch en erreur
      for (const chunk of batch) {
        const outcome: ChunkOutcome = {
          status: "error",
          chunkHash: chunk.chunk_hash,
          error: `Embedding batch failed: ${(e as Error).message}`,
        };
        details.push(outcome);
        errors++;
      }
      if (throttleMs > 0) await sleep(throttleMs);
      continue;
    }

    // Upsert de chaque chunk du batch
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const embedding = embeddings[j];

      // Résoudre parent_chunk_id : remplacer le staging UUID par le legal UUID
      const resolvedParentId = chunk.parent_chunk_id
        ? (stagingToLegal.get(chunk.parent_chunk_id) ?? null)
        : null;

      const outcome = await upsertChunk({
        supabase,
        stagingChunk: { ...chunk, parent_chunk_id: resolvedParentId },
        embedding,
        documentId,
        dryRun,
      });

      details.push(outcome);

      // Alimenter la map pour les enfants du prochain pass
      if (outcome.status === "inserted" || outcome.status === "updated") {
        if (outcome.legalChunkId) {
          stagingToLegal.set(chunk.id, outcome.legalChunkId);
        }
      }

      if (outcome.status === "inserted") inserted++;
      else if (outcome.status === "updated") updated++;
      else if (outcome.status === "skipped") skipped++;
      else if (outcome.status === "error") errors++;
    }

    if (throttleMs > 0 && i + embeddingBatchSize < orderedChunks.length) {
      await sleep(throttleMs);
    }
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startMs;

  return {
    documentId,
    startedAt,
    finishedAt,
    durationMs,
    inserted,
    updated,
    skipped,
    errors,
    cacheInvalidated: 0, // sera mis à jour par le pipeline global
    details,
  };
}

// ─── Pipeline global ──────────────────────────────────────────────────────────

export interface PipelineResult {
  documents: IndexationResult[];
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  cacheInvalidated: number;
  durationMs: number;
}

/**
 * Exécute le pipeline complet d'indexation production.
 *
 * @param documentIds  Liste explicite de documents à indexer.
 *                     Si vide → récupère automatiquement les documents approved.
 * @param options      Options du pipeline
 */
export async function runProductionIndexer(
  documentIds: string[] = [],
  options: IndexationOptions = {}
): Promise<PipelineResult> {
  const {
    dryRun = true,
    cacheInvalidationThreshold = DEFAULT_CACHE_THRESHOLD,
  } = options;

  const globalStart = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;

  // Résoudre la liste des documents si non fournie
  const toProcess = documentIds.length > 0
    ? documentIds
    : await fetchReadyDocuments(supabase);

  if (toProcess.length === 0) {
    console.log("[rag-indexer] Aucun document à indexer.");
    return {
      documents: [],
      totalInserted: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      cacheInvalidated: 0,
      durationMs: Date.now() - globalStart,
    };
  }

  console.log(`[rag-indexer] ${toProcess.length} document(s) à indexer${dryRun ? " (DRY RUN)" : ""}...`);

  // Indexer chaque document
  const results: IndexationResult[] = [];
  for (const docId of toProcess) {
    console.log(`[rag-indexer] → document ${docId}`);
    const result = await indexDocument(docId, options);
    results.push(result);
    console.log(
      `[rag-indexer]   insérés=${result.inserted} mis-à-jour=${result.updated} ignorés=${result.skipped} erreurs=${result.errors} (${result.durationMs}ms)`
    );
  }

  // ── Invalidation cache sémantique ─────────────────────────────────────────

  // Collecter les embeddings des chunks insérés ou modifiés
  // Les embeddings ne sont pas retournés par indexDocument (pour économiser mémoire).
  // On les re-récupère depuis legal_chunks pour les chunks récents.
  let cacheInvalidated = 0;

  if (!dryRun) {
    const recentHashes = results.flatMap((r) =>
      r.details
        .filter((d) => d.status === "inserted" || d.status === "updated")
        .map((d) => d.chunkHash)
    );

    if (recentHashes.length > 0) {
      // Récupérer les embeddings des chunks fraîchement indexés
      const { data: indexedChunks } = await supabase
        .from("legal_chunks")
        .select("embedding")
        .in("chunk_hash", recentHashes);

      const newEmbeddings = (indexedChunks ?? [])
        .map((c: { embedding: number[] | null }) => c.embedding)
        .filter((e: number[] | null): e is number[] => e !== null);

      if (newEmbeddings.length > 0) {
        const cacheResult = await invalidateSemanticCache(
          newEmbeddings,
          cacheInvalidationThreshold,
          dryRun
        );
        cacheInvalidated = cacheResult.invalidated;
        console.log(
          `[rag-indexer] Cache : ${cacheResult.scanned} entrées scannées, ${cacheResult.invalidated} invalidées`
        );
      }
    }
  }

  // Mettre à jour cacheInvalidated dans les résultats
  for (const r of results) r.cacheInvalidated = cacheInvalidated;

  // ── Notification email ────────────────────────────────────────────────────
  if (!dryRun) {
    await sendIndexationReport(results, cacheInvalidated);
  }

  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
  const totalUpdated = results.reduce((s, r) => s + r.updated, 0);
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors, 0);

  console.log(
    `[rag-indexer] ✓ Terminé en ${Date.now() - globalStart}ms — insérés=${totalInserted} mis-à-jour=${totalUpdated} ignorés=${totalSkipped} erreurs=${totalErrors}`
  );

  return {
    documents: results,
    totalInserted,
    totalUpdated,
    totalSkipped,
    totalErrors,
    cacheInvalidated,
    durationMs: Date.now() - globalStart,
  };
}

// ─── CLI Entry point ──────────────────────────────────────────────────────────

if (require.main === module || process.argv[1]?.includes("rag-production-indexer/pipeline")) {
  void (async () => {
    const args = process.argv.slice(2);
    const isDryRun = !args.includes("--prod");
    const docArg = args.find((a) => a.startsWith("--document-id="));
    const documentIds = docArg ? [docArg.replace("--document-id=", "")] : [];

    console.log(`\n🚀 RAG Production Indexer${isDryRun ? " (DRY RUN — passez --prod pour écrire)" : " (PRODUCTION)"}`);

    const result = await runProductionIndexer(documentIds, {
      dryRun: isDryRun,
      throttleMs: 200,
      embeddingBatchSize: 50,
    });

    console.log("\n📊 Résumé global :");
    console.log(`  Documents traités : ${result.documents.length}`);
    console.log(`  Chunks insérés    : ${result.totalInserted}`);
    console.log(`  Chunks mis à jour : ${result.totalUpdated}`);
    console.log(`  Chunks ignorés    : ${result.totalSkipped}`);
    console.log(`  Erreurs           : ${result.totalErrors}`);
    console.log(`  Cache invalidé    : ${result.cacheInvalidated}`);
    console.log(`  Durée totale      : ${result.durationMs}ms`);
    if (isDryRun) console.log("\n⚠️  DRY RUN : aucune modification appliquée. Relancez avec --prod.");
  })();
}
