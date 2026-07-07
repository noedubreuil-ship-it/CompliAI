/**
 * Cron RAG Ingestion — Phase 2.
 *
 * Commande d'exécution :
 *   npx tsx --env-file=.env.local scripts/cron-ingestion.ts
 *
 * Fréquence recommandée :
 *   Toutes les 6 heures.
 *
 * Variables d'environnement requises :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 *
 * Variables optionnelles :
 *   RAG_INGESTION_BATCH_SIZE   Nombre de documents par cycle, plafonné à 20
 *   RAG_INGESTION_THROTTLE_MS  Délai entre deux appels Claude, défaut 1500 ms
 *
 * Sortie :
 *   JSON Lines vers stdout, compatible avec un collecteur de logs.
 *
 * Code de sortie :
 *   0 = cycle terminé sans erreur critique
 *   1 = erreur fatale ou au moins un document en erreur de parsing/staging
 */

import { runIngestionPipeline } from "../lib/rag-ingestion/pipeline";
import { RAG_INGESTION_MODEL } from "../lib/rag-ingestion/parsers/types";

type LogLevel = "info" | "warn" | "error";

const MAX_BATCH_SIZE = 20;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_THROTTLE_MS = 1500;

const ORIGINAL_CONSOLE = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

function logJson(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {}
): void {
  process.stdout.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      component: "rag-cron-ingestion",
      event,
      ...fields,
    })}\n`
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parsePositiveInteger(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getBatchSize(): number {
  return Math.min(
    parsePositiveInteger(process.env.RAG_INGESTION_BATCH_SIZE, DEFAULT_BATCH_SIZE),
    MAX_BATCH_SIZE
  );
}

function getThrottleMs(): number {
  return parsePositiveInteger(process.env.RAG_INGESTION_THROTTLE_MS, DEFAULT_THROTTLE_MS);
}

function assertRequiredEnv(): void {
  const missing = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
  ].filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Variables requises manquantes : ${missing.join(", ")}.`);
  }
}

function installStructuredConsoleBridge(): void {
  console.log = (...args: unknown[]) => {
    logJson("info", "pipeline_log", { message: args.map(String).join(" ") });
  };
  console.warn = (...args: unknown[]) => {
    logJson("warn", "pipeline_warning", { message: args.map(String).join(" ") });
  };
  console.error = (...args: unknown[]) => {
    logJson("error", "pipeline_error", { message: args.map(String).join(" ") });
  };
}

function restoreConsole(): void {
  console.log = ORIGINAL_CONSOLE.log;
  console.warn = ORIGINAL_CONSOLE.warn;
  console.error = ORIGINAL_CONSOLE.error;
}

async function main(): Promise<void> {
  assertRequiredEnv();

  const startedAt = Date.now();
  const batchSize = getBatchSize();
  const throttleMs = getThrottleMs();

  logJson("info", "cycle_started", {
    dryRun: false,
    model: RAG_INGESTION_MODEL,
    batchSize,
    maxBatchSize: MAX_BATCH_SIZE,
    throttleMs,
  });

  installStructuredConsoleBridge();

  try {
    const result = await runIngestionPipeline({
      dryRun: false,
      batchSize,
      throttleMs,
    });

    restoreConsole();

    const status = result.errors > 0 ? "error" : "ok";

    logJson(status === "error" ? "error" : "info", "cycle_completed", {
      status,
      durationMs: Date.now() - startedAt,
      processed: result.processed,
      staged: result.staged,
      errors: result.errors,
      skipped: result.skipped,
      totalInputTokens: result.totalInputTokens,
      totalOutputTokens: result.totalOutputTokens,
      documents: result.details.map((detail) => ({
        documentId: detail.documentId,
        documentType: detail.documentType,
        title: detail.title,
        status: detail.status,
        chunksCount: detail.chunksCount,
        error: detail.error,
        inputTokens: detail.inputTokens,
        outputTokens: detail.outputTokens,
        promptHash: detail.promptHash,
      })),
    });

    if (result.errors > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    restoreConsole();
    logJson("error", "cycle_failed", {
      durationMs: Date.now() - startedAt,
      error: errorMessage(error),
    });
    process.exitCode = 1;
  }
}

void main();
