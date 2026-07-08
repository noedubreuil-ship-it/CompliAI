/**
 * archiver.ts — Archivage des anciennes versions dans historical_chunks.
 *
 * Avant toute mise à jour d'un legal_chunk existant, on préserve l'intégralité
 * de la version précédente (contenu + embedding) dans historical_chunks.
 * L'embedding original est conservé pour permettre un rollback sans recalcul.
 */


import { LegalChunkRow } from "./types";

export interface ArchiveResult {
  archivedId: string;
  originalChunkId: string;
}

/**
 * Archive un legal_chunk existant dans historical_chunks.
 *
 * @param supabase  Client service-role (contourne RLS — historical_chunks n'a pas de RLS)
 * @param chunk     Le chunk production à archiver
 * @param supersededBy  ID du nouveau legal_chunk qui remplacera cet ancien (peut être null au moment de l'archivage)
 * @param reason    Raison de l'archivage : "updated" | "deleted" | "superseded"
 */
export async function archiveLegalChunk(
  supabase: import("@supabase/supabase-js").SupabaseClient<any>,
  chunk: LegalChunkRow,
  reason: "updated" | "deleted" | "superseded",
  supersededBy?: string
): Promise<ArchiveResult> {
  const { data, error } = await supabase
    .from("historical_chunks")
    .insert({
      original_chunk_id: chunk.id,
      regulation: chunk.regulation,
      article_number: chunk.article_number,
      content: chunk.content,
      embedding: chunk.embedding,    // préservé tel quel, pas de recalcul
      chunk_hash: chunk.chunk_hash,
      version_date: chunk.version_date,
      archive_reason: reason,
      superseded_by: supersededBy ?? null,
      archived_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`[archiver] Erreur archivage chunk ${chunk.id}: ${error.message}`);
  }

  return {
    archivedId: data.id as string,
    originalChunkId: chunk.id,
  };
}
