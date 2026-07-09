/**
 * Ingestion ciblée par batch (pending_documents → staging_chunks).
 *
 * Usage :
 *   RAG_INGESTION_BATCH_NAME=edpb-fr npx tsx --env-file=.env.local scripts/cron-ingestion-batch.ts
 *   npx tsx --env-file=.env.local scripts/cron-ingestion-batch.ts --batch=edpb-fr
 *   npx tsx --env-file=.env.local scripts/cron-ingestion-batch.ts --batch=edpb-fr --dry-run
 */

import { runIngestionPipeline } from "../lib/rag-ingestion/pipeline";
import { RAG_INGESTION_MODEL } from "../lib/rag-ingestion/parsers/types";
import { getBatchByName, INGESTION_BATCHES } from "./ingestion-batches";

type LogLevel = "info" | "warn" | "error";

function logJson(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  process.stdout.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      component: "rag-cron-ingestion-batch",
      event,
      ...fields,
    })}\n`
  );
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

async function main(): Promise<void> {
  assertRequiredEnv();

  const batchArg = process.argv.find((a) => a.startsWith("--batch="));
  const batchName = batchArg?.split("=")[1] ?? process.env.RAG_INGESTION_BATCH_NAME;
  const dryRun = process.argv.includes("--dry-run");

  if (!batchName) {
    console.error("Batch requis. Options :");
    for (const b of INGESTION_BATCHES) {
      console.error(`  --batch=${b.name}  (${b.documentIds.length} docs) — ${b.label}`);
    }
    process.exit(1);
  }

  const batch = getBatchByName(batchName);
  if (!batch) {
    throw new Error(`Batch inconnu : ${batchName}`);
  }

  const startedAt = Date.now();
  logJson("info", "batch_started", {
    batchName: batch.name,
    label: batch.label,
    documentCount: batch.documentIds.length,
    dryRun,
    model: RAG_INGESTION_MODEL,
  });

  const result = await runIngestionPipeline({
    dryRun,
    documentIds: batch.documentIds,
    throttleMs: 1500,
  });

  const status = result.errors > 0 ? "error" : "ok";
  logJson(status === "error" ? "error" : "info", "batch_completed", {
    batchName: batch.name,
    status,
    durationMs: Date.now() - startedAt,
    processed: result.processed,
    staged: result.staged,
    errors: result.errors,
    skipped: result.skipped,
    totalInputTokens: result.totalInputTokens,
    totalOutputTokens: result.totalOutputTokens,
    documents: result.details,
  });

  if (!dryRun && result.staged > 0) {
    console.log(`\n✅ Batch "${batch.name}" prêt pour validation admin : /dashboard/admin/rag-validation`);
  }

  if (result.errors > 0) process.exitCode = 1;
}

void main();
