import { NextResponse } from "next/server";

import { isAdmin, getAuthUser } from "@/lib/admin";
import { ingestSupplementaryCorpusSeeds } from "@/lib/ingest/supplementary-corpus-ingest";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";

export const maxDuration = 180;

/** Déclenche l’indexation du corpus complémentaire (admin uniquement). */
export async function POST() {
  const user = await getAuthUser();
  if (!user || !(await isAdmin())) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }
  const limited = await rateLimitUser(user.id, "admin", RATE_LIMITS.admin);
  if (limited) return limited;

  try {
    const report = await ingestSupplementaryCorpusSeeds();
    const ok = report.errors.length === 0;
    return NextResponse.json({ ok, report }, { status: ok ? 200 : 207 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
