#!/usr/bin/env tsx
/**
 * diag-art99.ts — Diagnostic Art. 99 AI Act et cartographie corpus Art. 90+.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // 1. Trouver la regulation AI Act directement
  const { data: aiActSample } = await (sb as any)
    .from("legal_chunks")
    .select("regulation")
    .ilike("regulation", "%ai act%")
    .limit(1)
    .maybeSingle();

  const { data: aiActSample2 } = await (sb as any)
    .from("legal_chunks")
    .select("regulation")
    .ilike("regulation", "%2024/1689%")
    .limit(1)
    .maybeSingle();

  const aiActReg = aiActSample?.regulation || aiActSample2?.regulation;
  console.log(`Regulation AI Act : "${aiActReg ?? "NON TROUVÉ"}"`);
  if (!aiActReg) {
    // Dernier recours : lister toutes les regulations distinctes via RPC ou en paginant
    const { data: page2 } = await (sb as any)
      .from("legal_chunks")
      .select("regulation")
      .range(1000, 1999);
    const regs2 = [...new Set((page2 ?? []).map((r: any) => r.regulation))];
    console.log("Page 2 regulations:", regs2);
    return;
  }

  // 2. Chunks Art. 99 spécifiquement
  const { data: c99 } = await (sb as any)
    .from("legal_chunks")
    .select("article_number, paragraph_number, point_letter, content, created_at, pending_document_id, source_method")
    .eq("regulation", aiActReg)
    .ilike("article_number", "99%")
    .order("article_number");

  console.log(`\n=== AI Act Art. 99 chunks (${(c99??[]).length}) ===`);
  for (const c of c99 ?? []) {
    console.log(`  art=${c.article_number} §=${c.paragraph_number} chars=${c.content.length} src=${c.source_method}`);
    console.log(`  snippet: ${c.content.substring(0, 200).replace(/\n/g, " ")}`);
    console.log();
  }

  // 3. Distribution Art. 85+ pour cartographier truncations
  const { data: lateChunks } = await (sb as any)
    .from("legal_chunks")
    .select("article_number, paragraph_number")
    .eq("regulation", aiActReg)
    .gte("article_number", "85")   // string comparison OK car 85-99 → '85' < '9' alphabetically...
    .order("article_number");

  // Agrégation manuelle
  const allLate: any[] = [];
  // Récupérer TOUS les chunks AI Act et filtrer
  const { data: allAiAct } = await (sb as any)
    .from("legal_chunks")
    .select("article_number, paragraph_number, content")
    .eq("regulation", aiActReg);

  const byBase: Record<string, { paragraphs: string[], totalChars: number }> = {};
  for (const c of allAiAct ?? []) {
    const base = (c.article_number ?? "?").split("_")[0];
    const num = parseInt(base);
    if (!isNaN(num) && num >= 90) {
      if (!byBase[base]) byBase[base] = { paragraphs: [], totalChars: 0 };
      byBase[base].paragraphs.push(c.article_number ?? "?");
      byBase[base].totalChars += c.content.length;
    }
  }

  console.log("\n=== Distribution chunks Art. 90-113 AI Act ===");
  const sorted = Object.entries(byBase).sort(([a],[b]) => parseInt(a)-parseInt(b));
  for (const [art, info] of sorted) {
    console.log(`  Art. ${art}: ${info.paragraphs.length} chunks [${info.paragraphs.join(", ")}] (${info.totalChars} chars total)`);
  }

  // 4. Total AI Act chunks
  console.log(`\nTotal AI Act chunks: ${(allAiAct??[]).length}`);

  // 5. Document source
  const { data: firstChunk } = await (sb as any)
    .from("legal_chunks")
    .select("pending_document_id, source_method")
    .eq("regulation", aiActReg)
    .not("pending_document_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (firstChunk?.pending_document_id) {
    const { data: doc } = await (sb as any)
      .from("pending_documents")
      .select("id, title, source_url, status, regulation, metadata")
      .eq("id", firstChunk.pending_document_id)
      .maybeSingle();
    if (doc) {
      console.log(`\n=== Document source AI Act ===`);
      console.log(`  title: ${doc.title}`);
      console.log(`  url: ${doc.source_url}`);
      console.log(`  status: ${doc.status}`);
    }
  } else {
    console.log("\n⚠️ Aucun pending_document_id sur les chunks AI Act (ingestion manuelle?)");
  }

  // 6. Contenu complet Art. 99 existants
  if ((c99 ?? []).length > 0) {
    console.log("\n=== Contenu complet Art. 99 existants ===");
    for (const c of c99 ?? []) {
      console.log(`\n--- ${c.article_number} ---`);
      console.log(c.content);
    }
  }

  // 7. Voisins Art. 98, 100 pour comparaison profondeur
  for (const neighbor of ["98", "100", "101"]) {
    const nc = (allAiAct ?? []).filter((c: any) => 
      c.article_number === neighbor || c.article_number?.startsWith(neighbor + "_")
    );
    if (nc.length) {
      console.log(`\n=== Art. ${neighbor} (${nc.length} chunks) ===`);
      for (const c of nc) {
        console.log(`  ${c.article_number} §=${c.paragraph_number} chars=${c.content.length}`);
        console.log(`  ${c.content.substring(0, 120).replace(/\n/g," ")}`);
      }
    }
  }
}

main().catch(console.error);
