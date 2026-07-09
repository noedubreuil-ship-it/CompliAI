/**
 * dead-chunks.ts — Mécanisme 4 : détection des chunks "morts".
 *
 * Un chunk est considéré mort s'il a été inséré dans les 60 derniers jours
 * et n'apparaît pas en top-10 d'une recherche basée sur son propre contenu.
 *
 * Stratégie d'approximation : les logs de requêtes utilisateurs stockent
 * les hashes des questions (pas le texte brut), donc on ne peut pas réexécuter
 * les vraies requêtes. On utilise la recherche sémantique sur le contenu du
 * chunk lui-même comme proxy. Un chunk qui ne revient pas dans sa propre
 * recherche est presque certainement mal embedé ou dupliqué.
 *
 * Exécution mensuelle. Module en lecture seule.
 */

import { createClient } from "@supabase/supabase-js";
import { searchLegalChunks } from "@/lib/ai/rag";
import type { DeadChunkCandidate, ChunkResult } from "./types";

const DAYS_WINDOW = 60;
const SELF_RETRIEVAL_TOP_N = 10;
const QUERY_LENGTH_LIMIT = 400; // chars max pour searchLegalChunks

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Récupération des chunks récents ─────────────────────────────────────────

interface RecentChunk {
  id: string;
  regulation: string;
  article_number: string | null;
  content: string;
  created_at: string;
  pending_document_id: string | null;
}

async function getRecentChunks(): Promise<RecentChunk[]> {
  const supabase = getServiceClient();
  const since = new Date();
  since.setDate(since.getDate() - DAYS_WINDOW);

  const { data, error } = await (supabase as any)
    .from("legal_chunks")
    .select("id, regulation, article_number, content, created_at, pending_document_id")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error(`dead-chunks.getRecentChunks: ${error.message}`);
  return (data ?? []) as RecentChunk[];
}

// ─── Test de retrouvabilité par auto-requête ─────────────────────────────────

/**
 * Construit la requête de test pour un chunk :
 * "<regulation> <article_number> <début du contenu>"
 */
function buildSelfQuery(chunk: RecentChunk): string {
  const base = [
    chunk.regulation ?? "",
    chunk.article_number ? `article ${chunk.article_number}` : "",
    chunk.content.slice(0, 200),
  ]
    .filter(Boolean)
    .join(" ");
  return base.slice(0, QUERY_LENGTH_LIMIT);
}

async function checkChunkRetrieval(chunk: RecentChunk): Promise<DeadChunkCandidate> {
  const query = buildSelfQuery(chunk);
  let selfRank: number | null = null;

  try {
    const results = await searchLegalChunks(query, SELF_RETRIEVAL_TOP_N, 0.5);
    const idx = results.findIndex((r) => r.id === chunk.id);
    selfRank = idx >= 0 ? idx + 1 : null;
  } catch {
    // En cas d'erreur API, on marque le chunk comme suspect mais pas mort
    return {
      chunk_id: chunk.id,
      regulation: chunk.regulation,
      article_number: chunk.article_number,
      content_excerpt: chunk.content.slice(0, 200),
      inserted_at: chunk.created_at,
      pending_document_id: chunk.pending_document_id,
      self_retrieval_rank: null,
      is_dead: false,
      reason: "api_error_during_check",
    };
  }

  const isDead = selfRank === null;
  const reason = isDead
    ? "not_in_top10_self_retrieval"
    : `found_at_rank_${selfRank}`;

  return {
    chunk_id: chunk.id,
    regulation: chunk.regulation,
    article_number: chunk.article_number,
    content_excerpt: chunk.content.slice(0, 200),
    inserted_at: chunk.created_at,
    pending_document_id: chunk.pending_document_id,
    self_retrieval_rank: selfRank,
    is_dead: isDead,
    reason,
  };
}

// ─── Exécution complète ───────────────────────────────────────────────────────

export interface DeadChunksRunResult {
  executed_at: string;
  chunks_checked: number;
  dead_chunks: DeadChunkCandidate[];
  alive_chunks: DeadChunkCandidate[];
  summary: string;
}

/**
 * Identifie les chunks morts parmi ceux insérés dans les 60 derniers jours.
 *
 * @param concurrency - Requêtes parallèles (défaut: 2 pour ne pas saturer l'API)
 */
export async function runDeadChunksCheck(concurrency = 2): Promise<DeadChunksRunResult> {
  const recentChunks = await getRecentChunks();

  const candidates: DeadChunkCandidate[] = [];

  for (let i = 0; i < recentChunks.length; i += concurrency) {
    const batch = recentChunks.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(checkChunkRetrieval));
    candidates.push(...batchResults);
    if (i + concurrency < recentChunks.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const dead = candidates.filter((c) => c.is_dead);
  const alive = candidates.filter((c) => !c.is_dead);

  const summary =
    dead.length === 0
      ? `Aucun chunk mort détecté parmi ${candidates.length} chunks récents.`
      : `${dead.length} chunk(s) mort(s) détecté(s) sur ${candidates.length} vérifiés (60 derniers jours).`;

  return {
    executed_at: new Date().toISOString(),
    chunks_checked: candidates.length,
    dead_chunks: dead,
    alive_chunks: alive,
    summary,
  };
}
