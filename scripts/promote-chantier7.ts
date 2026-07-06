#!/usr/bin/env tsx
import { runProductionIndexer } from "@/lib/rag-production-indexer/pipeline";

const DOCS = [
  { name: "DORA",     id: "8ef05820-072c-4a91-af5a-deafe83bc4dd", est: 777  },
  { name: "BREYER",   id: "64fa078f-1aec-48b7-ad0a-ffb923d7a41a", est: 28   },
  { name: "COSTEJA",  id: "52bacbd4-7b20-492d-a045-22ebdbcad3c1", est: 99   },
  { name: "SCHREMS2", id: "58f86981-a75b-441a-9baa-fd11c2ffc763", est: 203  },
];

const docFilter = process.argv.find(a => a.startsWith("--doc="))?.replace("--doc=", "").toUpperCase();
const toProcess = docFilter ? DOCS.filter(d => d.name === docFilter) : DOCS;

void (async () => {
  console.log("=".repeat(60));
  console.log("  promote-chantier7.ts — DORA + CJUE × 3");
  console.log("=".repeat(60));

  let totalInserted = 0, totalErrors = 0;

  for (const doc of toProcess) {
    console.log(`\n── ${doc.name} (${doc.est} chunks) ──`);
    const r = await runProductionIndexer([doc.id], {
      dryRun: false, throttleMs: 300, embeddingBatchSize: 50,
      cacheInvalidationThreshold: 0.85, maxChunksPerDocument: 1100,
    });
    totalInserted += r.totalInserted;
    totalErrors += r.totalErrors;
    console.log(`  insérés=${r.totalInserted} màj=${r.totalUpdated} ignorés=${r.totalSkipped} erreurs=${r.totalErrors} (${r.durationMs}ms)`);
    const errs = r.documents.flatMap(d => d.details.filter(o => o.status === "error"));
    for (const e of errs.slice(0, 5)) console.error(`  [ERR] hash=${(e as {chunkHash?:string}).chunkHash?.substring(0,12)} → ${(e as {error?:string}).error}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`TOTAL : ${totalInserted} insérés | ${totalErrors} erreurs`);
  if (totalErrors === 0) console.log("✅ Promotion Chantier 7 terminée sans erreur.");
  else { console.error(`⚠️  ${totalErrors} erreur(s).`); process.exit(1); }
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
