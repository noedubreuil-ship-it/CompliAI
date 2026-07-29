import { createClient } from "@supabase/supabase-js";
import { embedText } from "./embeddings";
import type { LegalChunk } from "@/lib/types/legal";
import { sanitizeRagTextForModel } from "./sanitize-rag-context";
import { rerankChunks } from "./rag-rerank";

// Uses service role to bypass RLS for vector search
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Recherche hybride optimisée pour le chat production.
 * Paramètres plus agressifs que la version de base :
 *  - seuil plus bas (0.20 vs 0.25) pour ne pas filtrer les articles courts
 *  - matchCount configurable (défaut 10)
 * Utilisé par app/api/chat/route.ts depuis la migration vers hybrid search (2026-07-09).
 */
export async function searchLegalChunksHybridChat(
  query: string,
  matchCount = 10,
  threshold = 0.20,
  regulationPrefix?: string
): Promise<LegalChunk[]> {
  return searchLegalChunksHybrid(query, matchCount, threshold, regulationPrefix);
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

/**
 * Recherche hybride (cosine 60% + BM25 40%).
 * Utilise la RPC search_legal_chunks_hybrid (migration 041).
 * Meilleure précision sur les queries contenant des termes juridiques
 * spécifiques (numéros d'articles, noms propres, mots-clés français).
 */
export async function searchLegalChunksHybrid(
  query: string,
  matchCount = 8,
  threshold = 0.25,
  regulationPrefix?: string
): Promise<LegalChunk[]> {
  const supabase = getSupabaseAdmin();
  const embedding = await embedText(query);

  // Toujours passer filter_regulation_prefix explicitement (jamais null/undefined) pour éviter
  // l'ambiguïté entre l'overload 4-params (migration 030) et 5-params (migration 041).
  // Chaîne vide → LIKE '%' → équivalent à "pas de filtre".
  const { data, error } = await supabase.rpc("search_legal_chunks_hybrid", {
    query_embedding: embedding,
    query_text: query,
    match_threshold: threshold,
    match_count: matchCount,
    filter_regulation_prefix: regulationPrefix ?? "",
  });

  if (error) {
    console.error("RAG hybrid search error:", error);
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
      return `[${ref}]\n${sanitizeRagTextForModel(chunk.content)}`;
    })
    .join("\n\n---\n\n");
}
