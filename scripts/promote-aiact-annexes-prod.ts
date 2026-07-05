#!/usr/bin/env tsx
import { runProductionIndexer } from "@/lib/rag-production-indexer/pipeline";

const DOCUMENT_ID = "b6829930-53ff-4278-b741-76a2b1bdd5a0";
const isDryRun = !process.argv.includes("--prod");

console.log("=".repeat(70));
console.log("  promote-aiact-annexes-prod.ts — AI Act Annexes+Considérants → legal_chunks");
console.log("=".repeat(70));
console.log(`Mode     : ${isDryRun ? "DRY-RUN" : "PRODUCTION"}`);
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

  console.log("\n📊 Résumé promotion AI Act Annexes+Considérants :");
  console.log(`  Chunks insérés    : ${result.totalInserted}`);
  console.log(`  Chunks mis à jour : ${result.totalUpdated}`);
  console.log(`  Chunks ignorés    : ${result.totalSkipped}`);
  console.log(`  Erreurs           : ${result.totalErrors}`);
  console.log(`  Cache invalidé    : ${result.cacheInvalidated}`);
  console.log(`  Durée             : ${result.durationMs}ms`);

  if (result.totalErrors > 0) { console.error("\n❌ Erreurs — vérifier rapport."); process.exit(1); }
  if (isDryRun) console.log("\n⚠️  DRY-RUN : relancez avec --prod.");
  else console.log("\n✅ Promotion terminée. AI Act annexes+considérants actifs dans legal_chunks.");
})();
