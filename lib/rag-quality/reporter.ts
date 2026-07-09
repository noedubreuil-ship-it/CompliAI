/**
 * reporter.ts — Génère les rapports Markdown mensuels de qualité RAG.
 *
 * Produit :
 *  - RAG_QUALITY_MONTHLY_REPORT_YYYY-MM.md
 *  - RAG_QUALITY_BASELINE_REPORT.md (première exécution)
 */

import { writeFileSync } from "fs";
import { join } from "path";
import type { GoldenSetRunResult } from "./runner";
import type { CoverageRunResult } from "./coverage-checker";
import type { DeadChunksRunResult } from "./dead-chunks";
import { COVERAGE_STATS } from "./coverage-articles";

// ─── Helpers Markdown ─────────────────────────────────────────────────────────

function badge(status: string): string {
  return {
    ok: "✅ OK",
    warning: "⚠️ WARNING",
    critical: "🔴 CRITICAL",
  }[status] ?? status;
}

function statusIcon(status: string): string {
  return { ok: "✅", warning: "⚠️", critical: "🔴" }[status] ?? "❓";
}

function dateHeader(date: Date = new Date()): string {
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

// ─── Rapport principal ────────────────────────────────────────────────────────

export interface ReportInput {
  goldenSetResult?: GoldenSetRunResult;
  coverageResult?: CoverageRunResult;
  deadChunksResult?: DeadChunksRunResult;
  driftAlerts?: string[];
  isBaseline?: boolean;
  date?: Date;
}

export function generateReport(input: ReportInput): string {
  const date = input.date ?? new Date();
  const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const isBaseline = input.isBaseline ?? false;

  const lines: string[] = [];

  // ── En-tête ──
  lines.push(
    `# ${isBaseline ? "RAG Quality Baseline Report" : `RAG Quality Monthly Report — ${yearMonth}`}`
  );
  lines.push(`\n> Généré le ${dateHeader(date)}`);
  if (isBaseline) {
    lines.push("> **Rapport initial** : capture l'état actuel du RAG production comme référence.");
    lines.push("> Les exécutions futures seront comparées à ce baseline.");
  }
  lines.push("");

  // ── Tableau récapitulatif ──
  lines.push("## Résumé exécutif");
  lines.push("");
  lines.push("| Mécanisme | Statut | Détails |");
  lines.push("|-----------|--------|---------|");

  if (input.goldenSetResult) {
    const gs = input.goldenSetResult;
    const gsStatus =
      gs.summary.critical > 0 ? "critical" : gs.summary.warning > 0 ? "warning" : "ok";
    lines.push(
      `| Golden Set (${gs.summary.total} questions) | ${badge(gsStatus)} | ✅ ${gs.summary.ok} / ⚠️ ${gs.summary.warning} / 🔴 ${gs.summary.critical} |`
    );
  }

  if (input.coverageResult) {
    const cv = input.coverageResult;
    const cvStatus =
      cv.coverage_score < 0.7 ? "critical" : cv.coverage_score < 0.9 ? "warning" : "ok";
    lines.push(
      `| Couverture articles | ${badge(cvStatus)} | ${fmtScore(cv.coverage_score)} (${cv.critical_failures.length} échecs critiques) |`
    );
  }

  if (input.deadChunksResult) {
    const dc = input.deadChunksResult;
    const dcStatus =
      dc.dead_chunks.length === 0 ? "ok" : dc.dead_chunks.length <= 3 ? "warning" : "critical";
    lines.push(
      `| Chunks morts | ${badge(dcStatus)} | ${dc.dead_chunks.length} mort(s) / ${dc.chunks_checked} vérifiés |`
    );
  }

  if (input.driftAlerts && input.driftAlerts.length > 0) {
    lines.push(
      `| Dérive historique | ${badge("warning")} | ${input.driftAlerts.length} alerte(s) |`
    );
  } else if (input.driftAlerts) {
    lines.push(`| Dérive historique | ${badge("ok")} | Aucune dérive détectée |`);
  }

  lines.push("");

  // ── Section Golden Set ──
  if (input.goldenSetResult) {
    const gs = input.goldenSetResult;
    lines.push("---");
    lines.push("## Mécanisme 1 — Golden Set (16 questions de référence)");
    lines.push("");
    lines.push(`**Exécuté le** : ${new Date(gs.executed_at).toLocaleString("fr-FR")}`);
    lines.push(`**Résultats** : ${gs.summary.ok} OK / ${gs.summary.warning} warning / ${gs.summary.critical} critique`);
    lines.push("");
    lines.push("### Détail par question");
    lines.push("");

    for (const r of gs.results) {
      lines.push(
        `#### ${statusIcon(r.status)} ${r.question_id} — ${r.question.slice(0, 80)}${r.question.length > 80 ? "…" : ""}`
      );

      if (r.status === "ok") {
        lines.push("Résultat : conforme. Articles attendus présents, aucun article blacklisté.");
        lines.push("");
        lines.push(`Articles cités : \`${r.articles_cited.slice(0, 6).join("`, `")}\``);
      } else {
        lines.push("");
        if (r.missing_required.length > 0) {
          lines.push("**Articles manquants :**");
          for (const m of r.missing_required) {
            lines.push(`- 🔴 \`${m.regulation} Art. ${m.article_number ?? "*"}\` [${m.severity}] — ${m.description}`);
          }
        }
        if (r.present_blacklisted.length > 0) {
          lines.push("**Articles blacklistés présents :**");
          for (const b of r.present_blacklisted) {
            lines.push(`- ⛔ \`${b.regulation} Art. ${b.article_number ?? "*"}\` — ${b.reason}`);
          }
        }
        lines.push("");
        lines.push(`Articles retournés : \`${r.articles_cited.slice(0, 6).join("`, `")}\``);
      }
      lines.push("");

      // Top-5 chunks
      lines.push("<details><summary>Top-5 chunks retournés</summary>");
      lines.push("");
      for (const [i, c] of r.returned_chunks.slice(0, 5).entries()) {
        lines.push(
          `**#${i + 1}** \`${c.regulation} · Art. ${c.article_number ?? "N/A"}\` (sim: ${(c.similarity * 100).toFixed(1)}%)`
        );
        lines.push(`> ${c.content_excerpt}`);
        lines.push("");
      }
      lines.push("</details>");
      lines.push("");
    }
  }

  // ── Section Couverture ──
  if (input.coverageResult) {
    const cv = input.coverageResult;
    lines.push("---");
    lines.push("## Mécanisme 3 — Couverture des articles principaux");
    lines.push("");
    lines.push(`**Score** : ${fmtScore(cv.coverage_score)} (${cv.indexed_checked} articles indexés vérifiés)`);
    lines.push(`**Articles non encore indexés** : ${cv.not_indexed} (monitoring désactivé)`);
    lines.push("");

    if (cv.critical_failures.length === 0) {
      lines.push("✅ Aucun article critique non retrouvé en top-3.");
    } else {
      lines.push(`### 🔴 Échecs critiques (${cv.critical_failures.length})`);
      lines.push("");
      lines.push("| Article | Règlement | Rang trouvé |");
      lines.push("|---------|-----------|-------------|");
      for (const f of cv.critical_failures) {
        lines.push(
          `| ${f.entry.article} | ${f.entry.regulation} | ${f.best_rank !== null ? `#${f.best_rank}` : "absent"} |`
        );
      }
      lines.push("");
    }

    if (cv.important_failures.length > 0) {
      lines.push(`### ⚠️ Échecs importants (${cv.important_failures.length})`);
      lines.push("");
      lines.push("<details><summary>Voir la liste</summary>");
      lines.push("");
      for (const f of cv.important_failures) {
        lines.push(
          `- \`${f.entry.regulation} Art. ${f.entry.article}\` — rang : ${f.best_rank !== null ? `#${f.best_rank}` : "absent"}`
        );
      }
      lines.push("</details>");
      lines.push("");
    }
  }

  // ── Section Chunks morts ──
  if (input.deadChunksResult) {
    const dc = input.deadChunksResult;
    lines.push("---");
    lines.push("## Mécanisme 4 — Chunks morts (60 derniers jours)");
    lines.push("");
    lines.push(dc.summary);
    lines.push("");

    if (dc.dead_chunks.length > 0) {
      lines.push("### Chunks à investiguer");
      lines.push("");
      lines.push("| Chunk ID | Règlement | Article | Inséré le | Rang auto-requête |");
      lines.push("|----------|-----------|---------|-----------|-------------------|");
      for (const c of dc.dead_chunks) {
        const insertDate = new Date(c.inserted_at).toLocaleDateString("fr-FR");
        lines.push(
          `| \`${c.chunk_id.slice(0, 8)}…\` | ${c.regulation} | ${c.article_number ?? "N/A"} | ${insertDate} | absent |`
        );
      }
      lines.push("");
      lines.push("> **Action** : vérifier si ces chunks sont des doublons, des fragments mal embedés, ou des articles rarement interrogés.");
    }
  }

  // ── Section Dérive historique ──
  if (input.driftAlerts && input.driftAlerts.length > 0) {
    lines.push("---");
    lines.push("## Mécanisme 2 — Dérive historique");
    lines.push("");
    lines.push(`${input.driftAlerts.length} alerte(s) de dérive détectée(s) par rapport à l'exécution précédente :`);
    lines.push("");
    for (const alert of input.driftAlerts) {
      lines.push(`- ⚠️ ${alert}`);
    }
    lines.push("");
  }

  // ── Recommandations ──
  lines.push("---");
  lines.push("## Recommandations");
  lines.push("");
  const recs: string[] = [];

  if (input.goldenSetResult) {
    const gs = input.goldenSetResult;
    if (gs.summary.critical > 0) {
      recs.push(
        `🔴 **${gs.summary.critical} question(s) du golden set en échec critique** : vérifier si les chunks correspondants sont toujours présents et correctement embedés dans \`legal_chunks\`.`
      );
    }
  }
  if (input.coverageResult && input.coverageResult.critical_failures.length > 0) {
    recs.push(
      `🔴 **${input.coverageResult.critical_failures.length} article(s) critique(s) non retrouvés** : déclencher une ré-ingestion ou vérifier les embeddings.`
    );
  }
  if (input.deadChunksResult && input.deadChunksResult.dead_chunks.length > 0) {
    recs.push(
      `⚠️ **${input.deadChunksResult.dead_chunks.length} chunk(s) mort(s)** : auditer via l'interface de validation RAG (\`/dashboard/admin/rag-validation\`).`
    );
  }

  if (recs.length === 0) {
    lines.push("✅ Aucune action immédiate requise. Le RAG production est dans un état satisfaisant.");
  } else {
    for (const r of recs) {
      lines.push(r);
      lines.push("");
    }
  }

  // ── Footer ──
  lines.push("---");
  lines.push("## Périmètre de surveillance");
  lines.push("");
  lines.push(`| Règlement | Articles surveillés | Indexé |`);
  lines.push(`|-----------|---------------------|--------|`);
  lines.push(`| AI Act | 113 | ✅ |`);
  lines.push(`| RGPD | 99 | ✅ |`);
  lines.push(`| DSA | 25 principaux | ❌ (à indexer) |`);
  lines.push(`| DMA | 18 principaux | ❌ (à indexer) |`);
  lines.push(`| Data Act | 14 principaux | ❌ (à indexer) |`);
  lines.push(`| Data Governance Act | 11 principaux | ❌ (à indexer) |`);
  lines.push(`| NIS2 | 14 principaux | ❌ (à indexer) |`);
  lines.push(`| Directive DSM | 12 principaux | ❌ (à indexer) |`);
  lines.push(`| ePrivacy | 12 principaux | ❌ (à indexer) |`);
  lines.push(`| CRA | 16 principaux | ❌ (à indexer) |`);
  lines.push(`| Règlement Machines | 12 principaux | ❌ (à indexer) |`);
  lines.push(`| eIDAS 2 | 18 principaux | ❌ (à indexer) |`);
  lines.push(`| CJUE (arrêts) | 25 | ✅ |`);
  lines.push(`| EDPB (lignes directrices) | 15 principales | ✅ |`);
  lines.push("");
  lines.push(`_Périmètre total : ${COVERAGE_STATS.total} entrées dont ${COVERAGE_STATS.indexed} indexées_`);
  lines.push("");
  lines.push("---");
  lines.push("*Rapport généré automatiquement par `lib/rag-quality/reporter.ts`*");

  return lines.join("\n");
}

// ─── Écriture sur disque ──────────────────────────────────────────────────────

export function writeReport(content: string, isBaseline = false, date?: Date): string {
  const d = date ?? new Date();
  const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const filename = isBaseline
    ? "RAG_QUALITY_BASELINE_REPORT.md"
    : `RAG_QUALITY_MONTHLY_REPORT_${yearMonth}.md`;

  const outputPath = join(process.cwd(), filename);
  writeFileSync(outputPath, content, "utf-8");
  console.log(`[reporter] Rapport écrit : ${outputPath}`);
  return outputPath;
}
