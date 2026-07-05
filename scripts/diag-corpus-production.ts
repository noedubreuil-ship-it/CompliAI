#!/usr/bin/env tsx
/**
 * diag-corpus-production.ts — Diagnostic état corpus RAG production
 * Exécute les 5 requêtes SQL demandées et génère RAG_CORPUS_DIAGNOSTIC_2026-07-04.md
 * Lecture seule. Aucune modification.
 */

import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes");
  return createClient(url, key);
}

async function runRawSql(sb: ReturnType<typeof getSb>, sql: string): Promise<unknown[]> {
  const { data, error } = await (sb as any).rpc("execute_raw_sql", { query: sql });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Fallback : utiliser l'API Supabase REST directe via fetch
async function runSqlViaRestApi(url: string, key: string, sql: string): Promise<unknown[]> {
  const res = await fetch(`${url}/rest/v1/rpc/execute_raw_sql`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// Fallback 2 : utiliser les méthodes Supabase natives pour les requêtes simples
// Fetch ALL rows avec pagination automatique (Supabase = 1000 lignes max par défaut)
async function fetchAll<T extends Record<string, unknown>>(
  sb: ReturnType<typeof getSb>,
  table: string,
  columns: string,
  filter?: (q: ReturnType<typeof sb.from>) => ReturnType<typeof sb.from>
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let from = 0;
  while (true) {
    let q = sb.from(table).select(columns).range(from, from + PAGE - 1);
    if (filter) q = filter(q) as typeof q;
    const { data, error } = await q;
    if (error) throw error;
    all.push(...((data ?? []) as T[]));
    if ((data ?? []).length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function q1_granularities(sb: ReturnType<typeof getSb>) {
  const data = await fetchAll<{ regulation: string; granularity: string }>(
    sb, "legal_chunks", "regulation, granularity"
  );

  const agg: Record<string, Record<string, number>> = {};
  for (const row of data) {
    const reg = row.regulation ?? "(null)";
    const gran = row.granularity ?? "(null)";
    if (!agg[reg]) agg[reg] = {};
    agg[reg][gran] = (agg[reg][gran] ?? 0) + 1;
  }
  return Object.entries(agg)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([regulation, grans]) =>
      Object.entries(grans)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([granularity, chunks]) => ({ regulation, granularity, chunks }))
    );
}

async function q2_annexes_considerants(sb: ReturnType<typeof getSb>) {
  const data = await fetchAll<{ regulation: string; article_number: string }>(
    sb, "legal_chunks", "regulation, article_number"
  );

  const agg: Record<string, { annexes: number; considerants: number; total: number }> = {};
  for (const row of data) {
    const reg = row.regulation ?? "(null)";
    const art = (row.article_number ?? "").toLowerCase();
    if (!agg[reg]) agg[reg] = { annexes: 0, considerants: 0, total: 0 };
    agg[reg].total++;
    if (art.includes("annex") || art.includes("annexe")) agg[reg].annexes++;
    if (art.includes("considérant") || art.includes("considerant") || art.includes("cons.")) agg[reg].considerants++;
  }
  return Object.entries(agg)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([regulation, v]) => ({ regulation, ...v }));
}

async function q3_small_regulations(sb: ReturnType<typeof getSb>) {
  const data = await fetchAll<{ regulation: string }>(sb, "legal_chunks", "regulation");

  const counts: Record<string, number> = {};
  for (const row of data) {
    const reg = row.regulation ?? "(null)";
    counts[reg] = (counts[reg] ?? 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, n]) => n < 50)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([regulation, count]) => ({ regulation, count }));
}

async function q4_rgpd_article_numbers(sb: ReturnType<typeof getSb>) {
  const rgpdNames = ["RGPD (UE 2016/679)", "RGPD", "Règlement général sur la protection des données"];
  let data: { article_number: string | null }[] = [];
  let foundName = "";

  for (const name of rgpdNames) {
    const rows = await fetchAll<{ article_number: string }>(
      sb, "legal_chunks", "article_number",
      (q) => q.eq("regulation", name)
    );
    if (rows.length > 0) { data = rows; foundName = name; break; }
  }

  if (data.length === 0) {
    const rows = await fetchAll<{ article_number: string; regulation: string }>(
      sb, "legal_chunks", "article_number, regulation",
      (q) => q.ilike("regulation", "%RGPD%")
    );
    data = rows;
    foundName = "ILIKE %RGPD%";
  }

  const counts: Record<string, number> = {};
  for (const row of data) {
    const art = row.article_number ?? "(null)";
    counts[art] = (counts[art] ?? 0) + 1;
  }
  return {
    foundName,
    total: data.length,
    distinctArticleNumbers: Object.keys(counts).length,
    rows: Object.entries(counts)
      .sort(([a], [b]) => {
        const na = parseInt(a.replace(/\D/g, "") || "9999");
        const nb = parseInt(b.replace(/\D/g, "") || "9999");
        return na - nb || a.localeCompare(b);
      })
      .map(([article_number, count]) => ({ article_number, count })),
  };
}

async function q5_eidas(sb: ReturnType<typeof getSb>) {
  const data = await fetchAll<{ regulation: string; article_number: string; granularity: string }>(
    sb, "legal_chunks", "regulation, article_number, granularity",
    (q) => q.ilike("regulation", "%eIDAS%")
  );

  const counts: Record<string, number> = {};
  let foundRegulation = "";
  for (const row of data) {
    const art = row.article_number ?? "(null)";
    counts[art] = (counts[art] ?? 0) + 1;
    if (!foundRegulation) foundRegulation = row.regulation ?? "";
  }
  return {
    foundRegulation,
    total: data.length,
    distinctArticleNumbers: Object.keys(counts).length,
    rows: Object.entries(counts)
      .sort(([a], [b]) => {
        const na = parseInt(a.replace(/\D/g, "") || "9999");
        const nb = parseInt(b.replace(/\D/g, "") || "9999");
        return na - nb || a.localeCompare(b);
      })
      .map(([article_number, count]) => ({ article_number, count })),
  };
}

// Q supplémentaire : état global par regulation (pour Ajustement 2)
async function q_global_state(sb: ReturnType<typeof getSb>) {
  const data = await fetchAll<{ regulation: string; granularity: string; embedding: unknown }>(
    sb, "legal_chunks", "regulation, granularity, embedding"
  );

  const agg: Record<string, { total: number; withEmbedding: number; granularities: Set<string> }> = {};
  for (const row of data) {
    const reg = row.regulation ?? "(null)";
    if (!agg[reg]) agg[reg] = { total: 0, withEmbedding: 0, granularities: new Set() };
    agg[reg].total++;
    if (row.embedding != null) agg[reg].withEmbedding++;
    if (row.granularity) agg[reg].granularities.add(row.granularity);
  }
  return Object.entries(agg)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([regulation, v]) => ({
      regulation,
      total: v.total,
      with_embedding: v.withEmbedding,
      missing_embedding: v.total - v.withEmbedding,
      granularities: Array.from(v.granularities).sort().join(", "),
    }));
}

function formatTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "(aucun résultat)";
  const keys = Object.keys(rows[0]);
  const widths = keys.map((k) =>
    Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length))
  );
  const header = "| " + keys.map((k, i) => k.padEnd(widths[i])).join(" | ") + " |";
  const sep = "|" + widths.map((w) => "-".repeat(w + 2)).join("|") + "|";
  const body = rows.map(
    (r) => "| " + keys.map((k, i) => String(r[k] ?? "").padEnd(widths[i])).join(" | ") + " |"
  );
  return [header, sep, ...body].join("\n");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Variables Supabase manquantes (.env.local)");

  const sb = createClient(url, key);
  const now = new Date().toISOString();
  const date = now.slice(0, 10);

  console.log("=".repeat(70));
  console.log("  diag-corpus-production — Diagnostic état RAG production");
  console.log("=".repeat(70));
  console.log(`Projet : ${url}`);
  console.log(`Date   : ${now}`);
  console.log();

  console.log("Q0 — État global par regulation (AI Act + RGPD focus)...");
  const globalState = await q_global_state(sb);
  console.log(`   ${globalState.length} regulations trouvées`);

  console.log("Q1 — Granularités par regulation...");
  const q1 = await q1_granularities(sb);
  console.log(`   ${q1.length} lignes`);

  console.log("Q2 — Annexes et considérants...");
  const q2 = await q2_annexes_considerants(sb);
  console.log(`   ${q2.length} regulations`);

  console.log("Q3 — Petites regulations (< 10 chunks)...");
  const q3 = await q3_small_regulations(sb);
  console.log(`   ${q3.length} regulations avec < 10 chunks`);

  console.log("Q4 — RGPD article_number diagnostic...");
  const q4 = await q4_rgpd_article_numbers(sb);
  console.log(`   Regulation trouvée : "${q4.foundName}" — ${q4.total} chunks, ${q4.distinctArticleNumbers} article_number distincts`);

  console.log("Q5 — eIDAS 2 diagnostic...");
  const q5 = await q5_eidas(sb);
  console.log(`   Regulation trouvée : "${q5.foundRegulation}" — ${q5.total} chunks, ${q5.distinctArticleNumbers} article_number distincts`);

  console.log();

  // Focus AI Act + RGPD pour Ajustement 2
  const aiAct = globalState.find((r) => r.regulation.includes("AI Act") || r.regulation === "AI Act (UE 2024/1689)");
  const rgpd = globalState.find((r) => r.regulation.includes("RGPD") || r.regulation.includes("2016/679"));

  const report = [
    `# Rapport diagnostic corpus RAG production`,
    ``,
    `**Date** : ${now}`,
    `**Source** : production Supabase \`${url.replace("https://", "").split(".")[0]}\``,
    `**Lecture seule** — aucune modification`,
    ``,
    `---`,
    ``,
    `## Ajustement 2 — Vérification état production (focus AI Act + RGPD)`,
    ``,
    aiAct
      ? `| Regulation | Total chunks | Avec embedding | Sans embedding | Granularités |
|---|---:|---:|---:|---|
| AI Act | ${aiAct.total} | ${aiAct.with_embedding} | ${aiAct.missing_embedding} | ${aiAct.granularities} |
${rgpd ? `| RGPD | ${rgpd.total} | ${rgpd.with_embedding} | ${rgpd.missing_embedding} | ${rgpd.granularities} |` : "| RGPD | **NON TROUVÉ** | — | — | — |"}`
      : "AI Act non trouvé dans legal_chunks.",
    ``,
    `---`,
    ``,
    `## Q0 — État global par regulation`,
    ``,
    formatTable(globalState),
    ``,
    `---`,
    ``,
    `## Q1 — Granularités présentes par regulation`,
    ``,
    formatTable(q1),
    ``,
    `---`,
    ``,
    `## Q2 — Annexes et considérants détectés`,
    ``,
    `> Détection basée sur article_number contenant "annex/annexe" ou "considérant/considerant".`,
    `> Si ces valeurs sont 0, les annexes/considérants ne sont pas dans des chunks dédiés.`,
    ``,
    formatTable(q2.map((r) => ({
      regulation: r.regulation,
      total_chunks: r.total,
      annexes: r.annexes,
      considerants: r.considerants,
    }))),
    ``,
    `---`,
    ``,
    `## Q3 — Regulations avec < 10 chunks (doublons / couverture faible)`,
    ``,
    q3.length === 0
      ? `Aucune regulation avec moins de 10 chunks.`
      : formatTable(q3),
    ``,
    `---`,
    ``,
    `## Q4 — Diagnostic RGPD — article_number distincts`,
    ``,
    `**Regulation trouvée** : \`${q4.foundName}\`  `,
    `**Total chunks** : ${q4.total}  `,
    `**article_number distincts** : ${q4.distinctArticleNumbers} (attendu : 99 articles + éventuels considérants/annexes)`,
    ``,
    formatTable(q4.rows),
    ``,
    `---`,
    ``,
    `## Q5 — Diagnostic eIDAS 2 — couverture articles`,
    ``,
    `**Regulation trouvée** : \`${q5.foundRegulation}\`  `,
    `**Total chunks** : ${q5.total}  `,
    `**article_number distincts** : ${q5.distinctArticleNumbers} (attendu : 107 articles + 5 annexes + considérants)`,
    ``,
    q5.rows.length === 0
      ? `**AUCUN CHUNK eIDAS 2 TROUVÉ** — ingestion eIDAS 2 à confirmer.`
      : formatTable(q5.rows),
    ``,
    `---`,
    ``,
    `## Anomalies détectées`,
    ``,
    `_À remplir après analyse des résultats._`,
    ``,
    `---`,
    ``,
    `## Prochaines étapes`,
    ``,
    `En attente de validation utilisateur avant lancement chantier 1 (eIDAS 2).`,
  ].join("\n");

  const reportPath = `RAG_CORPUS_DIAGNOSTIC_${date}.md`;
  fs.writeFileSync(reportPath, report);

  console.log("=".repeat(70));
  console.log(`  Diagnostic terminé — rapport : ${reportPath}`);
  console.log("=".repeat(70));
}

main().catch((e) => {
  console.error("ERREUR FATALE:", e);
  process.exit(1);
});
