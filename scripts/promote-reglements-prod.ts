#!/usr/bin/env tsx
/**
 * promote-reglements-prod.ts — Promotion production des 8 règlements rechunkés
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/promote-reglements-prod.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/promote-reglements-prod.ts --prod
 *   npx tsx --env-file=.env.local scripts/promote-reglements-prod.ts --prod --reg=DSA
 */

import { runProductionIndexer } from "@/lib/rag-production-indexer/pipeline";

const DOCUMENTS = [
  { reg: "DSA",      id: "84b4fa6d-4195-455d-8e5d-194863207ab2", chunks: 928  },
  { reg: "DMA",      id: "1b42e485-4ed4-46ad-a3d1-178ef350974f", chunks: 579  },
  { reg: "NIS2",     id: "82348c40-9dc3-4db4-bbad-223cfb1e8c21", chunks: 643  },
  { reg: "CRA",      id: "64bcc20f-79e1-4927-808a-f4bd03bbb168", chunks: 658  },
  { reg: "DATA_ACT", id: "bb3c01a2-6794-4d50-a1a1-4066f0643d92", chunks: 650  },
  { reg: "DSM",      id: "7677dc51-5fbb-47cf-bd01-f1cc8629bed9", chunks: 244  },
  { reg: "DGA",      id: "87cde1d6-780b-448a-82ab-aa61e1240995", chunks: 400  },
  { reg: "MACHINE",  id: "44aa471d-9974-4a6e-aaa8-5eefbfa9ddd5", chunks: 509  },
];

const isDryRun = !process.argv.includes("--prod");
const regFilter = process.argv.find(a => a.startsWith("--reg="))?.replace("--reg=", "").toUpperCase();

const toProcess = regFilter
  ? DOCUMENTS.filter(d => d.reg === regFilter)
  : DOCUMENTS;

void (async () => {
  console.log("=".repeat(70));
  console.log("  promote-reglements-prod.ts — Promotion production Chantier 6");
  console.log("=".repeat(70));
  console.log(`Mode     : ${isDryRun ? "DRY-RUN" : "PRODUCTION"}`);
  console.log(`Documents: ${toProcess.map(d => d.reg).join(", ")}`);
  console.log();

  const summary: { reg: string; inserted: number; updated: number; skipped: number; errors: number; durationMs: number }[] = [];

  for (const doc of toProcess) {
    console.log(`\n${"─".repeat(70)}`);
    console.log(`  ${doc.reg} — document ${doc.id}`);
    console.log("─".repeat(70));

    const result = await runProductionIndexer([doc.id], {
      dryRun: isDryRun,
      throttleMs: 300,
      embeddingBatchSize: 50,
      cacheInvalidationThreshold: 0.85,
      maxChunksPerDocument: 1100,
    });

    console.log(`  Insérés    : ${result.totalInserted}`);
    console.log(`  Mis à jour : ${result.totalUpdated}`);
    console.log(`  Ignorés    : ${result.totalSkipped}`);
    console.log(`  Erreurs    : ${result.totalErrors}`);
    console.log(`  Cache      : ${result.cacheInvalidated ? "invalidé" : "non invalidé"}`);
    console.log(`  Durée      : ${result.durationMs}ms`);

    if (result.totalErrors > 0) {
      console.error(`  ⚠️  ${result.totalErrors} erreur(s) sur ${doc.reg}`);
      // Afficher les messages d'erreur réels pour diagnostic
      for (const docResult of result.documents) {
        const errorOutcomes = docResult.details.filter(o => o.status === "error");
        for (const o of errorOutcomes.slice(0, 20)) {
          console.error(`    [ERREUR] hash=${o.chunkHash?.substring(0, 16)}… → ${(o as { error?: string }).error ?? "?"}`);
        }
        if (errorOutcomes.length > 20) {
          console.error(`    ... et ${errorOutcomes.length - 20} autres erreurs`);
        }
      }
    }

    summary.push({
      reg: doc.reg,
      inserted: result.totalInserted,
      updated: result.totalUpdated,
      skipped: result.totalSkipped,
      errors: result.totalErrors,
      durationMs: result.durationMs,
    });
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("  RÉCAPITULATIF PROMOTION");
  console.log("=".repeat(70));
  console.log("règlement  | insérés | màj | ignorés | erreurs | durée");
  console.log("-".repeat(70));
  let totalInserted = 0, totalErrors = 0;
  for (const s of summary) {
    totalInserted += s.inserted;
    totalErrors += s.errors;
    console.log(
      `${s.reg.padEnd(10)} | ${String(s.inserted).padStart(7)} | ${String(s.updated).padStart(3)} | ${String(s.skipped).padStart(7)} | ${String(s.errors).padStart(7)} | ${s.durationMs}ms`
    );
  }
  console.log("-".repeat(70));
  console.log(`TOTAL      | ${String(totalInserted).padStart(7)} chunks insérés | ${totalErrors} erreurs`);

  if (isDryRun) {
    console.log("\n⚠️  DRY-RUN — relancez avec --prod pour la promotion réelle.");
  } else if (totalErrors === 0) {
    console.log("\n✅ Promotion terminée. Tous les règlements actifs dans legal_chunks.");
  } else {
    console.log(`\n⚠️  Promotion terminée avec ${totalErrors} erreur(s). Vérifier les logs.`);
    process.exit(1);
  }
})();
