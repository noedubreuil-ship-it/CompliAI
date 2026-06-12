/**
 * Rafraîchissement complet du corpus national UE-27 + jurisprudence + synthèses.
 *
 * Usage :
 *   npm run corpus:refresh-all
 *   npm run corpus:refresh-all -- FR DE   # sous-ensemble
 *
 * Variables :
 *   NATIONAL_BACKFILL_IGNORE_TTL=1        (défaut pour ce script)
 *   NATIONAL_BACKFILL_DELAY_MS=2000
 *   EU_CASE_LAW_LIVE_FETCH=1              fetch EUR-Lex live pour seeds CJUE
 */

import { tryDirectNationalStatuteIngest } from "@/lib/ai/national-auto-ingest";
import { countNationalRgpdNatSegments } from "@/lib/ai/national-rag";
import { ingestAllCaseLawSeeds } from "@/lib/ingest/case-law-seeds-ingest";
import { ingestSupplementaryCorpusSeeds } from "@/lib/ingest/supplementary-corpus-ingest";
import { getEu27IsoCodesSorted } from "@/lib/data/eu27-codes";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const isoArgs = process.argv
    .slice(2)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{2}$/.test(s));

  let codes = getEu27IsoCodesSorted();
  if (isoArgs.length > 0) {
    const want = new Set(isoArgs);
    codes = codes.filter((c) => want.has(c));
  }

  process.env.NATIONAL_BACKFILL_IGNORE_TTL = process.env.NATIONAL_BACKFILL_IGNORE_TTL ?? "1";
  const delayRaw = Number(process.env.NATIONAL_BACKFILL_DELAY_MS);
  const delayMs = Number.isFinite(delayRaw) && delayRaw >= 0 ? delayRaw : 2000;

  console.error(`[corpus-refresh-all] ${codes.length} pays — ignoreTtl=1 delay=${delayMs}ms`);

  const nationalResults: Array<{ code: string; status: string; segments: number; summary: string }> = [];

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    console.error(`[${i + 1}/${codes.length}] ${code}…`);
    const r = await tryDirectNationalStatuteIngest(code, { ignoreTtl: true });
    const segments = await countNationalRgpdNatSegments(code);
    nationalResults.push({ code, status: r.status, segments, summary: r.summary });
    console.error(`  → ${r.status} (${segments} seg.) ${r.summary.slice(0, 120)}`);
    if (delayMs > 0 && i < codes.length - 1) await sleep(delayMs);
  }

  console.error("[corpus-refresh-all] jurisprudence seeds…");
  const caseLaw = await ingestAllCaseLawSeeds();
  console.error(
    `  EU: ${caseLaw.eu.insertedTotal} chunks, ${caseLaw.eu.errors.length} erreurs`
  );
  if (caseLaw.eu.errors.length > 0) {
    caseLaw.eu.errors.slice(0, 8).forEach((e) => console.error(`    ${e}`));
  }
  console.error(
    `  National: ${caseLaw.national.insertedTotal} chunks, ${caseLaw.national.errors.length} erreurs`
  );

  console.error("[corpus-refresh-all] corpus complémentaire…");
  const supp = await ingestSupplementaryCorpusSeeds();
  console.error(`  ${supp.insertedTotal} chunks, ${supp.errors.length} erreurs`);

  const sparse = nationalResults.filter((r) => r.segments < 5);
  const failed = nationalResults.filter(
    (r) => r.status !== "indexed" && r.status !== "fresh_ttl" && r.segments < 5
  );

  console.error("\n[corpus-refresh-all] résumé");
  console.error(`  indexés: ${nationalResults.filter((r) => r.status === "indexed").length}`);
  console.error(`  TTL frais: ${nationalResults.filter((r) => r.status === "fresh_ttl").length}`);
  console.error(`  échecs fetch/ingest: ${failed.length}`);
  console.error(`  < 5 segments rgpd_nat: ${sparse.length}${sparse.length ? ` (${sparse.map((s) => s.code).join(", ")})` : ""}`);

  if (failed.length > 0 || caseLaw.eu.errors.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
