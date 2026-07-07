#!/usr/bin/env tsx
/**
 * diag-q02-q04-q05-q15.ts — Diagnostic retrieval Q02, Q04, Q05, Q15
 * Affiche les chunks retournés et les articles manquants pour chaque question.
 */
import { runGoldenSet } from "@/lib/rag-quality/runner";

void (async () => {
  console.log("=".repeat(70));
  console.log("  Diagnostic Q02 / Q04 / Q05 / Q15");
  console.log("=".repeat(70));

  const result = await runGoldenSet(["Q02", "Q04", "Q05", "Q15"], 1);

  for (const r of result.results) {
    console.log(`\n${"─".repeat(70)}`);
    console.log(`${r.question_id} — ${r.status.toUpperCase()}`);
    console.log(`Q: ${r.question.substring(0, 120)}`);

    console.log(`\n  Chunks retournés (${r.returned_chunks.length}) :`);
    for (const c of r.returned_chunks) {
      console.log(`    [${(c.similarity * 100).toFixed(1)}%] ${c.regulation.substring(0, 40)} art.${c.article_number ?? "?"} — ${c.content_excerpt.substring(0, 80)}`);
    }

    if (r.missing_required.length > 0) {
      console.log(`\n  ⛔ Articles requis MANQUANTS :`);
      for (const m of r.missing_required) {
        console.log(`    [${m.severity}] ${m.regulation} Art.${m.article_number} — ${m.description}`);
      }
    }

    if (r.present_blacklisted.length > 0) {
      console.log(`\n  🚫 Articles BLACKLISTÉS présents :`);
      for (const b of r.present_blacklisted) {
        console.log(`    ${b.regulation} Art.${b.article_number} — ${b.reason}`);
      }
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`  RÉSUMÉ : OK=${result.summary.ok} | WARN=${result.summary.warning} | CRITICAL=${result.summary.critical}`);
  console.log("=".repeat(70));
})();
