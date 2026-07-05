#!/usr/bin/env tsx
import { runProductionIndexer } from "@/lib/rag-production-indexer/pipeline";

const DOCUMENT_ID = "549f511a-3d24-4afc-9964-202024683f1f";
const isDryRun = !process.argv.includes("--prod");

console.log("=".repeat(70));
console.log("  promote-eprivacy-prod.ts — ePrivacy → legal_chunks");
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
    maxChunksPerDocument: 200,
  });

  console.log("\n📊 Résumé promotion ePrivacy :");
  console.log(`  Chunks insérés    : ${result.totalInserted}`);
  console.log(`  Chunks mis à jour : ${result.totalUpdated}`);
  console.log(`  Chunks ignorés    : ${result.totalSkipped}`);
  console.log(`  Erreurs           : ${result.totalErrors}`);
  console.log(`  Cache invalidé    : ${result.cacheInvalidated}`);
  console.log(`  Durée             : ${result.durationMs}ms`);

  if (result.totalErrors > 0) { console.error("\n❌ Erreurs — vérifier rapport."); process.exit(1); }
  if (isDryRun) console.log("\n⚠️  DRY-RUN : relancez avec --prod.");
  else console.log("\n✅ Promotion terminée. ePrivacy actif dans legal_chunks.");
})();
