import { NextResponse } from "next/server";

import {
  cronBatchCountryCodesUtcHour,
  runNationalCorpusAgentForCountry,
} from "@/lib/agents/national-corpus-agent";

/**
 * Cron : rotation horaire (UTC) sur un sous-ensemble UE-27 (batch via NATIONAL_AGENT_CRON_BATCH_SIZE).
 * Auth identique aux autres crons : Bearer CRON_SECRET.
 *
 * Query : force=1 → ignore le TTL freshness pour ce batch.
 */

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || expectedSecret === "your-secret-cron-token" || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ignoreTtl = searchParams.get("force") === "1";

  const codes = cronBatchCountryCodesUtcHour();
  const deadlineMsRaw = Number(process.env.NATIONAL_AGENT_CRON_DEADLINE_MS);
  const deadlineMs =
    Number.isFinite(deadlineMsRaw) && deadlineMsRaw > 10_000 ? deadlineMsRaw : 120_000;

  const results: Array<Awaited<ReturnType<typeof runNationalCorpusAgentForCountry>>> = [];
  for (const code of codes) {
    const r = await runNationalCorpusAgentForCountry(code, {
      deadlineMs,
      ignoreTtl,
      maxSteps: Number.isFinite(Number(process.env.NATIONAL_AGENT_CRON_MAX_STEPS))
        ? Number(process.env.NATIONAL_AGENT_CRON_MAX_STEPS)
        : 16,
    });
    results.push(r);
  }

  return NextResponse.json({
    scheduled: codes,
    ignoreTtl,
    results,
    at: new Date().toISOString(),
  });
}
