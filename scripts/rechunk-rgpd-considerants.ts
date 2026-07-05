#!/usr/bin/env tsx
/**
 * rechunk-rgpd-considerants.ts — Refactoring considérants RGPD.
 *
 * Opération :
 *   1. Extraction des 173 considérants depuis GDPR_FR.txt
 *   2. Insertion dans staging_chunks (1 chunk par considérant individuel)
 *   3. Archivage des 34 anciens chunks groupés "Considérants (X)-(Y)"
 *      dans historical_chunks (archive_reason = 'refactoring_considerants_individual')
 *   4. Suppression des anciens chunks groupés de legal_chunks
 *
 * IMPORTANT :
 *   - Les anciens chunks ne sont archivés/supprimés QUE lors de la promotion production
 *   - Le staging_chunks insert est la seule écriture de ce script
 *   - Le script d'archivage est séparé et lancé manuellement avec --archive-prod
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/rechunk-rgpd-considerants.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/rechunk-rgpd-considerants.ts
 *   npx tsx --env-file=.env.local scripts/rechunk-rgpd-considerants.ts --archive-prod
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ─── Config ────────────────────────────────────────────────────────────────────

const SOURCE_PATH = path.join(__dirname, "data/GDPR_FR.txt");
const REGULATION_NAME = "RGPD (UE 2016/679)";
const CELEX = "32016R0679";
const EURLEX_URL = "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679";
const VERSION_DATE = "2016-04-27";
const LANGUAGE = "fr";
const COUNTRY = "EU";
const TEXT_TYPE = "reglement_ue";
const SOURCE_TYPE = "eurlex";
const PENDING_DOC_EXTERNAL_ID = `${CELEX}-considerants`;

const dryRun = process.argv.includes("--dry-run");
const archiveProd = process.argv.includes("--archive-prod");

// ─── Client ───────────────────────────────────────────────────────────────────

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes");
  return createClient(url, key);
}

function chunkHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Considerant {
  number: number;
  content: string;
}

interface StagingChunkInsert {
  id: string;
  document_id: string;
  regulation: string;
  article_number: string | null;
  paragraph_number: string | null;
  point_letter: string | null;
  article_title: string | null;
  chapter: string | null;
  granularity: "considerant";
  parent_chunk_id: string | null;
  content: string;
  language: string;
  country: string;
  text_type: string;
  source_type: string;
  source_url: string;
  eurlex_url: string;
  publication_date: string;
  chunk_hash: string;
  parsed_at: string;
  validation_status: "pending";
}

// ─── Extraction considérants ───────────────────────────────────────────────────

function extractConsiderants(rawText: string): Considerant[] {
  const text = rawText.replace(/^---[\s\S]*?---\n/, "");
  const lines = text.split("\n");

  // Bornes : (1) → ONT ADOPTÉ LE PRÉSENT RÈGLEMENT:
  let preambleStart = -1;
  let preambleEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "(1)" && preambleStart === -1) preambleStart = i;
    if (t === "ONT ADOPTÉ LE PRÉSENT RÈGLEMENT:") { preambleEnd = i; break; }
  }

  if (preambleStart === -1) throw new Error("Considérant (1) non trouvé");

  const preambleLines = lines.slice(preambleStart, preambleEnd);
  const CONS_RE = /^\((\d+)\)$/;
  const starts: { idx: number; num: number }[] = [];

  for (let i = 0; i < preambleLines.length; i++) {
    const m = preambleLines[i].trim().match(CONS_RE);
    if (m) starts.push({ idx: i, num: parseInt(m[1], 10) });
  }

  return starts.map((s, idx) => {
    const endIdx = idx + 1 < starts.length ? starts[idx + 1].idx : preambleLines.length;
    const content = preambleLines.slice(s.idx, endIdx).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return { number: s.num, content };
  }).filter(c => c.content.length > 10);
}

// ─── pending_documents ────────────────────────────────────────────────────────

async function ensurePendingDocument(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: ReturnType<typeof createClient<any>>,
  dryRun: boolean
): Promise<string> {
  const { data: existing } = await sb
    .from("pending_documents")
    .select("id, status")
    .eq("external_id", PENDING_DOC_EXTERNAL_ID)
    .maybeSingle();

  if (existing) {
    console.log(`   Document existant : ${existing.id} (status: ${existing.status})`);
    if (existing.status !== "pending" && !dryRun) {
      await sb.from("pending_documents").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", existing.id);
    }
    return existing.id;
  }

  if (dryRun) {
    const id = crypto.randomUUID();
    console.log(`   [DRY-RUN] pending_document créé (fake: ${id})`);
    return id;
  }

  const { data: inserted, error } = await sb
    .from("pending_documents")
    .insert({
      external_id: PENDING_DOC_EXTERNAL_ID,
      title: `${REGULATION_NAME} — Considérants individuels (refactoring)`,
      document_type: "eu_regulation",
      language: LANGUAGE,
      country: COUNTRY,
      source_url: EURLEX_URL,
      status: "pending",
      detected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !inserted) throw new Error(`Impossible de créer pending_document : ${error?.message}`);
  console.log(`   Nouveau pending_document : ${inserted.id}`);
  return inserted.id;
}

// ─── Archivage et suppression des anciens chunks groupés ─────────────────────

async function archiveAndDeleteGroupedConsiderants(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: ReturnType<typeof createClient<any>>,
  dryRun: boolean
): Promise<void> {
  console.log("\n  Archivage des chunks groupés RGPD dans historical_chunks...");

  // Récupérer les 34 chunks groupés
  const { data: grouped, error: fetchError } = await sb
    .from("legal_chunks")
    .select("*")
    .eq("regulation", REGULATION_NAME)
    .ilike("article_number", "Considérants (%)");

  if (fetchError) throw new Error(`Fetch grouped: ${fetchError.message}`);
  const chunks = grouped ?? [];
  console.log(`   ${chunks.length} chunks groupés trouvés`);

  if (chunks.length === 0) {
    console.log("   Aucun chunk groupé à archiver.");
    return;
  }

  if (!dryRun) {
    // Archiver dans historical_chunks
    const archiveRows = (chunks as Array<Record<string, unknown>>).map(c => ({
      original_chunk_id: c.id as string,
      regulation: c.regulation as string,
      article_number: c.article_number as string | null,
      article_title: c.article_title as string | null,
      granularity: (c.granularity as string | null) ?? "paragraph",
      parent_chunk_id: c.parent_chunk_id as string | null,
      content: c.content as string,
      embedding: c.embedding,
      chunk_hash: c.chunk_hash as string | null,
      version_date: (c.updated_at as string | null)?.slice(0, 10) ?? null,
      archived_at: new Date().toISOString(),
      archive_reason: "refactoring_considerants_individual",
      superseded_by: null,
    }));

    const { error: archiveErr } = await sb.from("historical_chunks").insert(archiveRows);
    if (archiveErr) {
      console.warn(`   ⚠️  Erreur archivage : ${archiveErr.message}`);
    } else {
      console.log(`   ✅ ${archiveRows.length} chunks archivés dans historical_chunks`);
    }

    // Supprimer de legal_chunks
    const ids = chunks.map((c: Record<string, unknown>) => c.id as string);
    const { error: delErr } = await sb.from("legal_chunks").delete().in("id", ids);
    if (delErr) throw new Error(`Suppression: ${delErr.message}`);
    console.log(`   ✅ ${ids.length} chunks supprimés de legal_chunks`);
  } else {
    console.log(`   [DRY-RUN] Archivage + suppression simulés pour ${chunks.length} chunks`);
    for (const c of chunks as Array<Record<string, unknown>>) {
      console.log(`     → ${(c.article_number as string)}`);
    }
  }
}

// ─── Insert staging_chunks ────────────────────────────────────────────────────

async function insertStagingChunks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: ReturnType<typeof createClient<any>>,
  chunks: StagingChunkInsert[],
  dryRun: boolean
): Promise<{ inserted: number; errors: string[] }> {
  if (dryRun) return { inserted: chunks.length, errors: [] };

  const BATCH = 100;
  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const { error } = await sb.from("staging_chunks").insert(batch);
    if (error) errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
    else inserted += batch.length;
  }
  return { inserted, errors };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  rechunk-rgpd-considerants.ts — RGPD 173 considérants → staging");
  console.log("=".repeat(70));
  console.log(`Mode : ${dryRun ? "DRY-RUN" : archiveProd ? "LIVE + ARCHIVE PROD" : "LIVE (staging only)"}`);
  console.log(`Source : ${SOURCE_PATH}`);
  console.log();

  if (!fs.existsSync(SOURCE_PATH)) throw new Error(`Source introuvable : ${SOURCE_PATH}`);

  const rawText = fs.readFileSync(SOURCE_PATH, "utf8");

  // 1. Extraction
  console.log("1. Extraction des 173 considérants...");
  const considerants = extractConsiderants(rawText);
  console.log(`   ${considerants.length} considérants extraits (attendu: 173)`);
  if (considerants.length !== 173) console.warn(`   ⚠️  ${considerants.length} ≠ 173`);
  console.log();

  const sb = getSb();

  // 2. Mode archive production : archiver + supprimer les anciens chunks groupés
  if (archiveProd) {
    await archiveAndDeleteGroupedConsiderants(sb, dryRun);
    if (dryRun) {
      console.log("\n⚠️  DRY-RUN archive : relancez avec --archive-prod sans --dry-run pour exécuter.");
      return;
    }
  }

  // 3. pending_document
  console.log("2. Création/récupération pending_document...");
  const documentId = await ensurePendingDocument(sb, dryRun);
  console.log();

  // 4. Nettoyage staging existant
  const { count } = await sb
    .from("staging_chunks")
    .select("*", { count: "exact", head: true })
    .eq("document_id", documentId);
  if ((count ?? 0) > 0) {
    console.log(`3. Suppression de ${count} staging_chunks existants...`);
    if (!dryRun) await sb.from("staging_chunks").delete().eq("document_id", documentId);
  }

  // 5. Construction chunks
  console.log("3. Construction staging_chunks...");
  const now = new Date().toISOString();
  const allChunks: StagingChunkInsert[] = considerants.map(c => ({
    id: crypto.randomUUID(),
    document_id: documentId,
    regulation: REGULATION_NAME,
    article_number: `considérant ${c.number}`,
    paragraph_number: String(c.number),
    point_letter: null,
    article_title: null,
    chapter: null,
    granularity: "considerant",
    parent_chunk_id: null,
    content: c.content,
    language: LANGUAGE,
    country: COUNTRY,
    text_type: TEXT_TYPE,
    source_type: SOURCE_TYPE,
    source_url: EURLEX_URL,
    eurlex_url: EURLEX_URL,
    publication_date: VERSION_DATE,
    chunk_hash: chunkHash(`${REGULATION_NAME}|considérant ${c.number}|considerant|${c.content}`),
    parsed_at: now,
    validation_status: "pending",
  }));

  // 6. Insert
  console.log(`4. Insertion ${allChunks.length} staging_chunks...`);
  const { inserted, errors } = await insertStagingChunks(sb, allChunks, dryRun);

  // Rapport
  console.log("\n" + "=".repeat(70));
  console.log("  RAPPORT — RGPD Considérants");
  console.log("=".repeat(70));
  console.log(`Mode       : ${dryRun ? "DRY-RUN" : "LIVE"}`);
  console.log(`Chunks     : ${allChunks.length} considérants (considérant 1 → 173)`);
  console.log(`Coût API   : $0.00 (aucun appel Claude)`);
  console.log(`Insérés    : ${inserted}`);
  if (errors.length > 0) for (const e of errors) console.log(`  ❌ ${e}`);

  if (dryRun) {
    console.log("\n⚠️  DRY-RUN : relancez sans --dry-run.");
  } else {
    console.log(`\n✅ Staging terminé. document_id : ${documentId}`);
    console.log("   Valider via /dashboard/admin/rag-validation");
    console.log("   Ensuite : npx tsx --env-file=.env.local scripts/rechunk-rgpd-considerants.ts --archive-prod");
  }
  console.log("=".repeat(70));
}

main().catch(err => { console.error("Erreur fatale:", err); process.exit(1); });
