#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const DOC_ID = "44aa471d-9974-4a6e-aaa8-5eefbfa9ddd5";

void (async () => {
  const { data: staging } = await sb.from("staging_chunks")
    .select("chunk_hash, granularity, article_number, paragraph_number, point_letter")
    .eq("document_id", DOC_ID).eq("validation_status", "approved");

  const reg = "Règlement Machines (UE 2023/1230) — produits IA intégrés";
  const { data: prod } = await sb.from("legal_chunks")
    .select("chunk_hash").eq("regulation", reg);

  const prodHashes = new Set((prod ?? []).map(r => r.chunk_hash as string));
  const missing = (staging ?? []).filter(c => !prodHashes.has(c.chunk_hash as string));

  console.log(`Staging approuvés : ${staging?.length ?? 0}`);
  console.log(`En production     : ${prod?.length ?? 0}`);
  console.log(`Manquants         : ${missing.length}`);
  if (missing.length > 0) {
    const byCat: Record<string, number> = {};
    for (const c of missing) { const g = (c.granularity as string) ?? "?"; byCat[g] = (byCat[g]??0)+1; }
    console.log("Par granularité:", JSON.stringify(byCat));
    console.log("Exemples:", missing.slice(0,5).map(c => `Art.${c.article_number}§${c.paragraph_number}pt.${c.point_letter}`).join(", "));
  }
})().catch(e => { console.error(e); process.exit(1); });
