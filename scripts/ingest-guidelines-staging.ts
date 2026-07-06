#!/usr/bin/env tsx
/**
 * ingest-guidelines-staging.ts — Ingestion staging des guidelines EDPB + Commission
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/ingest-guidelines-staging.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/ingest-guidelines-staging.ts
 *   npx tsx --env-file=.env.local scripts/ingest-guidelines-staging.ts --doc=PSEUDO
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DATA_DIR = path.join(__dirname, "data");
const isDryRun = process.argv.includes("--dry-run");
const docFilter = process.argv.find(a => a.startsWith("--doc="))?.replace("--doc=", "").toUpperCase();

interface GuidelineConfig {
  key: string;
  file: string;
  regulation: string;
  celex: string;
  eurlex_url: string;
  version_date: string;
  document_type: "edpb_guideline" | "edpb_recommendation" | "ai_office_guidance";
  text_type: "lignes_directrices" | "recommandation_edpb" | "guidance_ai_office";
  language: "fr" | "en";
}

const GUIDELINES: GuidelineConfig[] = [
  {
    key: "PSEUDO",
    file: "EDPB_01_2025_PSEUDONYMISATION_FR.txt",
    regulation: "EDPB Guidelines 01/2025 — Pseudonymisation as a data protection measure",
    celex: "edpb_gl_01_2025",
    eurlex_url: "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-012025-pseudonymisation",
    version_date: "2025-01-16",
    document_type: "edpb_guideline",
    text_type: "lignes_directrices",
    language: "en",
  },
  {
    key: "LEGITIME",
    file: "EDPB_01_2024_INTERET_LEGITIME_FR.txt",
    regulation: "EDPB Guidelines 01/2024 — Legitimate interest (Art. 6(1)(f) GDPR)",
    celex: "edpb_gl_01_2024",
    eurlex_url: "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-012024-processing-personal-data-based-legitimate",
    version_date: "2024-10-08",
    document_type: "edpb_guideline",
    text_type: "lignes_directrices",
    language: "en",
  },
  {
    key: "EPRIVACY_TECH",
    file: "EDPB_02_2023_EPRIVACY_TECH_FR.txt",
    regulation: "EDPB Guidelines 02/2023 — Technical scope of Art. 5(3) ePrivacy Directive",
    celex: "edpb_gl_02_2023",
    eurlex_url: "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-022023-technical-scope-art-53-eprivacy-directive",
    version_date: "2023-11-14",
    document_type: "edpb_guideline",
    text_type: "lignes_directrices",
    language: "en",
  },
  {
    key: "ACCES",
    file: "EDPB_01_2022_DROIT_ACCES_FR.txt",
    regulation: "EDPB Guidelines 01/2022 — Right of access (Art. 15 GDPR)",
    celex: "edpb_gl_01_2022",
    eurlex_url: "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-012022-data-subject-rights-right-access",
    version_date: "2023-03-28",
    document_type: "edpb_guideline",
    text_type: "lignes_directrices",
    language: "en",
  },
  {
    key: "OPINION_AI",
    file: "EDPB_OPINION_28_2024_AI_FR.txt",
    regulation: "EDPB Opinion 28/2024 — AI Act & personal data protection",
    celex: "edpb_op_28_2024",
    eurlex_url: "https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-282024-certain-aspects-ai-act",
    version_date: "2024-12-17",
    document_type: "edpb_guideline",
    text_type: "lignes_directrices",
    language: "en",
  },
  {
    key: "HIGHRISK",
    file: "COMMISSION_GUIDELINES_HIGHRISK_AI_EN.txt",
    regulation: "Commission Guidelines — Classification of high-risk AI systems (Art. 6 AI Act)",
    celex: "com_gl_highrisk_2025",
    eurlex_url: "https://digital-strategy.ec.europa.eu/fr/policies/ai-act#high-risk-classification",
    version_date: "2025-07-29",
    document_type: "ai_office_guidance",
    text_type: "guidance_ai_office",
    language: "en",
  },
  {
    key: "PROHIBITED",
    file: "COMMISSION_GUIDELINES_PROHIBITED_AI_EN.txt",
    regulation: "Commission Guidelines — Prohibited AI practices (Art. 5 AI Act)",
    celex: "com_gl_prohibited_2025",
    eurlex_url: "https://digital-strategy.ec.europa.eu/fr/policies/ai-act#prohibited-practices",
    version_date: "2025-07-29",
    document_type: "ai_office_guidance",
    text_type: "guidance_ai_office",
    language: "en",
  },
];

// ─── Chunking par paragraphes ─────────────────────────────────────────────────

const MIN_CHUNK = 200;
const MAX_CHUNK = 3000;
const TARGET_CHUNK = 1000;

function chunkDocument(text: string, regulation: string): string[] {
  // textutil produit des sauts de ligne simples — on aplatit en texte continu
  const flat = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  const chunks: string[] = [];
  let pos = 0;

  while (pos < flat.length) {
    let end = pos + TARGET_CHUNK;
    if (end >= flat.length) {
      // Dernier morceau
      const piece = flat.slice(pos).trim();
      if (piece.length >= MIN_CHUNK) chunks.push(piece);
      break;
    }
    // Chercher la fin de phrase la plus proche après TARGET_CHUNK (max +300 chars)
    const window = flat.slice(end, end + 300);
    const sentenceEnd = window.search(/[.!?]\s+[A-Z«"'(]/);
    if (sentenceEnd >= 0) {
      end = end + sentenceEnd + 1; // inclure le point
    } else {
      // Pas de fin de phrase — chercher un espace
      const spaceBack = flat.lastIndexOf(" ", end);
      if (spaceBack > pos) end = spaceBack;
    }
    const piece = flat.slice(pos, end).trim();
    if (piece.length >= MIN_CHUNK) chunks.push(piece);
    pos = end + 1;
  }

  // Préfixer chaque chunk avec le nom du document pour le contexte RAG
  return chunks.map((c) => `${regulation}\n\n${c}`);
}

function hash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").substring(0, 32);
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

async function ingestGuideline(config: GuidelineConfig): Promise<void> {
  const filePath = path.join(DATA_DIR, config.file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ Fichier introuvable : ${config.file}`);
    return;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const chunks = chunkDocument(raw, config.regulation);

  console.log(`\n${"─".repeat(70)}`);
  console.log(`  ${config.key} — ${config.regulation}`);
  console.log("─".repeat(70));
  console.log(`  Fichier  : ${config.file} (${Math.round(raw.length / 1024)}KB)`);
  console.log(`  Langue   : ${config.language}`);
  console.log(`  Chunks   : ${chunks.length}`);
  if (chunks.length > 0) {
    console.log(`  Aperçu   : ${chunks[0].substring(0, 100).replace(/\n/g, " ")}…`);
  }

  if (isDryRun) {
    console.log("  [DRY-RUN] Aucune écriture.");
    return;
  }

  if (chunks.length < 5) {
    console.error(`  ✗ Moins de 5 chunks extraits — problème de parsing, abandon.`);
    return;
  }

  // Vérifier si un pending_document existe déjà pour ce celex
  const { data: existing } = await supabase
    .from("pending_documents")
    .select("id, status")
    .eq("celex", config.celex)
    .limit(1)
    .single();

  if (existing) {
    console.log(`  ⚠️  pending_document existant [${existing.status}] id:${existing.id} — ignoré.`);
    return;
  }

  // Créer le pending_document
  const now = new Date().toISOString();
  const { data: doc, error: docErr } = await supabase
    .from("pending_documents")
    .insert({
      title: config.regulation,
      celex: config.celex,
      document_type: config.document_type,
      language: config.language,
      country: "eu",
      source_url: config.eurlex_url,
      status: "staged",
      detected_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (docErr || !doc) throw new Error(`pending_document insert: ${docErr?.message}`);
  const documentId = (doc as { id: string }).id;
  console.log(`  pending_document : ${documentId}`);

  // Insérer les staging_chunks
  const stagingChunks = chunks.map((content, i) => ({
    document_id: documentId,
    regulation: config.regulation,
    granularity: "paragraph",
    article_number: null,
    paragraph_number: String(i + 1),
    point_letter: null,
    article_title: null,
    chapter: null,
    parent_chunk_id: null,
    content,
    language: config.language,
    country: "eu",
    text_type: config.text_type,
    source_type: "official",
    source_url: config.eurlex_url,
    eurlex_url: config.eurlex_url,
    publication_date: config.version_date,
    chunk_hash: hash(content),
    validation_status: "pending",
    parsed_at: now,
  }));

  let inserted = 0;
  for (let i = 0; i < stagingChunks.length; i += 50) {
    const batch = stagingChunks.slice(i, i + 50);
    const { error } = await supabase.from("staging_chunks").insert(batch);
    if (error) throw new Error(`staging_chunks insert batch ${i}: ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`\r  staging_chunks insérés : ${inserted}/${stagingChunks.length}`);
  }
  console.log(`\n  ✅ ${inserted} chunks insérés en staging.`);
}

// ─── Entrée principale ────────────────────────────────────────────────────────

void (async () => {
  console.log("=".repeat(70));
  console.log("  ingest-guidelines-staging.ts — EDPB + Commission Guidelines");
  console.log("=".repeat(70));
  console.log(`Mode : ${isDryRun ? "DRY-RUN" : "STAGING"}`);

  const toProcess = docFilter
    ? GUIDELINES.filter(g => g.key === docFilter)
    : GUIDELINES;

  if (toProcess.length === 0) {
    console.error(`Doc inconnu : ${docFilter}. Disponibles : ${GUIDELINES.map(g => g.key).join(", ")}`);
    process.exit(1);
  }

  let total = 0;
  for (const config of toProcess) {
    await ingestGuideline(config);
  }

  console.log("\n" + "=".repeat(70));
  if (isDryRun) {
    console.log("⚠️  DRY-RUN — relancez sans --dry-run pour l'ingestion réelle.");
  } else {
    console.log("✅ Ingestion staging terminée. Validez via /dashboard/admin/rag-validation.");
  }
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
