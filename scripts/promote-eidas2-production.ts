#!/usr/bin/env tsx
/**
 * promote-eidas2-production.ts — Promotion eIDAS 2 staging → legal_chunks.
 *
 * Utilise le pipeline rag-production-indexer :
 *   - embedBatch (OpenAI text-embedding-3-small)
 *   - upsertChunk (insert | update+archive | skip)
 *   - invalidateSemanticCache (Upstash cosine 0.85)
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/promote-eidas2-production.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/promote-eidas2-production.ts --prod
 */

import { runProductionIndexer } from "@/lib/rag-production-indexer/pipeline";

const DOCUMENT_ID = "48dbad02-519d-4e89-ae4a-c9d61a69ddb5";
const isDryRun = !process.argv.includes("--prod");

console.log("=".repeat(70));
console.log("  promote-eidas2-production.ts — Promotion eIDAS 2 vers legal_chunks");
console.log("=".repeat(70));
console.log(`Mode : ${isDryRun ? "DRY-RUN" : "PRODUCTION"}`);
console.log(`Document : ${DOCUMENT_ID}`);
console.log();

void (async () => {
  const result = await runProductionIndexer([DOCUMENT_ID], {
    dryRun: isDryRun,
    throttleMs: 300,
    embeddingBatchSize: 50,
    cacheInvalidationThreshold: 0.85,
    maxChunksPerDocument: 1000,
  });

  console.log("\n📊 Résumé promotion eIDAS 2 :");
  console.log(`  Chunks insérés     : ${result.totalInserted}`);
  console.log(`  Chunks mis à jour  : ${result.totalUpdated}`);
  console.log(`  Chunks ignorés     : ${result.totalSkipped}`);
  console.log(`  Erreurs            : ${result.totalErrors}`);
  console.log(`  Cache invalidé     : ${result.cacheInvalidated}`);
  console.log(`  Durée              : ${result.durationMs}ms`);

  if (result.totalErrors > 0) {
    console.error("\n❌ Des erreurs sont survenues — vérifier le rapport détaillé.");
    process.exit(1);
  }

  if (isDryRun) {
    console.log("\n⚠️  DRY-RUN : relancez avec --prod pour écrire en production.");
  } else {
    console.log("\n✅ Promotion terminée. eIDAS 2 actif dans legal_chunks.");
  }
})();
