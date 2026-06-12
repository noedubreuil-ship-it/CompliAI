import { NextResponse } from "next/server";

import { ingestSupplementaryCorpusSeeds } from "@/lib/ingest/supplementary-corpus-ingest";

export const maxDuration = 180;

/**
 * Indexe le corpus complémentaire RAG (ICO, ISO 42001, NIST, OCDE, renfort AEPD).
 * Bearer CRON_SECRET — hebdomadaire recommandé.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || expectedSecret === "your-secret-cron-token" || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const report = await ingestSupplementaryCorpusSeeds();
    const ok = report.errors.length === 0;
    return NextResponse.json({ ok, report, at: new Date().toISOString() }, { status: ok ? 200 : 207 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), at: new Date().toISOString() },
      { status: 500 }
    );
  }
}
