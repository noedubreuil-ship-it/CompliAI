import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
// Minimum number of distinct users per sector before showing benchmark data
const MIN_SAMPLE = 5;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all audits that have a compliance_score, joined with their project sector
  const { data: audits, error } = await admin
    .from("audits")
    .select("user_id, compliance_score, projects(sector)")
    .not("compliance_score", "is", null);

  if (error) {
    console.error("[benchmark-aggregation] fetch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group scores by sector
  const bySector: Record<string, { scores: number[]; users: Set<string> }> = {};

  for (const audit of audits ?? []) {
    const score = audit.compliance_score as number;
    const projectData = audit.projects as unknown;
    const sector =
      Array.isArray(projectData)
        ? (projectData[0]?.sector as string | null | undefined)
        : ((projectData as { sector?: string } | null)?.sector ?? null);

    if (!sector || !score) continue;

    if (!bySector[sector]) {
      bySector[sector] = { scores: [], users: new Set() };
    }
    bySector[sector].scores.push(score);
    bySector[sector].users.add(audit.user_id as string);
  }

  // Compute stats and upsert only sectors with enough samples
  const rows = [];
  const skipped = [];

  for (const [sector, { scores, users }] of Object.entries(bySector)) {
    if (users.size < MIN_SAMPLE) {
      skipped.push({ sector, sample_count: users.size });
      continue;
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const n = sorted.length;
    const avg = sorted.reduce((a, b) => a + b, 0) / n;
    const p25 = sorted[Math.floor(n * 0.25)] ?? sorted[0];
    const p75 = sorted[Math.floor(n * 0.75)] ?? sorted[n - 1];

    rows.push({
      sector,
      avg_score: Math.round(avg * 10) / 10,
      p25_score: p25,
      p75_score: p75,
      sample_count: users.size,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error: upsertError } = await admin
      .from("sector_benchmarks")
      .upsert(rows, { onConflict: "sector" });

    if (upsertError) {
      console.error("[benchmark-aggregation] upsert error:", upsertError.message);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  console.log(
    JSON.stringify({
      level: "info",
      event: "benchmark_aggregation",
      upserted: rows.length,
      skipped: skipped.length,
      sectors: rows.map((r) => r.sector),
    })
  );

  return NextResponse.json({
    ok: true,
    upserted: rows.length,
    skipped: skipped.length,
    sectors: rows.map((r) => ({ sector: r.sector, avg: r.avg_score, n: r.sample_count })),
  });
}
