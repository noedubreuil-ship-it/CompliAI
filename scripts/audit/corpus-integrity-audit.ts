#!/usr/bin/env tsx
/**
 * corpus-integrity-audit.ts — Audit d'intégrité du corpus RAG en production
 *
 * LECTURE SEULE — aucune modification de legal_chunks pendant l'audit.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/audit/corpus-integrity-audit.ts
 *   npx tsx --env-file=.env.local scripts/audit/corpus-integrity-audit.ts --reg="AI Act"
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { EXPECTED_CORPUS, STRUCTURED_REGS, type ExpectedDoc } from "./expected-corpus";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const regFilter = process.argv.find(a => a.startsWith("--reg="))?.replace("--reg=", "");

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegulationStats {
  regulation: string;
  totalChunks: number;
  byGranularity: Record<string, number>;
  distinctArticles: number;
  articlesWithParent: number;      // granularity='article'
  articlesWithChildren: number;    // ont au moins 1 enfant
  orphanChildren: number;          // children sans parent_chunk_id résolu
  missingEmbeddings: number;       // embedding IS NULL → invisible retrieval
  missingEmbeddingArticles: string[];
}

interface AuditFinding {
  severity: "P0" | "P1" | "P2";
  regulation: string;
  message: string;
}

// ─── Requêtes DB ─────────────────────────────────────────────────────────────

async function fetchRegulationStats(regulation: string): Promise<RegulationStats> {
  // Chunks par granularité
  // Paginer pour contourner la limite 1000 lignes
  const allRows: Record<string, unknown>[] = [];
  let fromIdx = 0;
  const pageSize = 1000;
  while (true) {
    const { data: page } = await supabase
      .from("legal_chunks")
      .select("granularity, article_number, paragraph_number, parent_chunk_id, embedding")
      .eq("regulation", regulation)
      .range(fromIdx, fromIdx + pageSize - 1);
    if (!page || page.length === 0) break;
    allRows.push(...page);
    if (page.length < pageSize) break;
    fromIdx += pageSize;
  }
  const granData = allRows;

  const rows = granData ?? [];
  const totalChunks = rows.length;

  const byGranularity: Record<string, number> = {};
  let missingEmbeddings = 0;
  const missingEmbeddingArticles: string[] = [];
  const articleNumbers = new Set<string>();
  const articleIds = new Set<string>();

  for (const r of rows) {
    const g = (r.granularity as string) ?? "unknown";
    byGranularity[g] = (byGranularity[g] ?? 0) + 1;

    if (!r.embedding) {
      missingEmbeddings++;
      if (r.article_number) missingEmbeddingArticles.push(r.article_number as string);
    }
    if (r.article_number) articleNumbers.add(r.article_number as string);
  }

  const articlesWithParent = byGranularity["article"] ?? 0;
  const distinctArticles = articleNumbers.size;

  // Orphans : enfants (paragraph/point) sans parent_chunk_id
  const orphanChildren = rows.filter(
    r => r.granularity !== "article" && r.granularity !== "annexe" &&
         r.granularity !== "considerant" && !r.parent_chunk_id
  ).length;

  // Articles avec au moins 1 enfant
  const parentIds = new Set(rows.filter(r => r.parent_chunk_id).map(r => r.parent_chunk_id as string));
  // On n'a pas les IDs ici — proxy : articles avec children = articles où existe un paragraph enfant
  const articlesWithChildren = articlesWithParent > 0
    ? Math.min(articlesWithParent, rows.filter(r => r.granularity === "paragraph" && r.parent_chunk_id).length > 0 ? articlesWithParent : 0)
    : 0;

  return {
    regulation,
    totalChunks,
    byGranularity,
    distinctArticles,
    articlesWithParent,
    articlesWithChildren,
    orphanChildren,
    missingEmbeddings,
    missingEmbeddingArticles: [...new Set(missingEmbeddingArticles)].slice(0, 10),
  };
}

async function fetchAllRegulations(): Promise<string[]> {
  // Paginer pour contourner la limite Supabase de 1000 lignes
  const regs = new Set<string>();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("legal_chunks")
      .select("regulation")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const r of data) regs.add(r.regulation as string);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return [...regs].sort();
}

// ─── Analyse ──────────────────────────────────────────────────────────────────

function analyzeStructuredReg(
  stats: RegulationStats,
  expected: ExpectedDoc
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const reg = expected.regulation;

  // P0 : embeddings manquants
  if (stats.missingEmbeddings > 0) {
    findings.push({
      severity: "P0",
      regulation: reg,
      message: `${stats.missingEmbeddings} chunk(s) sans embedding (invisibles au retrieval). Articles : ${stats.missingEmbeddingArticles.join(", ")}`,
    });
  }

  // P0 : articles count très inférieur à l'attendu (< 50%)
  if (expected.articles > 0 && stats.articlesWithParent < expected.articles * 0.5) {
    findings.push({
      severity: "P0",
      regulation: reg,
      message: `Articles présents : ${stats.articlesWithParent}/${expected.articles} (< 50% attendu)`,
    });
  }

  // P1 : articles manquants (50-90% présents)
  if (expected.articles > 0 &&
      stats.articlesWithParent >= expected.articles * 0.5 &&
      stats.articlesWithParent < expected.articles * 0.9) {
    findings.push({
      severity: "P1",
      regulation: reg,
      message: `Articles présents : ${stats.articlesWithParent}/${expected.articles} (${Math.round(stats.articlesWithParent / expected.articles * 100)}%)`,
    });
  }

  // P1 : considérants absents alors qu'attendus
  const considerantCount = stats.byGranularity["considerant"] ?? 0;
  if (expected.considerants > 0 && considerantCount === 0) {
    findings.push({
      severity: "P1",
      regulation: reg,
      message: `Considérants absents (attendus : ${expected.considerants})`,
    });
  }

  // P2 : considérants partiels
  if (expected.considerants > 0 && considerantCount > 0 &&
      considerantCount < expected.considerants * 0.9) {
    findings.push({
      severity: "P2",
      regulation: reg,
      message: `Considérants : ${considerantCount}/${expected.considerants} (${Math.round(considerantCount / expected.considerants * 100)}%)`,
    });
  }

  // P2 : orphans
  if (stats.orphanChildren > 5) {
    findings.push({
      severity: "P2",
      regulation: reg,
      message: `${stats.orphanChildren} chunks enfants sans parent_chunk_id`,
    });
  }

  return findings;
}

// ─── Rapport Markdown ─────────────────────────────────────────────────────────

function buildReport(
  allRegs: string[],
  statsMap: Map<string, RegulationStats>,
  findings: AuditFinding[],
  absentFromExpected: ExpectedDoc[],
  unknownInProd: string[],
  date: string
): string {
  const p0 = findings.filter(f => f.severity === "P0");
  const p1 = findings.filter(f => f.severity === "P1");
  const p2 = findings.filter(f => f.severity === "P2");

  const totalChunks = [...statsMap.values()].reduce((s, r) => s + r.totalChunks, 0);

  let md = `# RAG Corpus — Audit d'intégrité\n`;
  md += `Date : ${date}\n\n`;
  md += `---\n\n`;

  md += `## Synthèse\n\n`;
  md += `| Métrique | Valeur |\n|---|---|\n`;
  md += `| Règlements en production | ${allRegs.length} |\n`;
  md += `| Total chunks | ${totalChunks.toLocaleString("fr-FR")} |\n`;
  md += `| Findings P0 (critique) | **${p0.length}** |\n`;
  md += `| Findings P1 (important) | **${p1.length}** |\n`;
  md += `| Findings P2 (mineur) | ${p2.length} |\n`;
  md += `| Règlements absents du corpus | ${absentFromExpected.length} |\n`;
  md += `| Règlements inconnus (hors spec) | ${unknownInProd.length} |\n\n`;

  if (p0.length > 0) {
    md += `## Findings P0 — Critique\n\n`;
    for (const f of p0) md += `- **${f.regulation}** : ${f.message}\n`;
    md += "\n";
  }

  if (p1.length > 0) {
    md += `## Findings P1 — Important\n\n`;
    for (const f of p1) md += `- **${f.regulation}** : ${f.message}\n`;
    md += "\n";
  }

  if (p2.length > 0) {
    md += `## Findings P2 — Mineur\n\n`;
    for (const f of p2) md += `- **${f.regulation}** : ${f.message}\n`;
    md += "\n";
  }

  md += `## Inventaire production\n\n`;
  md += `| Règlement | Chunks | Art. | Cons. | Para. | Points | Annexes | Embed. manquants |\n`;
  md += `|---|---:|---:|---:|---:|---:|---:|---:|\n`;

  for (const [reg, s] of [...statsMap.entries()].sort()) {
    const art = s.byGranularity["article"] ?? 0;
    const con = s.byGranularity["considerant"] ?? 0;
    const par = s.byGranularity["paragraph"] ?? 0;
    const pt  = s.byGranularity["point"] ?? 0;
    const anx = s.byGranularity["annexe"] ?? 0;
    const shortReg = reg.length > 60 ? reg.substring(0, 57) + "…" : reg;
    md += `| ${shortReg} | ${s.totalChunks} | ${art} | ${con} | ${par} | ${pt} | ${anx} | ${s.missingEmbeddings > 0 ? `**${s.missingEmbeddings}**` : "0"} |\n`;
  }
  md += "\n";

  if (absentFromExpected.length > 0) {
    md += `## Règlements absents du corpus\n\n`;
    md += `| Règlement | Articles | Considérants |\n|---|---:|---:|\n`;
    for (const d of absentFromExpected) {
      md += `| ${d.regulation} | ${d.articles} | ${d.considerants} |\n`;
    }
    md += "\n";
  }

  if (unknownInProd.length > 0) {
    md += `## Règlements en production hors spec\n\n`;
    for (const r of unknownInProd) md += `- ${r}\n`;
    md += "\n";
  }

  return md;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

void (async () => {
  console.log("=".repeat(70));
  console.log("  Audit d'intégrité corpus RAG — LECTURE SEULE");
  console.log("=".repeat(70));
  console.log();

  // 1. Récupérer toutes les régulations en production
  console.log("Phase 1 — Inventaire production...");
  const allRegs = await fetchAllRegulations();
  console.log(`  ${allRegs.length} régulations trouvées en production.`);

  const toAudit = regFilter ? allRegs.filter(r => r.toLowerCase().includes(regFilter.toLowerCase())) : allRegs;

  // 2. Stats par régulation
  console.log(`\nPhase 2 — Analyse de ${toAudit.length} régulation(s)...`);
  const statsMap = new Map<string, RegulationStats>();

  for (let i = 0; i < toAudit.length; i++) {
    const reg = toAudit[i];
    process.stdout.write(`\r  [${i + 1}/${toAudit.length}] ${reg.substring(0, 60).padEnd(60)}`);
    const stats = await fetchRegulationStats(reg);
    statsMap.set(reg, stats);
  }
  console.log("\n  ✅ Stats collectées.");

  // 3. Analyser les réglementations structurées
  console.log("\nPhase 3 — Comparaison avec structure officielle...");
  const findings: AuditFinding[] = [];
  const expectedRegs = new Set(EXPECTED_CORPUS.map(d => d.regulation));
  const prodRegs = new Set(allRegs);

  for (const expected of STRUCTURED_REGS) {
    if (!prodRegs.has(expected.regulation)) continue;
    const stats = statsMap.get(expected.regulation);
    if (!stats) continue;
    const f = analyzeStructuredReg(stats, expected);
    findings.push(...f);
  }

  // Règlements absents du corpus (status=absent dans le spec)
  const absentFromExpected = EXPECTED_CORPUS.filter(d => d.status === "absent");

  // Règlements en production mais hors spec
  const unknownInProd = allRegs.filter(r => !expectedRegs.has(r));

  // 4. Rapport
  console.log("\nPhase 4 — Génération rapport...");
  const date = new Date().toISOString().split("T")[0];
  const report = buildReport(allRegs, statsMap, findings, absentFromExpected, unknownInProd, date);

  const reportPath = path.join(process.cwd(), `RAG_CORPUS_INTEGRITY_AUDIT_${date.replace(/-/g, "")}.md`);
  fs.writeFileSync(reportPath, report, "utf-8");
  console.log(`  Rapport : ${reportPath}`);

  // Afficher la synthèse
  const p0 = findings.filter(f => f.severity === "P0");
  const p1 = findings.filter(f => f.severity === "P1");
  const p2 = findings.filter(f => f.severity === "P2");

  console.log("\n" + "=".repeat(70));
  console.log(`  P0 : ${p0.length} | P1 : ${p1.length} | P2 : ${p2.length}`);
  if (p0.length > 0) {
    console.log("\n  ⛔ P0 — Critique :");
    for (const f of p0) console.log(`    [${f.regulation.substring(0, 50)}] ${f.message}`);
  }
  if (p1.length > 0) {
    console.log("\n  ⚠️  P1 — Important :");
    for (const f of p1) console.log(`    [${f.regulation.substring(0, 50)}] ${f.message}`);
  }
  console.log("=".repeat(70));
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
