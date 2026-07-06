#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  // 1. Métriques corpus production par règlement
  console.log("\n=== MÉTRIQUES CORPUS legal_chunks (production) ===");
  const { data: lc, error: lcErr } = await sb
    .from("legal_chunks")
    .select("regulation, granularity, parent_chunk_id, updated_at");
  if (lcErr) { console.error("Erreur legal_chunks:", lcErr.message); process.exit(1); }

  const map = new Map<string, { total: number; withParent: number; granularities: Set<string>; lastUpdate: string }>();
  for (const row of (lc ?? [])) {
    const r = row.regulation ?? "unknown";
    if (!map.has(r)) map.set(r, { total: 0, withParent: 0, granularities: new Set(), lastUpdate: "" });
    const e = map.get(r)!;
    e.total++;
    if (row.parent_chunk_id) e.withParent++;
    if (row.granularity) e.granularities.add(row.granularity as string);
    const upd = row.updated_at as string ?? "";
    if (upd > e.lastUpdate) e.lastUpdate = upd;
  }

  const rows = [...map.entries()].sort((a, b) => b[1].lastUpdate.localeCompare(a[1].lastUpdate));
  console.log("\n" + "regulation".padEnd(65) + " | total | w_parent | granularities | last_update");
  console.log("-".repeat(130));
  let grandTotal = 0; let grandParent = 0;
  for (const [reg, v] of rows) {
    grandTotal += v.total; grandParent += v.withParent;
    const gran = [...v.granularities].sort().join(", ");
    const upd = v.lastUpdate?.slice(0, 10) ?? "-";
    console.log(`${reg.substring(0, 65).padEnd(65)} | ${String(v.total).padStart(5)} | ${String(v.withParent).padStart(8)} | ${gran.substring(0, 50).padEnd(50)} | ${upd}`);
  }
  console.log("-".repeat(130));
  console.log(`GRAND TOTAL: ${grandTotal} chunks, ${grandParent} avec parent_chunk_id`);

  // 2. parent_chunk_id breakdown par granularité
  console.log("\n=== PARENT_CHUNK_ID PAR GRANULARITÉ (toutes regulations) ===");
  const byGran = new Map<string, { total: number; withParent: number }>();
  for (const row of (lc ?? [])) {
    const g = (row.granularity as string) ?? "unknown";
    if (!byGran.has(g)) byGran.set(g, { total: 0, withParent: 0 });
    byGran.get(g)!.total++;
    if (row.parent_chunk_id) byGran.get(g)!.withParent++;
  }
  for (const [g, v] of [...byGran.entries()].sort()) {
    const pct = v.total > 0 ? ((v.withParent / v.total) * 100).toFixed(1) : "0.0";
    console.log(`  ${g.padEnd(15)}: ${v.withParent}/${v.total} avec parent_chunk_id (${pct}%)`);
  }

  // 3. Pending documents
  console.log("\n=== DOCUMENTS EN ATTENTE DE VALIDATION (pending_documents) ===");
  const { data: pending, error: pErr } = await sb
    .from("pending_documents")
    .select("id, title, celex, status, document_type, detected_at, updated_at")
    .in("status", ["staged", "pending"])
    .order("updated_at", { ascending: false });
  if (pErr) { console.error("Erreur pending_documents:", pErr.message); }
  else {
    if (!pending?.length) { console.log("  (aucun document en attente)"); }
    for (const p of (pending ?? [])) {
      const { count } = await sb
        .from("staging_chunks")
        .select("id", { count: "exact", head: true })
        .eq("document_id", p.id);
      console.log(`  [${(p.status as string).toUpperCase().padEnd(7)}] ${(p.celex as string ?? "?").padEnd(15)} — ${((p.title as string) ?? "?").substring(0, 55)}`);
      console.log(`    ID: ${p.id} | chunks: ${count ?? "?"} | créé: ${(p.detected_at as string)?.slice(0,10)}`);
    }
  }
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
