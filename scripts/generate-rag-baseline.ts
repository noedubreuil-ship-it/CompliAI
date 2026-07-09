/**
 * scripts/generate-rag-baseline.ts
 *
 * Exécute les 16 questions du golden set sur le RAG actuel et génère
 * RAG_QUALITY_BASELINE_REPORT.md.
 *
 * Usage : npx tsx --env-file=.env.local scripts/generate-rag-baseline.ts [--dry-run]
 */

import { runGoldenSet } from "../lib/rag-quality/runner";
import { runCoverageCheck } from "../lib/rag-quality/coverage-checker";
import { saveQuestionResults, saveCoverageResults } from "../lib/rag-quality/history";
import { generateReport, writeReport } from "../lib/rag-quality/reporter";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("=================================================");
  console.log("  CompliAI — Phase 5 : Génération baseline RAG");
  console.log("=================================================");
  console.log(`Date   : ${new Date().toLocaleString("fr-FR")}`);
  console.log(`DryRun : ${isDryRun}`);
  console.log("");

  // ── Étape 1 : Golden Set ──────────────────────────────────────────────────
  console.log("ÉTAPE 1 : Exécution des 16 questions du golden set...");
  console.log("(~16 appels OpenAI embeddings, ~32 requêtes Supabase RPC)\n");

  const gsResult = await runGoldenSet(undefined, 2);

  console.log(`\nRésultats golden set :`);
  console.log(`  ✅ OK       : ${gsResult.summary.ok} / ${gsResult.summary.total}`);
  console.log(`  ⚠️  Warning  : ${gsResult.summary.warning} / ${gsResult.summary.total}`);
  console.log(`  🔴 Critical : ${gsResult.summary.critical} / ${gsResult.summary.total}`);
  console.log("");

  for (const r of gsResult.results) {
    const icon = r.status === "ok" ? "✅" : r.status === "warning" ? "⚠️ " : "🔴";
    console.log(`  ${icon} ${r.question_id} — ${r.status.toUpperCase()}`);
    if (r.anomalies.length > 0) {
      for (const a of r.anomalies.slice(0, 3)) {
        console.log(`      → ${a}`);
      }
    }
    const artStr = r.articles_cited.slice(0, 4).join(", ");
    console.log(`      Articles : ${artStr || "(aucun)"}`);
  }

  // ── Étape 2 : Couverture (articles critiques) ─────────────────────────────
  console.log("\nÉTAPE 2 : Vérification couverture articles critiques...");
  console.log("(Articles AI Act + RGPD indexés, priorité critical)\n");

  const cvResult = await runCoverageCheck(true, 3);

  console.log(`Résultats couverture :`);
  console.log(`  Score global  : ${(cvResult.coverage_score * 100).toFixed(1)}%`);
  console.log(`  Indexés vérif : ${cvResult.indexed_checked}`);
  console.log(`  Échecs crit   : ${cvResult.critical_failures.length}`);
  console.log(`  Échecs import : ${cvResult.important_failures.length}`);

  if (cvResult.critical_failures.length > 0) {
    console.log("\n  Articles critiques non retrouvés en top-3 :");
    for (const f of cvResult.critical_failures.slice(0, 10)) {
      const rank = f.best_rank !== null ? `rang #${f.best_rank}` : "absent";
      console.log(`    🔴 ${f.entry.regulation} Art. ${f.entry.article} (${rank})`);
    }
    if (cvResult.critical_failures.length > 10) {
      console.log(`    … et ${cvResult.critical_failures.length - 10} autres`);
    }
  }

  // ── Étape 3 : Sauvegarde en DB ────────────────────────────────────────────
  if (!isDryRun) {
    console.log("\nÉTAPE 3 : Sauvegarde dans rag_quality_history...");
    await saveQuestionResults(gsResult.results, "weekly_divergence");
    await saveCoverageResults(cvResult.results, cvResult.coverage_score);
    console.log("  ✅ Sauvegardé.");
  } else {
    console.log("\nÉTAPE 3 : [DRY RUN] Aucune sauvegarde.");
  }

  // ── Étape 4 : Génération du rapport Markdown ──────────────────────────────
  console.log("\nÉTAPE 4 : Génération de RAG_QUALITY_BASELINE_REPORT.md...");

  const report = generateReport({
    goldenSetResult: gsResult,
    coverageResult: cvResult,
    isBaseline: true,
    date: new Date(),
  });

  const path = writeReport(report, true);
  console.log(`  ✅ Rapport écrit : ${path}`);

  // ── Résumé final ──────────────────────────────────────────────────────────
  console.log("\n=================================================");
  console.log("  BASELINE GÉNÉRÉE");
  console.log("=================================================");
  console.log(`Golden Set  : ${gsResult.summary.ok}/${gsResult.summary.total} questions OK`);
  console.log(`Coverage    : ${(cvResult.coverage_score * 100).toFixed(1)}% articles critiques en top-3`);
  console.log(`Rapport     : RAG_QUALITY_BASELINE_REPORT.md`);
  console.log("");

  if (gsResult.summary.critical > 0 || cvResult.critical_failures.length > 0) {
    console.log("⚠️  Des anomalies critiques ont été détectées.");
    console.log("   Ces anomalies sont NORMALES pour la baseline — elles reflètent l'état actuel");
    console.log("   du RAG et servent de référence pour détecter les régressions futures.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("\n[ERROR]", err);
  process.exit(1);
});
