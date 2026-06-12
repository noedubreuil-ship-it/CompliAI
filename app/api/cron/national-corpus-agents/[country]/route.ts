import { NextResponse } from "next/server";

import { EU27 } from "@/lib/data/eu27-registry";

import { runNationalCorpusAgentForCountry } from "@/lib/agents/national-corpus-agent";

type RouteCtx = { params: Promise<{ country: string }> };

/**
 * Cron ciblé un pays (pour un job Vercel / worker par membre UE si besoin).
 * GET .../national-corpus-agents/FR?force=1
 */

export async function GET(request: Request, ctx: RouteCtx) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || expectedSecret === "your-secret-cron-token" || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { country } = await ctx.params;
  const code = country.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(code) || !EU27[code]) {
    return NextResponse.json({ error: "Code pays UE inconnu ou absent du registre." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const ignoreTtl = searchParams.get("force") === "1";

  const deadlineMsRaw = Number(process.env.NATIONAL_AGENT_CRON_DEADLINE_MS);
  const deadlineMs =
    Number.isFinite(deadlineMsRaw) && deadlineMsRaw > 10_000 ? deadlineMsRaw : 180_000;

  const result = await runNationalCorpusAgentForCountry(code, {
    deadlineMs,
    ignoreTtl,
    maxSteps: Number.isFinite(Number(process.env.NATIONAL_AGENT_CRON_MAX_STEPS))
      ? Number(process.env.NATIONAL_AGENT_CRON_MAX_STEPS)
      : 16,
  });

  return NextResponse.json({
    scheduled: [code],
    ignoreTtl,
    results: [result],
    at: new Date().toISOString(),
  });
}
