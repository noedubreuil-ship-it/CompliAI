#!/usr/bin/env tsx
import { runProductionIndexer } from "@/lib/rag-production-indexer/pipeline";

const DOCS = [
  { name: "PSEUDO",       id: "385f7946-a6e9-4b43-8a56-539a852fbf5c", est: 123  },
  { name: "LEGITIME",     id: "e3fb4a4f-8552-45a8-8bbc-f983c263c8c0", est: 134  },
  { name: "EPRIVACY_TECH",id: "cbe3bc22-3378-47ff-8809-e8bbff687466", est: 38   },
  { name: "ACCES",        id: "45d6afdb-6b3e-4737-ae89-d402c1303f19", est: 201  },
  { name: "OPINION_AI",   id: "15d03c9b-8e6e-4101-8031-21955941eb5d", est: 113  },
  { name: "HIGHRISK",     id: "8ad9a793-19b9-46f8-895a-4ae5dff5e12b", est: 509  },
  { name: "PROHIBITED",   id: "d838e0cd-0da9-426a-a4b6-b7b9017e1598", est: 388  },
];

const docFilter = process.argv.find(a => a.startsWith("--doc="))?.replace("--doc=", "").toUpperCase();
const toProcess = docFilter ? DOCS.filter(d => d.name === docFilter) : DOCS;

void (async () => {
  console.log("=".repeat(60));
  console.log("  promote-guidelines.ts — EDPB × 5 + Commission × 2");
  console.log("=".repeat(60));

  let totalInserted = 0, totalErrors = 0;

  for (const doc of toProcess) {
    console.log(`\n── ${doc.name} (${doc.est} chunks) ──`);
    const r = await runProductionIndexer([doc.id], {
      dryRun: false, throttleMs: 200, embeddingBatchSize: 50,
      cacheInvalidationThreshold: 0.85, maxChunksPerDocument: 600,
    });
    totalInserted += r.totalInserted;
    totalErrors += r.totalErrors;
    console.log(`  insérés=${r.totalInserted} màj=${r.totalUpdated} ignorés=${r.totalSkipped} erreurs=${r.totalErrors} (${r.durationMs}ms)`);
    const errs = r.documents.flatMap(d => d.details.filter(o => o.status === "error"));
    for (const e of errs.slice(0, 5)) console.error(`  [ERR] ${(e as { error?: string }).error}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`TOTAL : ${totalInserted} insérés | ${totalErrors} erreurs`);
  if (totalErrors === 0) console.log("✅ Promotion guidelines terminée sans erreur.");
  else { console.error(`⚠️  ${totalErrors} erreur(s).`); process.exit(1); }
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
