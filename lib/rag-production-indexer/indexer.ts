/**
 * indexer.ts — Promotion d'un staging_chunk vers legal_chunks.
 *
 * Logique d'upsert en 3 cas :
 *  1. chunk_hash identique → ignoré (pas de duplication)
 *  2. Même identité (regulation + article_number + paragraph_number + point_letter + language)
 *     mais hash différent → mise à jour : archivage de l'ancien + update du nouveau
 *  3. Aucun chunk correspondant → insertion
 *
 * Règles non-négociables :
 * - Service role Supabase obligatoire (RLS contournée pour legal_chunks insert/update)
 * - Embeddings générés en batch avant les écritures DB
 * - Chaque opération est loggée dans son ChunkOutcome
 * - Aucune écriture en mode dryRun
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { SupabaseClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;
import { archiveLegalChunk } from "./archiver";
import type { StagingChunkApproved, LegalChunkRow, ChunkOutcome } from "./types";

// ─── Recherche de chunks existants ───────────────────────────────────────────

/**
 * Cherche un legal_chunk par chunk_hash (correspondance exacte).
 */
export async function findByHash(
  supabase: AnyClient,
  chunkHash: string
): Promise<LegalChunkRow | null> {
  const { data } = await supabase
    .from("legal_chunks")
    .select("id, regulation, article_number, paragraph_number, point_letter, article_title, chapter, content, embedding, eurlex_url, language, chunk_hash, version_date, text_type, country, pending_document_id, source_method, created_at, updated_at")
    .eq("chunk_hash", chunkHash)
    .maybeSingle();
  return (data as LegalChunkRow | null) ?? null;
}

/**
 * Cherche un legal_chunk par identité sémantique (même article, même langue).
 * Utilisé pour détecter les mises à jour (contenu modifié, hash différent).
 *
 * Si multiple résultats (cas rare), retourne le plus récent.
 */
export async function findByIdentity(
  supabase: AnyClient,
  chunk: Pick<StagingChunkApproved, "regulation" | "article_number" | "paragraph_number" | "point_letter" | "language">
): Promise<LegalChunkRow | null> {
  const { data } = await supabase
    .from("legal_chunks")
    .select("id, regulation, article_number, paragraph_number, point_letter, article_title, chapter, content, embedding, eurlex_url, language, chunk_hash, version_date, text_type, country, pending_document_id, source_method, created_at, updated_at")
    .eq("regulation", chunk.regulation)
    .is("article_number", chunk.article_number === null ? null : undefined)
    // On ne peut pas filtrer null/non-null dynamiquement avec l'opérateur eq classique
    // On applique eq uniquement si non-null
    .order("updated_at", { ascending: false })
    .limit(1);

  // Filtrage manuel pour les cas null (Supabase JS ne gère pas bien is(null) combiné avec eq)
  const rows = (data ?? []) as LegalChunkRow[];
  const match = rows.find(
    (r) =>
      r.regulation === chunk.regulation &&
      (r.article_number ?? null) === (chunk.article_number ?? null) &&
      (r.paragraph_number ?? null) === (chunk.paragraph_number ?? null) &&
      (r.point_letter ?? null) === (chunk.point_letter ?? null) &&
      r.language === chunk.language
  );
  return match ?? null;
}

/**
 * Version plus robuste de la recherche par identité utilisant une requête
 * complète (non limitée par maybeSingle).
 */
export async function findByIdentityRobust(
  supabase: AnyClient,
  chunk: Pick<StagingChunkApproved, "regulation" | "article_number" | "paragraph_number" | "point_letter" | "language">
): Promise<LegalChunkRow | null> {
  const { data } = await supabase
    .from("legal_chunks")
    .select("id, regulation, article_number, paragraph_number, point_letter, article_title, chapter, content, embedding, eurlex_url, language, chunk_hash, version_date, text_type, country, pending_document_id, source_method, created_at, updated_at")
    .eq("regulation", chunk.regulation)
    .eq("language", chunk.language)
    .order("updated_at", { ascending: false });

  const rows = (data ?? []) as LegalChunkRow[];
  const match = rows.find(
    (r) =>
      (r.article_number ?? null) === (chunk.article_number ?? null) &&
      (r.paragraph_number ?? null) === (chunk.paragraph_number ?? null) &&
      (r.point_letter ?? null) === (chunk.point_letter ?? null)
  );
  return match ?? null;
}

// ─── Opération principale ─────────────────────────────────────────────────────

export interface UpsertChunkOptions {
  supabase: AnyClient;
  stagingChunk: StagingChunkApproved;
  embedding: number[];
  documentId: string;
  dryRun: boolean;
}

/**
 * Effectue l'upsert d'un staging_chunk vers legal_chunks.
 * Retourne un ChunkOutcome décrivant l'action effectuée.
 */
export async function upsertChunk({
  supabase,
  stagingChunk,
  embedding,
  documentId,
  dryRun,
}: UpsertChunkOptions): Promise<ChunkOutcome> {
  const hash = stagingChunk.chunk_hash;

  try {
    // ── Cas 1 : hash identique → ignorer ─────────────────────────────────
    const existing = await findByHash(supabase, hash);
    if (existing) {
      return { status: "skipped", chunkHash: hash, reason: "identical_hash" };
    }

    // ── Cas 2 : même identité, hash différent → mise à jour ───────────────
    const sameArticle = await findByIdentityRobust(supabase, stagingChunk);

    if (sameArticle) {
      if (dryRun) {
        return {
          status: "updated",
          chunkHash: hash,
          embeddingDim: embedding.length,
          previousHash: sameArticle.chunk_hash ?? "",
          archivedId: "dry-run",
        };
      }

      // Archiver l'ancien chunk (préserve l'embedding)
      const archiveResult = await archiveLegalChunk(supabase, sameArticle, "updated");

      // Mettre à jour le legal_chunk existant
      const { error: updateError } = await supabase
        .from("legal_chunks")
        .update({
          content: stagingChunk.content,
          embedding,
          chunk_hash: hash,
          article_title: stagingChunk.article_title,
          chapter: stagingChunk.chapter,
          paragraph_number: stagingChunk.paragraph_number,
          point_letter: stagingChunk.point_letter,
          granularity: stagingChunk.granularity ?? "paragraph",
          parent_chunk_id: null, // résolution hiérarchie legal_chunks dans chantier dédié
          eurlex_url: stagingChunk.eurlex_url,
          publication_date: stagingChunk.publication_date,
          text_type: stagingChunk.text_type,
          country: stagingChunk.country,
          pending_document_id: documentId,
          source_method: "automated_pipeline",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sameArticle.id);

      if (updateError) {
        throw new Error(`update failed: ${updateError.message}`);
      }

      return {
        status: "updated",
        chunkHash: hash,
        embeddingDim: embedding.length,
        previousHash: sameArticle.chunk_hash ?? "",
        archivedId: archiveResult.archivedId,
      };
    }

    // ── Cas 3 : nouveau chunk → insertion ─────────────────────────────────
    if (dryRun) {
      return { status: "inserted", chunkHash: hash, embeddingDim: embedding.length };
    }

    const { error: insertError } = await supabase
      .from("legal_chunks")
      .insert({
        regulation: stagingChunk.regulation,
        article_number: stagingChunk.article_number,
        paragraph_number: stagingChunk.paragraph_number,
        point_letter: stagingChunk.point_letter,
        article_title: stagingChunk.article_title,
        chapter: stagingChunk.chapter,
        granularity: stagingChunk.granularity ?? "paragraph",
        parent_chunk_id: null, // résolution hiérarchie legal_chunks dans chantier dédié
        content: stagingChunk.content,
        embedding,
        eurlex_url: stagingChunk.eurlex_url,
        language: stagingChunk.language,
        chunk_hash: hash,
        version_date: stagingChunk.publication_date,
        text_type: stagingChunk.text_type,
        country: stagingChunk.country,
        pending_document_id: documentId,
        source_method: "automated_pipeline",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      // Gérer la race condition sur chunk_hash UNIQUE
      if (insertError.code === "23505") {
        return { status: "skipped", chunkHash: hash, reason: "identical_hash" };
      }
      throw new Error(`insert failed: ${insertError.message}`);
    }

    return { status: "inserted", chunkHash: hash, embeddingDim: embedding.length };

  } catch (e) {
    return {
      status: "error",
      chunkHash: hash,
      error: (e as Error).message,
    };
  }
}
