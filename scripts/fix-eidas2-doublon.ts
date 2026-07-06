#!/usr/bin/env tsx
/**
 * fix-eidas2-doublon.ts — Archive et supprime les 19 chunks eIDAS 2 obsolètes
 *
 * Contexte : deux entrées eIDAS 2 coexistent en production :
 *   - "eIDAS 2 — Identité numérique (UE 910/2014 mod. 2024/1183)"  → 692 chunks NOUVEAU ✅
 *   - "eIDAS 2 — Identité numérique européenne (UE 2024/1183)"      → 19 chunks ANCIEN ❌
 *
 * Action : archiver les 19 anciens dans historical_chunks (reason = 'superseded')
 *          puis les supprimer de legal_chunks.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/fix-eidas2-doublon.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/fix-eidas2-doublon.ts --prod
 */

import { createClient } from "@supabase/supabase-js";

const OLD_REGULATION = "eIDAS 2 — Identité numérique européenne (UE 2024/1183)";
const NEW_REGULATION = "eIDAS 2 — Identité numérique (UE 910/2014 mod. 2024/1183)";
const ARCHIVE_REASON = "superseded";

const isDryRun = !process.argv.includes("--prod");

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes");
  return createClient(url, key);
}

void (async () => {
  const sb = getSb();
  console.log("=".repeat(60));
  console.log("  fix-eidas2-doublon.ts");
  console.log("=".repeat(60));
  console.log(`Mode : ${isDryRun ? "DRY-RUN" : "PRODUCTION"}`);
  console.log(`Ancien : ${OLD_REGULATION}`);
  console.log(`Nouveau : ${NEW_REGULATION}`);
  console.log();

  // 1. Récupérer les chunks obsolètes
  const { data: oldChunks, error: fetchErr } = await sb
    .from("legal_chunks")
    .select("id, regulation, article_number, paragraph_number, point_letter, article_title, granularity, parent_chunk_id, content, embedding, chunk_hash, version_date, language")
    .eq("regulation", OLD_REGULATION);

  if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);
  if (!oldChunks?.length) {
    console.log("Aucun chunk trouvé pour l'ancien règlement. Rien à faire.");
    return;
  }

  console.log(`Chunks à archiver : ${oldChunks.length}`);
  const granCounts = new Map<string, number>();
  for (const c of oldChunks) {
    const g = (c.granularity as string) ?? "unknown";
    granCounts.set(g, (granCounts.get(g) ?? 0) + 1);
  }
  for (const [g, n] of [...granCounts.entries()].sort()) {
    console.log(`  ${g.padEnd(15)}: ${n}`);
  }

  // Vérifier que le nouveau existe bien
  const { count: newCount } = await sb
    .from("legal_chunks")
    .select("id", { count: "exact", head: true })
    .eq("regulation", NEW_REGULATION);
  console.log(`\nNouvel eIDAS 2 en production : ${newCount} chunks ✅`);

  if (isDryRun) {
    console.log("\n[DRY-RUN] Aucune écriture. Relancez avec --prod.");
    return;
  }

  // 2. Archiver dans historical_chunks
  console.log("\nArchivage dans historical_chunks...");
  const now = new Date().toISOString();
  const toArchive = oldChunks.map(c => ({
    original_chunk_id: c.id as string,
    regulation: c.regulation as string,
    article_number: c.article_number as string | null,
    article_title: c.article_title as string | null,
    granularity: c.granularity as string | null,
    parent_chunk_id: c.parent_chunk_id as string | null,
    content: c.content as string,
    embedding: c.embedding,
    chunk_hash: c.chunk_hash as string | null,
    version_date: c.version_date as string | null,
    archived_at: now,
    archive_reason: ARCHIVE_REASON,
    superseded_by: null,
  }));

  const { error: archiveErr } = await sb.from("historical_chunks").insert(toArchive);
  if (archiveErr) throw new Error(`Archive error: ${archiveErr.message}`);
  console.log(`  ✅ ${toArchive.length} chunks archivés`);

  // 3. Supprimer de legal_chunks
  console.log("Suppression de legal_chunks...");
  const ids = oldChunks.map(c => c.id as string);
  const { error: deleteErr } = await sb
    .from("legal_chunks")
    .delete()
    .in("id", ids);
  if (deleteErr) throw new Error(`Delete error: ${deleteErr.message}`);
  console.log(`  ✅ ${ids.length} chunks supprimés`);

  // 4. Vérification
  const { count: remaining } = await sb
    .from("legal_chunks")
    .select("id", { count: "exact", head: true })
    .eq("regulation", OLD_REGULATION);
  console.log(`\nVérification post-suppression :`);
  console.log(`  Ancien eIDAS 2 restant : ${remaining ?? 0} chunks (attendu : 0)`);
  console.log(`\n✅ Fix eIDAS 2 doublon terminé.`);
})().catch(e => { console.error("\n❌ Erreur fatale:", e); process.exit(1); });
