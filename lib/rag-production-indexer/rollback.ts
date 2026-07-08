/**
 * rollback.ts — Rollback d'un document récemment indexé en production.
 *
 * Permet d'annuler l'indexation d'un document dans legal_chunks et de restaurer
 * les chunks archivés dans historical_chunks (embedding inclus).
 *
 * Usage :
 *   npx tsx lib/rag-production-indexer/rollback.ts --document-id=<uuid>
 *   ou via l'API (voir RAG_PRODUCTION_INDEXER.md)
 *
 * Algorithme :
 *  1. Trouver tous les legal_chunks avec pending_document_id = <documentId>
 *  2. Pour chaque chunk trouvé :
 *     a. Chercher la version précédente dans historical_chunks
 *        (original_chunk_id = chunk.id, archive_reason = 'updated')
 *     b. Si version précédente trouvée → restaurer (UPDATE legal_chunk avec
 *        les valeurs archivées : content, embedding, chunk_hash)
 *     c. Si pas de version précédente (chunk nouveau) → supprimer de legal_chunks
 *  3. Remettre staging_chunks.validation_status → 'pending' pour les chunks du doc
 *  4. Remettre pending_documents.status → 'staged'
 *
 * Règles de sécurité :
 * - Vérifie que le document a bien été indexé par le pipeline automatique
 *   (source_method = 'automated_pipeline') pour éviter d'effacer des données manuelles
 * - Opération atomique par chunk (les autres chunks du batch restent cohérents)
 */


import type { RollbackResult } from "./types";

export async function rollbackDocument(
  supabase: import("@supabase/supabase-js").SupabaseClient<any>,
  documentId: string,
  dryRun = false
): Promise<RollbackResult> {
  const errors: string[] = [];
  let chunksDeleted = 0;
  let chunksRestored = 0;

  // 1. Récupérer tous les legal_chunks indexés pour ce document
  const { data: legalChunks, error: fetchError } = await supabase
    .from("legal_chunks")
    .select("id, chunk_hash, content, regulation, article_number, pending_document_id, source_method")
    .eq("pending_document_id", documentId)
    .eq("source_method", "automated_pipeline");

  if (fetchError) {
    return {
      documentId,
      chunksDeleted: 0,
      chunksRestored: 0,
      errors: [`Erreur récupération legal_chunks: ${fetchError.message}`],
    };
  }

  if (!legalChunks || legalChunks.length === 0) {
    return {
      documentId,
      chunksDeleted: 0,
      chunksRestored: 0,
      errors: ["Aucun legal_chunk trouvé pour ce document avec source_method='automated_pipeline'"],
    };
  }

  for (const lc of legalChunks) {
    try {
      // 2. Chercher la version précédente dans historical_chunks
      const { data: historical } = await supabase
        .from("historical_chunks")
        .select("id, content, embedding, chunk_hash, regulation, article_number, version_date")
        .eq("original_chunk_id", lc.id)
        .eq("archive_reason", "updated")
        .order("archived_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (historical) {
        // 2b. Restaurer la version précédente
        if (!dryRun) {
          const { error: restoreError } = await supabase
            .from("legal_chunks")
            .update({
              content: historical.content,
              embedding: historical.embedding,
              chunk_hash: historical.chunk_hash,
              regulation: historical.regulation,
              article_number: historical.article_number,
              version_date: historical.version_date,
              source_method: "manual", // rétabli comme version manuelle
              pending_document_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", lc.id);

          if (restoreError) {
            errors.push(`Erreur restauration chunk ${lc.id}: ${restoreError.message}`);
            continue;
          }

          // Marquer l'entrée historical comme "restored" dans metadata
          await supabase
            .from("historical_chunks")
            .update({ archive_reason: "superseded" })
            .eq("id", historical.id);
        }
        chunksRestored++;
      } else {
        // 2c. Nouveau chunk (pas d'historique) → supprimer
        if (!dryRun) {
          const { error: deleteError } = await supabase
            .from("legal_chunks")
            .delete()
            .eq("id", lc.id);

          if (deleteError) {
            errors.push(`Erreur suppression chunk ${lc.id}: ${deleteError.message}`);
            continue;
          }
        }
        chunksDeleted++;
      }
    } catch (e) {
      errors.push(`Exception chunk ${lc.id}: ${(e as Error).message}`);
    }
  }

  // 3. Remettre staging_chunks en statut "pending"
  if (!dryRun && errors.length === 0) {
    await supabase
      .from("staging_chunks")
      .update({ validation_status: "pending", validated_at: null, validated_by: null })
      .eq("document_id", documentId)
      .eq("validation_status", "approved");
  }

  // 4. Remettre pending_documents en statut "staged"
  if (!dryRun && errors.length === 0) {
    await supabase
      .from("pending_documents")
      .update({ status: "staged", updated_at: new Date().toISOString() })
      .eq("id", documentId);
  }

  return { documentId, chunksDeleted, chunksRestored, errors };
}

// ─── CLI Entry point ──────────────────────────────────────────────────────────

/**
 * Point d'entrée CLI :
 *   npx tsx lib/rag-production-indexer/rollback.ts --document-id=<uuid> [--dry-run]
 */
if (require.main === module || process.argv[1]?.includes("rollback.ts")) {
  void (async () => {
    const { createClient } = await import("@supabase/supabase-js");

    const args = process.argv.slice(2);
    const documentIdArg = args.find((a) => a.startsWith("--document-id="));
    const isDryRun = args.includes("--dry-run");

    if (!documentIdArg) {
      console.error("Usage: npx tsx rollback.ts --document-id=<uuid> [--dry-run]");
      process.exit(1);
    }

    const documentId = documentIdArg.replace("--document-id=", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`\n🔄 Rollback document ${documentId}${isDryRun ? " (DRY RUN)" : ""}...\n`);
    const result = await rollbackDocument(supabase, documentId, isDryRun);

    console.log("Résultat :");
    console.log(`  ✓ Chunks supprimés  : ${result.chunksDeleted}`);
    console.log(`  ✓ Chunks restaurés  : ${result.chunksRestored}`);
    if (result.errors.length > 0) {
      console.log(`  ✗ Erreurs          : ${result.errors.length}`);
      result.errors.forEach((e) => console.log(`    - ${e}`));
    }
    if (isDryRun) {
      console.log("\n⚠️  DRY RUN : aucune modification appliquée.");
    }
  })();
}
