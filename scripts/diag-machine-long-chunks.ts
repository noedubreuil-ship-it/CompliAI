#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const DOC_ID = "44aa471d-9974-4a6e-aaa8-5eefbfa9ddd5";

void (async () => {
  const { data } = await sb.from("staging_chunks")
    .select("id, granularity, article_number, paragraph_number, point_letter, chunk_hash, content")
    .eq("document_id", DOC_ID).eq("validation_status", "approved")
    .order("parsed_at", { ascending: true });

  const chunks = data ?? [];
  console.log(`Total : ${chunks.length}`);

  const long = chunks.filter(c => ((c.content as string) ?? "").length > 20000);
  console.log(`\nChunks >20 000 chars : ${long.length}`);
  for (const c of long) {
    const len = ((c.content as string) ?? "").length;
    console.log(`  [${c.granularity}] Art.${c.article_number}§${c.paragraph_number}pt.${c.point_letter} — ${len} chars — hash:${(c.chunk_hash as string).substring(0, 16)}`);
  }

  // Trouver position dans la liste ordonnée
  if (long.length > 0) {
    const longHashes = new Set(long.map(c => c.chunk_hash as string));
    const positions = chunks.map((c, i) => ({ i, hash: c.chunk_hash as string })).filter(x => longHashes.has(x.hash));
    console.log("\nPositions dans la liste ordonnée :");
    for (const p of positions) {
      console.log(`  Index ${p.i} → batch ${Math.floor(p.i/50)}, position dans batch : ${p.i % 50}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
