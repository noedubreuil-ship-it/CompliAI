#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const TARGET_REGS = [
  "Directive NIS 2 (UE 2022/2555)",
  "Directive DSM (UE 2019/790) — droit d'auteur marché unique numérique",
  "Règlement Machines (UE 2023/1230) — produits IA intégrés",
];

void (async () => {
  for (const reg of TARGET_REGS) {
    console.log(`\n═══ ${reg}`);

    // Articles (10 premiers)
    const { data: arts } = await sb.from("legal_chunks")
      .select("article_number")
      .eq("regulation", reg)
      .eq("granularity", "article")
      .limit(10);
    console.log("  Articles (article_number):", arts?.map(a => a.article_number));

    // Orphelins (10 premiers)
    const { data: orph } = await sb.from("legal_chunks")
      .select("article_number, granularity")
      .eq("regulation", reg)
      .in("granularity", ["paragraph", "point"])
      .is("parent_chunk_id", null)
      .limit(10);
    console.log("  Orphelins (article_number):", orph?.map(o => `${o.granularity}:${o.article_number}`));
  }
})();
