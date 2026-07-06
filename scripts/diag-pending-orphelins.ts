#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

void (async () => {
  // Pending documents avec 0 staging_chunks, les 20 plus récents
  const { data: pending } = await sb
    .from("pending_documents")
    .select("id, title, celex, status, document_type, source_url, detected_at")
    .in("status", ["pending", "staged"])
    .order("detected_at", { ascending: false });

  const results = [];
  for (const p of (pending ?? [])) {
    const { count } = await sb
      .from("staging_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", p.id);
    if ((count ?? 0) === 0) {
      results.push({ ...p, chunks: count ?? 0 });
    }
    if (results.length >= 20) break;
  }

  console.log(`\nTop 20 pending_documents avec 0 chunks (sur ${pending?.length ?? 0} total):\n`);
  console.log("idx | status  | celex           | chunks | date       | title (60 chars)");
  console.log("-".repeat(120));
  results.forEach((p, i) => {
    const title = ((p.title as string) ?? "?").substring(0, 60);
    const celex = ((p.celex as string) ?? "NULL").padEnd(15);
    const date = ((p.detected_at as string) ?? "").slice(0, 10);
    const status = (p.status as string).padEnd(7);
    console.log(`${String(i+1).padStart(3)} | ${status} | ${celex} | ${String(p.chunks).padStart(6)} | ${date} | ${title}`);
    console.log(`    | source: ${((p.source_url as string) ?? "").substring(0, 90)}`);
  });
})().catch(e => { console.error(e); process.exit(1); });
