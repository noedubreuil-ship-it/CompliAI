#!/usr/bin/env tsx
/**
 * backfill-orphelins.ts — Résoudre les parent_chunk_id NULL
 * Vague 1 (2026-07-07) : NIS2, DSM, Machines — 151 orphelins
 * Vague 2 (2026-07-07) : DSA, DMA, CRA, Data Act, DGA — ~218 orphelins
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/backfill-orphelins.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-orphelins.ts
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DRY_RUN = process.argv.includes("--dry-run");

const TARGET_REGS = [
  "Directive NIS 2 (UE 2022/2555)",
  "Directive DSM (UE 2019/790) — droit d'auteur marché unique numérique",
  "Règlement Machines (UE 2023/1230) — produits IA intégrés",
  "DSA — Règlement sur les services numériques (UE 2022/2065)",
  "DMA — Règlement sur les marchés numériques (UE 2022/1925)",
  "Cyber Resilience Act — Règlement sur la cyberrésilience (UE 2024/2847)",
  "Data Act — Règlement sur les données (UE 2023/2854)",
  "Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868)",
];

async function countOrphelins(reg: string): Promise<number> {
  const { count } = await sb.from("legal_chunks")
    .select("*", { count: "exact", head: true })
    .eq("regulation", reg)
    .in("granularity", ["paragraph", "point"])
    .is("parent_chunk_id", null);
  return count ?? 0;
}

async function backfillReg(reg: string): Promise<{ fixed: number; remaining: number }> {
  // Récupérer tous les orphelins avec leur article_number
  const { data: orphelins, error } = await sb.from("legal_chunks")
    .select("id, granularity, article_number, language")
    .eq("regulation", reg)
    .in("granularity", ["paragraph", "point"])
    .is("parent_chunk_id", null);

  if (error) throw new Error(`Fetch orphelins: ${error.message}`);
  if (!orphelins || orphelins.length === 0) return { fixed: 0, remaining: 0 };

  // Récupérer tous les articles de cette régulation
  const { data: articles, error: artErr } = await sb.from("legal_chunks")
    .select("id, article_number, language")
    .eq("regulation", reg)
    .eq("granularity", "article");

  if (artErr) throw new Error(`Fetch articles: ${artErr.message}`);

  // Index : (article_number, language) → id
  const artIndex = new Map<string, string>();
  for (const a of articles ?? []) {
    artIndex.set(`${a.article_number}::${a.language ?? "fr"}`, a.id);
  }

  let fixed = 0;
  let skipped = 0;

  for (const orphelin of orphelins) {
    // Résoudre le base article_number
    // "2_§1" → "2", "premier" → "1"
    let baseArt = (orphelin.article_number ?? "").replace(/_§\d+$/, "");
    if (baseArt === "premier") baseArt = "1";

    const lang = orphelin.language ?? "fr";
    const parentId = artIndex.get(`${baseArt}::${lang}`);

    if (!parentId) {
      skipped++;
      if (!DRY_RUN) console.warn(`  [SKIP] orphelin ${orphelin.id} — article_number="${orphelin.article_number}" → base="${baseArt}" → pas de parent trouvé`);
      continue;
    }

    if (DRY_RUN) {
      fixed++;
      continue;
    }

    // Appliquer le fix
    const { error: updateErr } = await sb.from("legal_chunks")
      .update({ parent_chunk_id: parentId })
      .eq("id", orphelin.id);

    if (updateErr) {
      console.error(`  [ERR] ${orphelin.id}: ${updateErr.message}`);
    } else {
      fixed++;
    }
  }

  const remaining = await countOrphelins(reg);
  return { fixed, remaining };
}

void (async () => {
  console.log("=".repeat(60));
  console.log(`  backfill-orphelins.ts${DRY_RUN ? " — DRY RUN" : ""}`);
  console.log("=".repeat(60));

  let totalFixed = 0;
  let totalRemaining = 0;

  for (const reg of TARGET_REGS) {
    const before = await countOrphelins(reg);
    console.log(`\n── ${reg}`);
    console.log(`   Avant : ${before} orphelins`);

    const { fixed, remaining } = await backfillReg(reg);
    totalFixed += fixed;
    totalRemaining += remaining;

    if (DRY_RUN) {
      console.log(`   [DRY] Matchables : ${fixed} / ${before}`);
    } else {
      console.log(`   Après : ${remaining} orphelins (${fixed} résolus)`);
    }
  }

  console.log("\n" + "=".repeat(60));
  if (DRY_RUN) {
    console.log(`  DRY RUN — ${totalFixed} orphelins seraient résolus`);
  } else {
    console.log(`  TOTAL résolus : ${totalFixed} | Restants : ${totalRemaining}`);
    if (totalRemaining === 0) console.log("  ✅ 0 orphelin restant");
    else console.warn(`  ⚠️  ${totalRemaining} orphelin(s) non résolus — investigation requise`);
  }
  console.log("=".repeat(60));
})();
