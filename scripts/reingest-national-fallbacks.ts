/**
 * Ré-indexe toutes les synthèses nationales de repli (urn:complai:rgpd_nat:*).
 *
 * Usage : npm run reingest:national-fallbacks
 */

import { tryDirectNationalStatuteIngest } from "@/lib/ai/national-auto-ingest";
import { NATIONAL_STATUTE_FALLBACK_SEEDS } from "@/lib/data/national-statute-fallback-seeds";

async function main(): Promise<void> {
  const codes = [...new Set(NATIONAL_STATUTE_FALLBACK_SEEDS.map((s) => s.country_code))].sort();
  console.error(`[reingest-national-fallbacks] ${codes.length} pays`);

  let ok = 0;
  let fail = 0;

  for (const code of codes) {
    const seed = NATIONAL_STATUTE_FALLBACK_SEEDS.find((s) => s.country_code === code);
    console.error(`→ ${code} (${seed?.body.length ?? 0} car.)…`);
    const r = await tryDirectNationalStatuteIngest(code, {
      ignoreTtl: true,
      synthesisOnly: true,
    });
    if (r.status === "indexed") {
      ok++;
      console.error(`  ✓ ${r.summary}`);
    } else {
      fail++;
      console.error(`  ✗ ${r.status}: ${r.summary}`);
    }
  }

  console.error(`[reingest-national-fallbacks] terminé — ok=${ok} fail=${fail}`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
