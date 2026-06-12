import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin";
import { ingestSupplementaryCorpusSeeds } from "@/lib/ingest/supplementary-corpus-ingest";

export const maxDuration = 180;

/** Déclenche l’indexation du corpus complémentaire (admin uniquement). */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

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
