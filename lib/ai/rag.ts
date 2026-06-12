import { createClient } from "@supabase/supabase-js";
import { embedText } from "./embeddings";
import type { LegalChunk } from "@/lib/types/legal";

// Uses service role to bypass RLS for vector search
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Score a chunk against the query by counting keyword matches.
 * Combined with vector similarity, this gives a better overall ranking.
 */
function keywordScore(query: string, chunk: LegalChunk): number {
  const words = query
    .toLowerCase()
    .replace(/[^a-zéèêëàâùûüôîïç\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  if (words.length === 0) return 0;

  const target = `${chunk.regulation ?? ""} ${chunk.article_title ?? ""} ${chunk.content}`.toLowerCase();
  const matches = words.filter((w) => target.includes(w)).length;
  return matches / words.length;
}

/**
 * Re-rank chunks by combining vector similarity score with keyword overlap.
 * Chunks with matching keywords are pushed to the top.
 */
function rerankChunks(query: string, chunks: LegalChunk[]): LegalChunk[] {
  return chunks
    .map((chunk) => ({
      chunk,
      score: (chunk.similarity ?? 0) * 0.7 + keywordScore(query, chunk) * 0.3,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ chunk }) => chunk);
}

export async function searchLegalChunks(
  query: string,
  matchCount = 6,
  threshold = 0.65
): Promise<LegalChunk[]> {
  const supabase = getSupabaseAdmin();
  const embedding = await embedText(query);

  const { data, error } = await supabase.rpc("search_legal_chunks", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: matchCount,
  });

  if (error) {
    console.error("RAG search error:", error);
    return [];
  }

  const chunks = (data as LegalChunk[]) ?? [];
  return rerankChunks(query, chunks);
}

export function buildLegalContext(chunks: LegalChunk[]): string {
  if (chunks.length === 0) return "";

  return chunks
    .map((chunk) => {
      const ref = [chunk.regulation, chunk.article_number && `Art. ${chunk.article_number}`, chunk.article_title]
        .filter(Boolean)
        .join(" — ");
      return `[${ref}]\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}
