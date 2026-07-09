/**
 * pipeline.ts — Orchestrateur Phase 5 : RAG Quality Verification.
 *
 * Modes d'exécution :
 *   --mode=weekly      : golden set + dérive historique (mécanismes 1+2)
 *   --mode=monthly     : tout (mécanismes 1+2+3+4) + rapport mensuel
 *   --mode=baseline    : première exécution, génère RAG_QUALITY_BASELINE_REPORT.md
 *   --mode=coverage    : mécanisme 3 uniquement
 *   --mode=dead        : mécanisme 4 uniquement
 *   --critical-only    : coverage check sur articles critiques seulement (plus rapide)
 *   --dry-run          : exécute sans sauvegarder dans rag_quality_history
 *
 * Usage CLI :
 *   npx tsx lib/rag-quality/pipeline.ts --mode=baseline
 *   npx tsx lib/rag-quality/pipeline.ts --mode=weekly
 *   npx tsx lib/rag-quality/pipeline.ts --mode=monthly --critical-only
 */

import { runGoldenSet, type GoldenSetRunResult } from "./runner";
import { runCoverageCheck, type CoverageRunResult } from "./coverage-checker";
import { runDeadChunksCheck, type DeadChunksRunResult } from "./dead-chunks";
import { detectHistoricalDrift, saveQuestionResults, saveCoverageResults, saveDeadChunks } from "./history";
import { generateReport, writeReport } from "./reporter";
import type { PipelineExecutionResult } from "./types";

// ─── Mode "weekly" (mécanismes 1 + 2) ────────────────────────────────────────

async function runWeekly(dryRun: boolean): Promise<PipelineExecutionResult> {
  const start = Date.now();
  console.log("[pipeline] Mode weekly — golden set + dérive historique");

  const gsResult = await runGoldenSet();
  console.log(
    `[pipeline] Golden set : ${gsResult.summary.ok} OK / ${gsResult.summary.warning} warn / ${gsResult.summary.critical} crit`
  );

  const driftAlerts = await detectHistoricalDrift(gsResult.results);
  console.log(`[pipeline] Dérive : ${driftAlerts.length} alerte(s)`);

  if (!dryRun) {
    await saveQuestionResults(gsResult.results, "weekly_divergence");
    if (driftAlerts.length > 0) {
      await saveQuestionResults(
        driftAlerts.map((a) => ({
          question_id: "DRIFT",
          question: a,
          executed_at: new Date().toISOString(),
          returned_chunks: [],
          articles_cited: [],
          missing_required: [],
          present_blacklisted: [],
          anomalies: [a],
          status: "warning" as const,
        })),
        "monthly_comparison"
      );
    }
    console.log("[pipeline] Résultats sauvegardés dans rag_quality_history");
  } else {
    console.log("[pipeline] DRY RUN — aucune écriture en base");
  }

  const hasCritical = gsResult.summary.critical > 0;
  const hasWarning = gsResult.summary.warning > 0 || driftAlerts.length > 0;

  return {
    mode: "weekly_divergence",
    executed_at: gsResult.executed_at,
    duration_ms: Date.now() - start,
    question_results: gsResult.results,
    overall_status: hasCritical ? "critical" : hasWarning ? "warning" : "ok",
    summary: `Golden set : ${gsResult.summary.ok}/${gsResult.summary.total} OK. Dérive : ${driftAlerts.length} alerte(s).`,
  };
}

// ─── Mode "coverage" (mécanisme 3) ───────────────────────────────────────────

async function runCoverage(
  criticalOnly: boolean,
  dryRun: boolean
): Promise<PipelineExecutionResult> {
  const start = Date.now();
  console.log(`[pipeline] Mode coverage (criticalOnly=${criticalOnly})`);

  const cvResult = await runCoverageCheck(criticalOnly);
  console.log(
    `[pipeline] Coverage : ${(cvResult.coverage_score * 100).toFixed(1)}% — ${cvResult.critical_failures.length} échecs critiques`
  );

  if (!dryRun) {
    await saveCoverageResults(cvResult.results, cvResult.coverage_score);
    console.log("[pipeline] Coverage sauvegardée");
  }

  return {
    mode: "coverage_check",
    executed_at: cvResult.executed_at,
    duration_ms: Date.now() - start,
    coverage_results: cvResult.results,
    overall_status:
      cvResult.coverage_score < 0.7
        ? "critical"
        : cvResult.coverage_score < 0.9
        ? "warning"
        : "ok",
    summary: `Couverture : ${(cvResult.coverage_score * 100).toFixed(1)}% (${cvResult.critical_failures.length} critiques, ${cvResult.important_failures.length} importants)`,
  };
}

// ─── Mode "dead" (mécanisme 4) ───────────────────────────────────────────────

async function runDead(dryRun: boolean): Promise<PipelineExecutionResult> {
  const start = Date.now();
  console.log("[pipeline] Mode dead chunks");

  const dcResult = await runDeadChunksCheck();
  console.log(`[pipeline] ${dcResult.summary}`);

  if (!dryRun) {
    await saveDeadChunks(dcResult.dead_chunks);
    console.log("[pipeline] Chunks morts sauvegardés");
  }

  return {
    mode: "dead_chunks",
    executed_at: dcResult.executed_at,
    duration_ms: Date.now() - start,
    dead_chunks: dcResult.dead_chunks,
    overall_status:
      dcResult.dead_chunks.length === 0
        ? "ok"
        : dcResult.dead_chunks.length <= 3
        ? "warning"
        : "critical",
    summary: dcResult.summary,
  };
}

// ─── Mode "monthly" (tous les mécanismes) ────────────────────────────────────

async function runMonthly(
  criticalOnly: boolean,
  dryRun: boolean
): Promise<PipelineExecutionResult> {
  const start = Date.now();
  console.log("[pipeline] Mode monthly — tous les mécanismes");

  const [gsResult, cvResult, dcResult] = await Promise.all([
    runGoldenSet(),
    runCoverageCheck(criticalOnly),
    runDeadChunksCheck(),
  ]);

  const driftAlerts = await detectHistoricalDrift(gsResult.results);

  if (!dryRun) {
    await saveQuestionResults(gsResult.results, "weekly_divergence");
    await saveCoverageResults(cvResult.results, cvResult.coverage_score);
    await saveDeadChunks(dcResult.dead_chunks);
    console.log("[pipeline] Toutes les données sauvegardées");
  }

  const report = generateReport({
    goldenSetResult: gsResult,
    coverageResult: cvResult,
    deadChunksResult: dcResult,
    driftAlerts,
    isBaseline: false,
  });

  const path = writeReport(report, false);
  console.log(`[pipeline] Rapport mensuel généré : ${path}`);

  const hasCritical =
    gsResult.summary.critical > 0 ||
    cvResult.critical_failures.length > 0 ||
    dcResult.dead_chunks.length > 5;

  const hasWarning =
    gsResult.summary.warning > 0 ||
    cvResult.important_failures.length > 0 ||
    dcResult.dead_chunks.length > 0 ||
    driftAlerts.length > 0;

  return {
    mode: "weekly_divergence",
    executed_at: new Date().toISOString(),
    duration_ms: Date.now() - start,
    question_results: gsResult.results,
    coverage_results: cvResult.results,
    dead_chunks: dcResult.dead_chunks,
    overall_status: hasCritical ? "critical" : hasWarning ? "warning" : "ok",
    summary: [
      `Golden set : ${gsResult.summary.ok}/${gsResult.summary.total} OK.`,
      `Coverage : ${(cvResult.coverage_score * 100).toFixed(1)}%.`,
      `Dead chunks : ${dcResult.dead_chunks.length}.`,
      `Rapport : ${path}`,
    ].join(" "),
  };
}

// ─── Mode "baseline" ─────────────────────────────────────────────────────────

async function runBaseline(dryRun: boolean): Promise<PipelineExecutionResult> {
  const start = Date.now();
  console.log("[pipeline] Mode baseline — génération du rapport initial");
  console.log("[pipeline] Exécution des 16 questions sur le RAG actuel...");

  const gsResult = await runGoldenSet();
  console.log(
    `[pipeline] Golden set terminé : ${gsResult.summary.ok} OK / ${gsResult.summary.warning} warn / ${gsResult.summary.critical} crit`
  );

  console.log("[pipeline] Vérification de couverture (articles critiques uniquement)...");
  const cvResult = await runCoverageCheck(true); // criticalOnly pour la baseline
  console.log(
    `[pipeline] Coverage : ${(cvResult.coverage_score * 100).toFixed(1)}%`
  );

  if (!dryRun) {
    await saveQuestionResults(gsResult.results, "weekly_divergence");
    await saveCoverageResults(cvResult.results, cvResult.coverage_score);
    console.log("[pipeline] Baseline sauvegardée dans rag_quality_history");
  }

  const report = generateReport({
    goldenSetResult: gsResult,
    coverageResult: cvResult,
    isBaseline: true,
  });

  const path = writeReport(report, true);
  console.log(`[pipeline] Baseline rapport généré : ${path}`);

  const hasCritical = gsResult.summary.critical > 0 || cvResult.critical_failures.length > 0;
  const hasWarning = gsResult.summary.warning > 0;

  return {
    mode: "weekly_divergence",
    executed_at: gsResult.executed_at,
    duration_ms: Date.now() - start,
    question_results: gsResult.results,
    coverage_results: cvResult.results,
    overall_status: hasCritical ? "critical" : hasWarning ? "warning" : "ok",
    summary: `Baseline : ${gsResult.summary.ok}/${gsResult.summary.total} OK. Coverage : ${(cvResult.coverage_score * 100).toFixed(1)}%. Rapport : ${path}`,
  };
}

// ─── Orchestrateur principal ──────────────────────────────────────────────────

export type PipelineMode = "weekly" | "monthly" | "baseline" | "coverage" | "dead";

export interface PipelineOptions {
  mode: PipelineMode;
  criticalOnly?: boolean;
  dryRun?: boolean;
}

export async function runQualityPipeline(
  options: PipelineOptions
): Promise<PipelineExecutionResult> {
  const { mode, criticalOnly = false, dryRun = false } = options;

  switch (mode) {
    case "weekly":
      return runWeekly(dryRun);
    case "monthly":
      return runMonthly(criticalOnly, dryRun);
    case "baseline":
      return runBaseline(dryRun);
    case "coverage":
      return runCoverage(criticalOnly, dryRun);
    case "dead":
      return runDead(dryRun);
    default:
      throw new Error(`Mode inconnu : ${mode}`);
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (require.main === module || process.argv[1]?.endsWith("pipeline.ts")) {
  const args = process.argv.slice(2);
  const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1] as PipelineMode;
  const criticalOnly = args.includes("--critical-only");
  const dryRun = args.includes("--dry-run");

  if (!modeArg) {
    console.error(
      "Usage : npx tsx lib/rag-quality/pipeline.ts --mode=<weekly|monthly|baseline|coverage|dead> [--critical-only] [--dry-run]"
    );
    process.exit(1);
  }

  runQualityPipeline({ mode: modeArg, criticalOnly, dryRun })
    .then((result) => {
      console.log("\n=== RÉSULTAT PIPELINE ===");
      console.log(`Mode     : ${result.mode}`);
      console.log(`Statut   : ${result.overall_status.toUpperCase()}`);
      console.log(`Durée    : ${result.duration_ms}ms`);
      console.log(`Résumé   : ${result.summary}`);
      process.exit(result.overall_status === "critical" ? 1 : 0);
    })
    .catch((err) => {
      console.error("[pipeline] Erreur fatale :", err);
      process.exit(2);
    });
}
