/**
 * Backfill hors requête chat : enchaîne l’agent « corpus national » sur l’ensemble UE-27.
 *
 * Usage :
 *   npm run backfill:national-corpus-eu27
 *   npm run backfill:national-corpus-eu27 -- FR DE IT   # sous-ensemble (codes ISO2)
 *
 * Prérequis (.env.local) : ANTHROPIC_API_KEY, OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY (+ URL Supabase côté app).
 *
 * Variables optionnelles :
 *   NATIONAL_BACKFILL_DELAY_MS=4000       pause entre deux pays (0 pour enchaîner)
 *   NATIONAL_BACKFILL_IGNORE_TTL=1        comme force=1 sur le cron (ignore la fraîcheur TTL par source)
 *   NATIONAL_AGENT_DEADLINE_MS, NATIONAL_AGENT_MAX_STEPS — voir lib/agents/national-corpus-agent.ts
 */

import { runNationalCorpusAgentForCountry } from "@/lib/agents/national-corpus-agent";
import { tryDirectNationalStatuteIngest } from "@/lib/ai/national-auto-ingest";
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
    const missing = isoArgs.filter((c) => !codes.includes(c));
    if (missing.length > 0) {
      console.error(`[backfill-national-corpus-eu27] Codes hors UE-27 ou inconnus ignorés : ${missing.join(", ")}`);
    }
  }

  if (codes.length === 0) {
    console.error("[backfill-national-corpus-eu27] Aucun pays à traiter.");
    process.exitCode = 1;
    return;
  }

  const delayRaw = Number(process.env.NATIONAL_BACKFILL_DELAY_MS);
  const delayMs =
    Number.isFinite(delayRaw) && delayRaw >= 0 ? delayRaw : 4000;

  const ignoreTtl =
    process.env.NATIONAL_BACKFILL_IGNORE_TTL === "1" ||
    process.env.NATIONAL_BACKFILL_IGNORE_TTL === "true";

  const deadlineMsRaw = Number(process.env.NATIONAL_AGENT_DEADLINE_MS);
  const deadlineMs =
    Number.isFinite(deadlineMsRaw) && deadlineMsRaw > 10_000 ? deadlineMsRaw : 55_000;

  const maxStepsRaw = Number(process.env.NATIONAL_AGENT_MAX_STEPS);
  const maxSteps =
    Number.isFinite(maxStepsRaw) && maxStepsRaw >= 1 ? maxStepsRaw : 14;

  console.error(
    `[backfill-national-corpus-eu27] ${codes.length} pays — delay=${delayMs}ms ignoreTtl=${ignoreTtl} deadlineMs=${deadlineMs} maxSteps=${maxSteps}`
  );

  const results: Array<Awaited<ReturnType<typeof runNationalCorpusAgentForCountry>>> = [];

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    console.error(`[${i + 1}/${codes.length}] ${code}…`);

    const direct = await tryDirectNationalStatuteIngest(code, { ignoreTtl });
    let r: Awaited<ReturnType<typeof runNationalCorpusAgentForCountry>>;

    if (direct.status === "indexed" || direct.status === "fresh_ttl") {
      r = { code, status: direct.status, summary: direct.summary };
      console.error(`  → direct: ${direct.status}`);
    } else {
      console.error(`  → direct ${direct.status}, agent Claude…`);
      r = await runNationalCorpusAgentForCountry(code, {
        deadlineMs,
        maxSteps,
        ignoreTtl,
        skipDirectIngest: true,
      });

      if (r.status === "no_fetch_or_aborted") {
        const synthesis = await tryDirectNationalStatuteIngest(code, {
          ignoreTtl,
          synthesisOnly: true,
        });
        if (synthesis.status === "indexed") {
          r = { code, status: "indexed", summary: synthesis.summary };
          console.error(`  → synthèse de repli: ${synthesis.summary}`);
        }
      }
    }

    results.push(r);
    console.error(`  → ${r.status}: ${r.summary}`);

    if (i < codes.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  const byStatus: Record<string, number> = {};
  for (const r of results) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }
  console.error("[backfill-national-corpus-eu27] Synthèse :", byStatus);

  console.log(JSON.stringify({ at: new Date().toISOString(), results, byStatus }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
