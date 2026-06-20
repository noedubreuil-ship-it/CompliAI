/**
 * Supprime les anciennes versions EN/doublons de la base vectorielle.
 * Garde uniquement les versions FR officielles (AI_ACT_FR, GDPR_FR, etc.)
 *
 * Usage: npx tsx --env-file=.env.local scripts/cleanup-corpus.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Versions obsolètes à supprimer (regulation exact match)
// NB: "AI Act (UE 2024/1689)" et "RGPD (UE 2016/679)" sont les versions FR officielles — ne pas supprimer.
// Seules les versions EN ou doublon CNIL sont listées ici.
const TO_DELETE: string[] = [
  // Rien à supprimer — corpus propre (FR uniquement).
  // Ajouter ici si une future version doit remplacer une ancienne.
];

async function main() {
  console.log("🧹 Nettoyage des doublons dans legal_chunks\n");

  // Inventaire avant nettoyage
  const { data: before } = await supabase
    .from("legal_chunks")
    .select("regulation")
    .order("regulation");

  const counts: Record<string, number> = {};
  for (const row of before ?? []) {
    counts[row.regulation] = (counts[row.regulation] ?? 0) + 1;
  }

  console.log("📊 Corpus actuel :");
  for (const [reg, count] of Object.entries(counts).sort()) {
    const toDelete = TO_DELETE.includes(reg);
    console.log(`  ${toDelete ? "❌" : "✅"} ${reg} — ${count} chunks${toDelete ? " (à supprimer)" : ""}`);
  }

  console.log();

  for (const regulation of TO_DELETE) {
    const count = counts[regulation] ?? 0;
    if (count === 0) {
      console.log(`ℹ️  "${regulation}" — déjà absent, rien à faire`);
      continue;
    }

    const { error } = await supabase
      .from("legal_chunks")
      .delete()
      .eq("regulation", regulation);

    if (error) {
      console.error(`❌ Erreur suppression "${regulation}": ${error.message}`);
    } else {
      console.log(`✅ Supprimé: "${regulation}" (${count} chunks)`);
    }
  }

  // Inventaire après nettoyage
  const { data: after } = await supabase
    .from("legal_chunks")
    .select("regulation")
    .order("regulation");

  const countAfter: Record<string, number> = {};
  for (const row of after ?? []) {
    countAfter[row.regulation] = (countAfter[row.regulation] ?? 0) + 1;
  }

  console.log("\n📊 Corpus après nettoyage :");
  let total = 0;
  for (const [reg, count] of Object.entries(countAfter).sort()) {
    console.log(`  ✅ ${reg} — ${count} chunks`);
    total += count;
  }
  console.log(`\n  TOTAL : ${total} chunks`);
}

main().catch((e) => {
  console.error("Erreur fatale:", e);
  process.exit(1);
});
