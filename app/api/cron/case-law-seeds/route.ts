import { NextResponse } from "next/server";

import { ingestAllCaseLawSeeds } from "@/lib/ingest/case-law-seeds-ingest";

export const maxDuration = 240;

/**
 * Recharge les embeddings des extraits / synthèses jurisprudentiels (EU + national seeds).
 * Bearer CRON_SECRET — à planifier rarement (quotidien ou hebdomadaire suffit).
 */

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || expectedSecret === "your-secret-cron-token" || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { eu, national } = await ingestAllCaseLawSeeds();
    const ok = eu.errors.length === 0 && national.errors.length === 0;
    return NextResponse.json({ ok, eu, national, at: new Date().toISOString() }, { status: ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), at: new Date().toISOString() },
      { status: 500 }
    );
  }
}
