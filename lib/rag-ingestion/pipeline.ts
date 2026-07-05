/**
 * Pipeline d'ingestion RAG — Phase 2
 *
 * Flux : pending_documents → parsing Claude → validation → staging_chunks
 *
 * Règles non-négociables :
 * - Mode staging strict : aucune écriture dans legal_chunks (production)
 * - Tous les chunks passent par le validateur avant insertion
 * - Le statut de pending_documents est mis à jour à chaque étape
 * - En mode dryRun, aucune écriture en base — sortie JSON dans stdout
 */

import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

import { parseDocumentWithClaude } from "./parsers/base-parser";
import { type ParserInput, type StagingChunkInsert, type SupportedDocumentType } from "./parsers/types";
import { validateChunks } from "./validator";

const REQUIRED_INGESTION_TABLES = [
  "pending_documents",
  "staging_chunks",
] as const;

function logIngestionDbError(
  event: string,
  fields: Record<string, unknown>
): void {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      component: "rag-ingestion-pipeline",
      event,
      ...fields,
    })
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PendingDocument {
  id: string;
  source_id: string | null;
  external_id: string | null;
  celex: string | null;
  ecli: string | null;
  source_url: string;
  title: string | null;
  document_type: string;
  language: string;
  country: string;
  publication_date: string | null;
  status: string;
  raw_content_url: string | null;
  raw_content_text: string | null;
  metadata: Record<string, unknown>;
}

export interface PipelineOptions {
  /** Mode dry-run : pas d'écriture en base, sortie JSON console */
  dryRun?: boolean;
  /** Nombre max de documents à traiter par cycle */
  batchSize?: number;
  /** Filtrer par type de document (optionnel) */
  documentType?: SupportedDocumentType;
  /** Traiter uniquement ces IDs pending_documents (optionnel) */
  documentIds?: string[];
  /** Throttle en ms entre deux appels Claude */
  throttleMs?: number;
}

export interface PipelineRunResult {
  processed: number;
  staged: number;
  errors: number;
  skipped: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  details: PipelineDocumentResult[];
}

export interface PipelineDocumentResult {
  documentId: string;
  documentType: string;
  title: string | null;
  status: "staged" | "error" | "skipped";
  chunksCount?: number;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  promptHash?: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_THROTTLE_MS = 1000;

const SUPPORTED_DOCUMENT_TYPES = new Set<string>([
  "eu_regulation",
  "eu_directive",
  "cjeu_judgment",
  "cjeu_order",
  "edpb_guideline",
  "edpb_recommendation",
  "edpb_binding_decision",
  "ai_office_guidance",
  "national_decision",
  "national_guideline",
]);

// ─── Supabase admin client ────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.");
  }
  return createClient(url, key);
}

export async function assertIngestionDatabaseReady(
  supabase: ReturnType<typeof createClient<any>>
): Promise<void> {
  const missingOrInaccessible: string[] = [];

  for (const tableName of REQUIRED_INGESTION_TABLES) {
    const { error } = await supabase
      .from(tableName)
      .select("id")
      .limit(1);

    if (error) {
      missingOrInaccessible.push(`${tableName}: ${error.message}`);
    }
  }

  if (missingOrInaccessible.length > 0) {
    const message =
      "Tables ingestion requises absentes ou inaccessibles : " +
      missingOrInaccessible.join(" | ");
    logIngestionDbError("database_preflight_failed", {
      missingOrInaccessible,
    });
    throw new Error(message);
  }
}

async function updatePendingDocumentOrThrow(
  supabase: ReturnType<typeof createClient<any>>,
  documentId: string,
  values: Record<string, unknown>,
  event: string
): Promise<void> {
  const { error } = await supabase
    .from("pending_documents")
    .update(values)
    .eq("id", documentId);

  if (error) {
    logIngestionDbError(event, {
      documentId,
      values,
      error: error.message,
    });
    throw new Error(
      `Mise à jour pending_documents échouée (${event}) pour ${documentId}: ${error.message}`
    );
  }
}

// ─── Fetch du texte brut d'un document ───────────────────────────────────────

async function fetchUrlText(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "CompliAI-RAG/2.0 (+https://compliai.fr)" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) return null;
    const text = await resp.text();
    return text.length > 100 ? text : null;
  } catch {
    return null;
  }
}

async function fetchDocumentText(doc: PendingDocument): Promise<string | null> {
  // Priorité 1 : texte déjà extrait en base
  if (doc.raw_content_text && doc.raw_content_text.trim().length > 100) {
    return doc.raw_content_text;
  }
  // Priorité 2 : télécharger depuis raw_content_url
  if (doc.raw_content_url) {
    const text = await fetchUrlText(doc.raw_content_url);
    if (text) return text;
  }
  // Priorité 3 : page source officielle (monitoring ne remplit pas toujours raw_content_url)
  if (doc.source_url) {
    return fetchUrlText(doc.source_url);
  }
  return null;
}

// ─── Sleep utilitaire ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

/**
 * Exécute un cycle d'ingestion RAG.
 *
 * En mode production (dryRun = false), écrit dans staging_chunks.
 * En mode dryRun, affiche la sortie JSON sans aucune écriture.
 */
export async function runIngestionPipeline(
  options: PipelineOptions = {}
): Promise<PipelineRunResult> {
  const {
    dryRun = true,
    batchSize = DEFAULT_BATCH_SIZE,
    documentType,
    documentIds,
    throttleMs = DEFAULT_THROTTLE_MS,
  } = options;

  const result: PipelineRunResult = {
    processed: 0,
    staged: 0,
    errors: 0,
    skipped: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    details: [],
  };

  if (dryRun) {
    console.log("[RAG Pipeline] Mode dryRun activé — aucune écriture en base.");
  }

  // 1. Récupérer les documents pending
  const supabase = getSupabaseAdmin();
  await assertIngestionDatabaseReady(supabase);

  let query = supabase
    .from("pending_documents")
    .select("*")
    .eq("status", "pending")
    .order("detected_at", { ascending: true });

  if (documentIds && documentIds.length > 0) {
    query = query.in("id", documentIds);
  } else {
    query = query.limit(batchSize);
  }

  if (documentType) {
    query = query.eq("document_type", documentType);
  }

  const { data: pendingDocs, error: fetchError } = await query;

  if (fetchError) {
    throw new Error(`Erreur de récupération des documents pending : ${fetchError.message}`);
  }
  if (!pendingDocs || pendingDocs.length === 0) {
    console.log("[RAG Pipeline] Aucun document pending à traiter.");
    return result;
  }

  console.log(`[RAG Pipeline] ${pendingDocs.length} document(s) à traiter.`);

  // 2. Traiter chaque document
  for (const doc of pendingDocs as PendingDocument[]) {
    result.processed++;

    const docResult: PipelineDocumentResult = {
      documentId: doc.id,
      documentType: doc.document_type,
      title: doc.title,
      status: "error",
    };

    // Vérifier que le type est supporté
    if (!SUPPORTED_DOCUMENT_TYPES.has(doc.document_type)) {
      docResult.status = "skipped";
      docResult.error = `Type non supporté : ${doc.document_type}`;
      result.skipped++;
      result.details.push(docResult);
      continue;
    }

    // Marquer comme "fetching" (sauf dryRun)
    if (!dryRun) {
      await updatePendingDocumentOrThrow(
        supabase,
        doc.id,
        { status: "fetching", last_attempted_at: new Date().toISOString() },
        "pending_document_mark_fetching_failed"
      );
    }

    // 3. Récupérer le texte du document
    const documentText = await fetchDocumentText(doc);
    if (!documentText) {
      const errMsg = "Impossible de récupérer le texte du document (raw_content_text vide et raw_content_url inaccessible).";
      docResult.error = errMsg;
      result.errors++;

      if (!dryRun) {
        await updatePendingDocumentOrThrow(
          supabase,
          doc.id,
          {
            status: "error",
            error_message: errMsg,
            retry_count: ((doc as PendingDocument & { retry_count?: number }).retry_count ?? 0) + 1,
          },
          "pending_document_mark_fetch_error_failed"
        );
      }

      result.details.push(docResult);
      continue;
    }

    // Marquer comme "parsing" (sauf dryRun)
    if (!dryRun) {
      await updatePendingDocumentOrThrow(
        supabase,
        doc.id,
        { status: "parsing" },
        "pending_document_mark_parsing_failed"
      );
    }

    // 4. Parser avec Claude
    const parserInput: ParserInput = {
      documentId: doc.id,
      documentType: doc.document_type as SupportedDocumentType,
      documentText,
      sourceUrl: doc.source_url,
      eurLexUrl: doc.metadata?.eurlex_url as string | undefined,
      publicationDate: doc.publication_date,
      language: doc.language,
      country: doc.country,
    };

    const parserResponse = await parseDocumentWithClaude(parserInput);

    if (!parserResponse.ok) {
      const errMsg = `Parsing Claude échoué : ${parserResponse.error}`;
      docResult.error = errMsg;
      result.errors++;

      if (!dryRun) {
        await updatePendingDocumentOrThrow(
          supabase,
          doc.id,
          { status: "error", error_message: errMsg },
          "pending_document_mark_parse_error_failed"
        );
      }

      if (parserResponse.usage) {
        result.totalInputTokens += parserResponse.usage.inputTokens;
        result.totalOutputTokens += parserResponse.usage.outputTokens;
      }

      result.details.push(docResult);
      await sleep(throttleMs);
      continue;
    }

    result.totalInputTokens += parserResponse.usage.inputTokens;
    result.totalOutputTokens += parserResponse.usage.outputTokens;
    docResult.inputTokens = parserResponse.usage.inputTokens;
    docResult.outputTokens = parserResponse.usage.outputTokens;
    docResult.promptHash = parserResponse.promptHash;

    // 5. Valider les chunks
    const validation = validateChunks(parserResponse.chunks);
    if (!validation.valid) {
      const errMsg = `Validation échouée : ${validation.errors.map((e) => e.message).join("; ")}`;
      docResult.error = errMsg;
      result.errors++;

      if (!dryRun) {
        await updatePendingDocumentOrThrow(
          supabase,
          doc.id,
          { status: "error", error_message: errMsg },
          "pending_document_mark_validation_error_failed"
        );
      }

      result.details.push(docResult);
      await sleep(throttleMs);
      continue;
    }

    if (validation.warnings.length > 0) {
      console.warn(`[RAG Pipeline] Avertissements pour ${doc.id} :`, validation.warnings);
    }

    docResult.chunksCount = parserResponse.chunks.length;

    // 6. Insérer dans staging_chunks (ou afficher en dryRun)
    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            documentId: doc.id,
            documentType: doc.document_type,
            title: doc.title,
            promptHash: parserResponse.promptHash,
            chunksCount: parserResponse.chunks.length,
            usage: parserResponse.usage,
            chunks: parserResponse.chunks.map((c) => ({
              article_number: c.article_number,
              article_title: c.article_title,
              contentPreview: c.content.slice(0, 80) + "...",
            })),
          },
          null,
          2
        )
      );
      docResult.status = "staged";
      result.staged++;
    } else {
      const insertResult = await insertChunksToStaging(supabase, parserResponse.chunks);
      if (!insertResult.ok) {
        const errMsg = `Insertion staging_chunks échouée : ${insertResult.error}`;
        docResult.error = errMsg;
        result.errors++;

        await updatePendingDocumentOrThrow(
          supabase,
          doc.id,
          { status: "error", error_message: errMsg },
          "pending_document_mark_staging_error_failed"
        );

        result.details.push(docResult);
        await sleep(throttleMs);
        continue;
      }

      // Mettre à jour le statut en "staged"
      await updatePendingDocumentOrThrow(
        supabase,
        doc.id,
        { status: "staged" },
        "pending_document_mark_staged_failed"
      );

      docResult.status = "staged";
      result.staged++;
    }

    result.details.push(docResult);
    await sleep(throttleMs);
  }

  // 3. Afficher le résumé
  console.log(
    `[RAG Pipeline] Terminé : ${result.staged} staged, ${result.errors} erreurs, ${result.skipped} ignorés. Tokens : ${result.totalInputTokens} in / ${result.totalOutputTokens} out.`
  );

  return result;
}

// ─── Insertion dans staging_chunks ───────────────────────────────────────────

/** Exportée pour les tests unitaires (spy sur la fonction). */
export async function insertChunksToStaging(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient<any>>,
  chunks: StagingChunkInsert[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Insérer par lots de 50 pour éviter les timeouts
  const BATCH_SIZE = 50;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("staging_chunks").insert(batch);
    if (error) {
      logIngestionDbError("staging_chunks_insert_failed", {
        batchStart: i,
        batchSize: batch.length,
        error: error.message,
      });
      return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}
