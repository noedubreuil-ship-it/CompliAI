#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const REGS = [
  "Directive NIS 2 (UE 2022/2555)",
  "Directive DSM (UE 2019/790) — droit d'auteur marché unique numérique",
  "Règlement Machines (UE 2023/1230) — produits IA intégrés",
];

void (async () => {
  for (const reg of REGS) {
    console.log(`\n── ${reg}`);

    // Article "premier" existe ?
    const { data: prem } = await sb.from("legal_chunks")
      .select("id, article_number")
      .eq("regulation", reg)
      .eq("granularity", "article")
      .in("article_number", ["premier", "1", "Premier"]);
    console.log("  article 'premier'/'1':", prem);

    // Tous les articles (pour voir le format)
    const { data: allArts } = await sb.from("legal_chunks")
      .select("article_number")
      .eq("regulation", reg)
      .eq("granularity", "article")
      .order("article_number");
    const nums = allArts?.map(a => a.article_number) ?? [];
    console.log(`  Tous articles (${nums.length}):`, nums.slice(0, 20));

    // Simulation du backfill — combien matchent avec regexp_replace ?
    // Pour chaque orphelin "X_§Y", vérifier si l'article "X" existe
    const { data: orphs } = await sb.from("legal_chunks")
      .select("article_number")
      .eq("regulation", reg)
      .in("granularity", ["paragraph", "point"])
      .is("parent_chunk_id", null);

    const artSet = new Set(nums);
    let matchable = 0, unmatchable = 0;
    const unmatched: string[] = [];
    for (const o of orphs ?? []) {
      const baseArt = o.article_number?.replace(/_§\d+$/, "") ?? "";
      if (artSet.has(baseArt)) matchable++;
      else { unmatchable++; unmatched.push(o.article_number); }
    }
    console.log(`  Orphelins matchables : ${matchable} / ${(orphs?.length ?? 0)}`);
    if (unmatchable > 0) console.log(`  Non-matchables : ${unmatchable} — ex:`, unmatched.slice(0, 5));
  }
})();
