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

  return (data as LegalChunk[]) ?? [];
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
