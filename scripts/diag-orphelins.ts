#!/usr/bin/env tsx
/**
 * diag-orphelins.ts — Diagnostic orphelins parent_chunk_id NULL
 * Lecture seule — NIS2, DSM, Machines
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TARGET_REGS = [
  "Directive NIS 2 (UE 2022/2555)",
  "Directive DSM (UE 2019/790) — droit d'auteur marché unique numérique",
  "Règlement Machines (UE 2023/1230) — produits IA intégrés",
];

void (async () => {
  for (const reg of TARGET_REGS) {
    // Compter les orphelins (paragraph/point sans parent_chunk_id)
    const { data, error } = await sb.from("legal_chunks")
      .select("id, granularity, article_number, paragraph_number")
      .eq("regulation", reg)
      .in("granularity", ["paragraph", "point"])
      .is("parent_chunk_id", null);

    if (error) { console.error(`[${reg}] ERREUR:`, error.message); continue; }

    const total = data?.length ?? 0;
    const byGran: Record<string, number> = {};
    const articles = new Set<string>();
    for (const r of data ?? []) {
      byGran[r.granularity] = (byGran[r.granularity] ?? 0) + 1;
      if (r.article_number) articles.add(r.article_number);
    }

    // Compter les parents existants (articles) pour cette regulation
    const { count: artCount } = await sb.from("legal_chunks")
      .select("*", { count: "exact", head: true })
      .eq("regulation", reg)
      .eq("granularity", "article");

    console.log(`\n── ${reg}`);
    console.log(`   Orphelins : ${total} (${JSON.stringify(byGran)})`);
    console.log(`   Articles parents en prod : ${artCount}`);
    console.log(`   Articles orphelins distincts : ${articles.size}`);

    // Vérifier qu'il y a bien des articles matchants pour chaque orphelin
    // (sinon le backfill ne pourra pas résoudre)
    if (total > 0 && artCount! > 0) {
      // Exemple : prendre 3 orphelins et vérifier leur article_number
      const sample = data!.slice(0, 3);
      for (const s of sample) {
        const { count } = await sb.from("legal_chunks")
          .select("*", { count: "exact", head: true })
          .eq("regulation", reg)
          .eq("granularity", "article")
          .eq("article_number", s.article_number ?? "");
        console.log(`   [sample] article_number="${s.article_number}" → ${count} article(s) parent trouvé(s)`);
      }
    }
  }
  console.log("\n✅ Diagnostic terminé.");
})();
