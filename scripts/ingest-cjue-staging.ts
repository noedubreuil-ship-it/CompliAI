#!/usr/bin/env tsx
/**
 * ingest-cjue-staging.ts — Ingestion staging des arrêts CJUE en paragraphes numérotés
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/ingest-cjue-staging.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/ingest-cjue-staging.ts
 *   npx tsx --env-file=.env.local scripts/ingest-cjue-staging.ts --case=SCHREMS2
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
const caseFilter = process.argv.find(a => a.startsWith("--case="))?.replace("--case=", "").toUpperCase();

interface CjueConfig {
  key: string;
  file: string;
  regulation: string;
  celex: string;
  eurlex_url: string;
  version_date: string;
  description: string;
}

const CASES: CjueConfig[] = [
  {
    key: "BREYER",
    file: "CJUE_BREYER_FR.txt",
    regulation: "CJUE — Arrêt Breyer (C-582/14) — Adresses IP et données personnelles",
    celex: "62014CJ0582",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:62014CJ0582",
    version_date: "2016-10-19",
    description: "C-582/14 — adresses IP dynamiques = données personnelles au sens de la Directive 95/46",
  },
  {
    key: "COSTEJA",
    file: "CJUE_COSTEJA_FR.txt",
    regulation: "CJUE — Arrêt Google Spain (C-131/12) — Droit à l'oubli",
    celex: "62012CJ0131",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:62012CJ0131",
    version_date: "2014-05-13",
    description: "C-131/12 — droit à l'oubli, responsabilité des moteurs de recherche sous la Directive 95/46",
  },
  {
    key: "SCHREMS2",
    file: "CJUE_SCHREMS2_FR.txt",
    regulation: "CJUE — Arrêt Schrems II (C-311/18) — Transferts de données vers les États-Unis",
    celex: "62018CJ0311",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:62018CJ0311",
    version_date: "2020-07-16",
    description: "C-311/18 — invalidation du Privacy Shield, validité des CCT, contrôle des autorités nationales",
  },
];

// ─── Extraction des paragraphes numérotés ────────────────────────────────────

interface Paragraph {
  number: number;
  content: string;
}

function extractParagraphs(text: string): Paragraph[] {
  // Normaliser les sauts de ligne : supprimer les coupures de mots en fin de ligne
  // Format CJUE : "^N Texte..." (numéro seul suivi d'un espace et majuscule/guillemet)
  const lines = text.split("\n");
  const paras: Paragraph[] = [];

  let currentNum: number | null = null;
  let currentLines: string[] = [];

  // Regex : ligne commençant par 1-3 chiffres puis espace puis [A-ZÀ-Ü«"]
  const paraStart = /^(\d{1,3}) ([A-ZÀ-Ü«"']|[A-ZÀ-Ü«"'])/;

  for (const line of lines) {
    const m = line.match(paraStart);
    if (m) {
      const num = parseInt(m[1], 10);
      // Vérifier que c'est un numéro séquentiel plausible (évite les faux positifs)
      if (currentNum === null || num === currentNum + 1 || (num > currentNum && num <= currentNum + 3)) {
        // Sauvegarder le paragraphe précédent
        if (currentNum !== null && currentLines.length > 0) {
          const content = cleanParagraph(currentLines.join(" "));
          if (content.length > 50) {
            paras.push({ number: currentNum, content });
          }
        }
        currentNum = num;
        currentLines = [line.replace(/^\d{1,3} /, "").trim()];
        continue;
      }
    }
    if (currentNum !== null) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        currentLines.push(trimmed);
      }
    }
  }

  // Dernier paragraphe
  if (currentNum !== null && currentLines.length > 0) {
    const content = cleanParagraph(currentLines.join(" "));
    if (content.length > 50) {
      paras.push({ number: currentNum, content });
    }
  }

  return paras;
}

function cleanParagraph(text: string): string {
  return text
    // Réparer les mots coupés par coupure de ligne : "l'" suivi de texte
    .replace(/\s+/g, " ")
    // Supprimer les espaces avant apostrophes (artefact RTF → TXT)
    .replace(/ '([a-zéèêàùûîïœ])/g, "'$1")
    .trim();
}

function hash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").substring(0, 32);
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

async function ingestCase(config: CjueConfig): Promise<void> {
  const filePath = path.join(DATA_DIR, config.file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ Fichier introuvable : ${filePath}`);
    return;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const paragraphs = extractParagraphs(raw);

  console.log(`\n${"─".repeat(70)}`);
  console.log(`  ${config.key} — ${config.regulation}`);
  console.log("─".repeat(70));
  console.log(`  Fichier      : ${config.file}`);
  console.log(`  Paragraphes  : ${paragraphs.length}`);
  if (paragraphs.length > 0) {
    console.log(`  §1  : ${paragraphs[0].content.substring(0, 80)}…`);
    console.log(`  §${paragraphs[paragraphs.length - 1].number} : ${paragraphs[paragraphs.length - 1].content.substring(0, 80)}…`);
  }

  if (isDryRun) {
    console.log("  [DRY-RUN] Aucune écriture.");
    return;
  }

  if (paragraphs.length < 10) {
    console.error(`  ✗ Moins de 10 paragraphes extraits — problème de parsing, abandon.`);
    return;
  }

  // Vérifier si un pending_document existe déjà pour ce CELEX
  const { data: existing } = await supabase
    .from("pending_documents")
    .select("id, status")
    .eq("celex", config.celex)
    .limit(1)
    .single();

  if (existing) {
    console.log(`  ⚠️  pending_document existant (${existing.status}) — ignoré. Supprimez-le manuellement si vous voulez réingérer.`);
    return;
  }

  // Créer le pending_document
  const now = new Date().toISOString();
  const { data: doc, error: docErr } = await supabase
    .from("pending_documents")
    .insert({
      title: config.regulation,
      celex: config.celex,
      document_type: "cjeu_judgment",
      language: "fr",
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
  const chunks = paragraphs.map((p) => {
    const content = `${config.regulation}\n\n§ ${p.number}\n\n${p.content}`;
    return {
      document_id: documentId,
      regulation: config.regulation,
      granularity: "paragraph",
      article_number: null,
      paragraph_number: String(p.number),
      point_letter: null,
      article_title: null,
      chapter: null,
      parent_chunk_id: null,
      content,
      language: "fr",
      country: "eu",
      text_type: "jurisprudence_cjue",
      source_type: "official",
      source_url: config.eurlex_url,
      eurlex_url: config.eurlex_url,
      publication_date: config.version_date,
      chunk_hash: hash(content),
      validation_status: "pending",
      parsed_at: now,
    };
  });

  // Insérer par lots de 50
  let inserted = 0;
  for (let i = 0; i < chunks.length; i += 50) {
    const batch = chunks.slice(i, i + 50);
    const { error } = await supabase.from("staging_chunks").insert(batch);
    if (error) throw new Error(`staging_chunks insert batch ${i}: ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`\r  staging_chunks insérés : ${inserted}/${chunks.length}`);
  }
  console.log(`\n  ✅ ${inserted} chunks insérés en staging.`);
}

// ─── Entrée principale ────────────────────────────────────────────────────────

void (async () => {
  console.log("=".repeat(70));
  console.log("  ingest-cjue-staging.ts — Arrêts CJUE → staging_chunks");
  console.log("=".repeat(70));
  console.log(`Mode : ${isDryRun ? "DRY-RUN" : "STAGING"}`);

  const toProcess = caseFilter
    ? CASES.filter(c => c.key === caseFilter)
    : CASES;

  if (toProcess.length === 0) {
    console.error(`Cas inconnu : ${caseFilter}. Disponibles : ${CASES.map(c => c.key).join(", ")}`);
    process.exit(1);
  }

  for (const config of toProcess) {
    await ingestCase(config);
  }

  console.log("\n" + "=".repeat(70));
  if (isDryRun) {
    console.log("⚠️  DRY-RUN — relancez sans --dry-run pour l'ingestion réelle.");
  } else {
    console.log("✅ Ingestion staging terminée. Validez via /dashboard/admin/rag-validation.");
  }
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
