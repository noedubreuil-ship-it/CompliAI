#!/usr/bin/env tsx
/**
 * rechunk-rgpd.ts — P2 : Re-chunking du RGPD au niveau paragraphe.
 *
 * Opération :
 *   1. Lecture du texte officiel RGPD (scripts/data/GDPR_FR.txt)
 *   2. Découpage en sections (recitals + 11 chapitres)
 *   3. Parsing Claude Sonnet 4.6 par section (1 chunk = 1 paragraphe légal)
 *   4. Validation des chunks combinés
 *   5. Archivage des 118 anciens chunks RGPD dans historical_chunks
 *   6. Suppression des anciens chunks de legal_chunks
 *   7. Génération des embeddings (OpenAI text-embedding-3-small, batches de 100)
 *   8. Insertion dans legal_chunks avec metadata complète (migration 037)
 *   9. Invalidation du cache sémantique Upstash
 *  10. Rapport final
 *
 * Usage :
 *   npx tsx scripts/rechunk-rgpd.ts             # production
 *   npx tsx scripts/rechunk-rgpd.ts --dry-run   # simulation
 *   npx tsx scripts/rechunk-rgpd.ts --parse-only # parse + validation, pas d'insertion
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

// ─── Config ────────────────────────────────────────────────────────────────────

const GDPR_FR_PATH = path.join(__dirname, "data/GDPR_FR.txt");
const REGULATION_NAME = "RGPD (UE 2016/679)";
const EURLEX_URL = "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679";
const CLAUDE_MODEL = "claude-sonnet-4-6";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;
const EMBEDDING_BATCH_SIZE = 100;
const CLAUDE_MAX_TOKENS = 32000;   // par section
const RECITAL_GROUP_SIZE = 25;     // considérants par batch
const MAX_SECTION_CHARS = 22000;   // au-delà, on subdivise par articles
const ARTICLES_PER_SECTION = 1;    // 1 article = 1 appel API (garantit exhaustivité)
const CACHE_THRESHOLD = 0.85;

const dryRun = process.argv.includes("--dry-run");
const parseOnly = process.argv.includes("--parse-only");
const resumeMode = process.argv.includes("--resume");
const providerOpenAI = process.argv.includes("--provider") &&
  process.argv[process.argv.indexOf("--provider") + 1] === "openai";
const CHECKPOINT_FILE = path.join(__dirname, "data/rechunk-rgpd-checkpoint.json");

// ─── Clients ──────────────────────────────────────────────────────────────────

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Variables Supabase manquantes");
  return createClient(url, key);
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY!;
  if (!key) throw new Error("OPENAI_API_KEY manquant");
  return new OpenAI({ apiKey: key });
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY!;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquant");
  return new Anthropic({ apiKey: key });
}

// ─── Checkpoint ───────────────────────────────────────────────────────────────

interface CheckpointData {
  sections: GdprSectionMeta[];
  completedSections: number[];
  allChunks: ParsedChunk[];
  totalInputTokens: number;
  totalOutputTokens: number;
  savedAt: string;
}

interface GdprSectionMeta {
  label: string;
  charCount: number;
}

function saveCheckpoint(
  sections: GdprSection[],
  completedSections: number[],
  allChunks: ParsedChunk[],
  totalInputTokens: number,
  totalOutputTokens: number
): void {
  const data: CheckpointData = {
    sections: sections.map(s => ({ label: s.label, charCount: s.text.length })),
    completedSections,
    allChunks,
    totalInputTokens,
    totalOutputTokens,
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2), "utf8");
}

function loadCheckpoint(): CheckpointData | null {
  if (!fs.existsSync(CHECKPOINT_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedChunk {
  article_number: string | null;
  paragraph_number: string | null;
  point_letter: string | null;
  article_title: string | null;
  chapter: string | null;
  content: string;
}

interface NewLegalChunk {
  regulation: string;
  article_number: string | null;
  paragraph_number: string | null;
  point_letter: string | null;
  article_title: string | null;
  chapter: string | null;
  content: string;
  language: string;
  country: string;
  text_type: string;
  source_method: string;
  eurlex_url: string;
  chunk_hash: string;
  embedding?: number[];
}

// ─── Prompt RGPD paragraphe-niveau ─────────────────────────────────────────

const PARSE_RGPD_PROMPT = `Tu es un juriste expert en droit de l'Union Européenne, spécialisé dans la structuration du RGPD pour un système RAG de conformité juridique.

## Tâche

Tu reçois UNE SECTION du RGPD (Règlement (UE) 2016/679). Tu dois la découper en chunks structurés en respectant STRICTEMENT les règles suivantes.

## Règles de découpage — OBLIGATOIRES

1. **Un chunk = un paragraphe numéroté** : si l'article a §1, §2, §3... chaque § est UN chunk distinct. Ne jamais fusionner deux paragraphes numérotés dans un même chunk.

2. **Énumérations** : si un paragraphe contient des points lettrés (a), b), c)... ou i), ii)..., chaque point est UN chunk distinct. Le préambule du paragraphe (avant le premier point) forme un chunk séparé.

3. **Articles courts** (sans paragraphes numérotés, < 400 mots) : un seul chunk pour l'article entier.

4. **Considérants** : regrouper par thème, 3 à 8 considérants par chunk. Format article_number = "Considérants (X)-(Y)".

5. **Jamais de chunk > 1000 mots** : si un paragraphe dépasse 1000 mots, découpez en sous-sections logiques.

6. **Auto-suffisance** : chaque chunk doit commencer par "Article X — Titre" si le titre n'est pas déjà dans le contenu.

## Format de sortie JSON strict

\`\`\`json
{
  "regulation": "RGPD (UE 2016/679)",
  "celex": "32016R0679",
  "publication_date": "2016-05-04",
  "chunks": [
    {
      "article_number": "22",
      "paragraph_number": "1",
      "point_letter": null,
      "article_title": "Décision individuelle automatisée, y compris le profilage",
      "chapter": "CHAPITRE III — Droits de la personne concernée",
      "content": "Article 22 — Décision individuelle automatisée, y compris le profilage\\n\\n1. La personne concernée a le droit de ne pas faire l'objet d'une décision fondée exclusivement sur un traitement automatisé, y compris le profilage, produisant des effets juridiques la concernant ou l'affectant de manière significative de façon similaire."
    },
    {
      "article_number": "22",
      "paragraph_number": "2",
      "point_letter": null,
      "article_title": "Décision individuelle automatisée, y compris le profilage",
      "chapter": "CHAPITRE III — Droits de la personne concernée",
      "content": "Article 22 — §2 — Exceptions autorisées\\n\\n2. Le paragraphe 1 ne s'applique pas lorsque la décision :\\na) est nécessaire à la conclusion ou à l'exécution d'un contrat entre la personne concernée et un responsable du traitement ;\\nb) est autorisée par le droit de l'Union ou le droit de l'État membre..."
    }
  ]
}
\`\`\`

## Champs obligatoires

- \`article_number\` : numéro de l'article ("22", "9") ou "Considérants (X)-(Y)"
- \`paragraph_number\` : "1", "2"... (null si article entier sans §§)
- \`point_letter\` : "a", "b"... (null si pas de point lettré)
- \`article_title\` : titre officiel (null si absent)
- \`chapter\` : titre du chapitre/section (null si absent)
- \`content\` : texte complet du chunk (≥ 50 caractères)

## Section à traiter

{{SECTION_TEXT}}`;

// ─── Lecture et découpage du GDPR_FR.txt ──────────────────────────────────────

interface GdprSection {
  label: string;
  text: string;
}

function readAndSplitGdpr(): GdprSection[] {
  const raw = fs.readFileSync(GDPR_FR_PATH, "utf8");

  // Supprimer le front-matter YAML (lignes entre --- et ---)
  const withoutFrontMatter = raw.replace(/^---[\s\S]*?---\n/, "");

  const lines = withoutFrontMatter.split("\n");
  const sections: GdprSection[] = [];
  let currentLabel = "Recitals";
  let currentLines: string[] = [];
  let inRecitals = true;

  for (const line of lines) {
    // Détecter les délimiteurs de chapitres
    if (/^CHAPITRE\s+[IVX]+/.test(line.trim())) {
      // Sauvegarder la section précédente
      if (currentLines.length > 0) {
        if (inRecitals) {
          // Découper les considérants en groupes de RECITAL_GROUP_SIZE
          const recitalSections = splitRecitals(currentLines.join("\n"));
          sections.push(...recitalSections);
          inRecitals = false;
        } else {
          sections.push({ label: currentLabel, text: currentLines.join("\n").trim() });
        }
      }
      currentLabel = line.trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  // Dernière section
  if (currentLines.length > 0) {
    sections.push({ label: currentLabel, text: currentLines.join("\n").trim() });
  }

  // Subdiviser TOUS les chapitres article par article (garantit exhaustivité)
  const finalSections: GdprSection[] = [];
  for (const sec of sections) {
    if (!sec.label.startsWith("CHAPITRE")) {
      finalSections.push(sec);
    } else {
      const subSections = splitChapterByArticles(sec);
      finalSections.push(...subSections);
    }
  }

  return finalSections.filter(s => s.text.length > 100);
}

/**
 * Subdivise un chapitre en sections d'un seul article.
 * Garantit que GPT-4.1 traite chaque article intégralement.
 */
function splitChapterByArticles(section: GdprSection): GdprSection[] {
  const lines = section.text.split("\n");
  const articleStarts: { lineIdx: number; artNum: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^Article\s+(\d+)$/) ??
      (lines[i].trim() === "Article premier" ? ["", "1"] : null);
    if (m) {
      articleStarts.push({ lineIdx: i, artNum: parseInt(m[1]) });
    }
  }

  if (articleStarts.length === 0) {
    return [section];
  }

  const subSections: GdprSection[] = [];
  const chapterHeader = lines
    .slice(0, articleStarts[0].lineIdx)
    .join("\n").trim();

  for (let g = 0; g < articleStarts.length; g += ARTICLES_PER_SECTION) {
    const batch = articleStarts.slice(g, g + ARTICLES_PER_SECTION);
    const firstArt = batch[0].artNum;
    const lastArt = batch[batch.length - 1].artNum;
    const startLine = batch[0].lineIdx;
    const endLine = g + ARTICLES_PER_SECTION < articleStarts.length
      ? articleStarts[g + ARTICLES_PER_SECTION].lineIdx
      : lines.length;

    // Inclure l'en-tête du chapitre pour le contexte de Claude/GPT
    const batchText = (chapterHeader ? chapterHeader + "\n\n" : "") +
      lines.slice(startLine, endLine).join("\n").trim();

    subSections.push({
      label: firstArt === lastArt
        ? `${section.label} — Art. ${firstArt}`
        : `${section.label} — Art. ${firstArt}-${lastArt}`,
      text: batchText,
    });
  }

  return subSections;
}

/**
 * Découpe la section des considérants en groupes de RECITAL_GROUP_SIZE.
 * Les considérants sont identifiés par les patterns "(NN)" ou "(NNN)".
 */
function splitRecitals(recitalText: string): GdprSection[] {
  // Trouver tous les débuts de considérant : ligne contenant "(1)" ou "(23)" etc.
  const lines = recitalText.split("\n");
  const recitalGroups: { start: number; num: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    // Le format dans GDPR_FR.txt est "(N)" seul sur sa propre ligne (pas d'espace après)
    const m = lines[i].match(/^\((\d+)\)$/);
    if (m) {
      recitalGroups.push({ start: i, num: parseInt(m[1]) });
    }
  }

  if (recitalGroups.length === 0) {
    // Pas de considérants détectés — retourner en bloc
    return [{ label: "Recitals", text: recitalText.trim() }];
  }

  const sections: GdprSection[] = [];
  const groupSize = RECITAL_GROUP_SIZE;

  for (let g = 0; g < recitalGroups.length; g += groupSize) {
    const batchGroups = recitalGroups.slice(g, g + groupSize);
    const firstNum = batchGroups[0].num;
    const lastNum = batchGroups[batchGroups.length - 1].num;

    // Lignes de ce batch
    const startLine = batchGroups[0].start;
    const endLine = g + groupSize < recitalGroups.length
      ? recitalGroups[g + groupSize].start
      : lines.length;

    const batchText = lines.slice(startLine, endLine).join("\n").trim();
    sections.push({
      label: `Considérants (${firstNum})-(${lastNum})`,
      text: batchText,
    });
  }

  return sections;
}

// ─── Appel Claude par section ──────────────────────────────────────────────────

async function parseSectionClaude(
  claude: Anthropic,
  prompt: string,
  sectionLabel: string
): Promise<{ rawText: string; inputTokens: number; outputTokens: number }> {
  // Utiliser le streaming (requis par l'API Anthropic pour max_tokens élevé)
  const stream = await claude.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const resp = await stream.finalMessage();
  const block = resp.content[0];
  if (!block || block.type !== "text") {
    throw new Error(`Section "${sectionLabel}" : Claude n'a pas retourné de bloc texte`);
  }

  return {
    rawText: block.text,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
  };
}

async function parseSectionOpenAI(
  openai: OpenAI,
  prompt: string,
  sectionLabel: string
): Promise<{ rawText: string; inputTokens: number; outputTokens: number }> {
  const resp = await openai.chat.completions.create({
    model: OPENAI_PARSE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Tu es un juriste expert en RGPD. Tu réponds UNIQUEMENT en JSON valide, sans markdown.",
      },
      { role: "user", content: prompt },
    ],
  });

  const choice = resp.choices[0];
  if (!choice?.message?.content) {
    throw new Error(`Section "${sectionLabel}" : GPT-4.1 n'a pas retourné de contenu`);
  }

  return {
    rawText: choice.message.content,
    inputTokens: resp.usage?.prompt_tokens ?? 0,
    outputTokens: resp.usage?.completion_tokens ?? 0,
  };
}

async function parseSection(
  claude: Anthropic,
  openai: OpenAI,
  section: GdprSection,
  sectionIdx: number,
  totalSections: number
): Promise<{ chunks: ParsedChunk[]; inputTokens: number; outputTokens: number }> {
  const prompt = PARSE_RGPD_PROMPT.replace("{{SECTION_TEXT}}", section.text);
  const provider = providerOpenAI ? "GPT-4.1" : "Claude";

  console.log(`\n  [${provider} ${sectionIdx + 1}/${totalSections}] "${section.label}" (${section.text.length.toLocaleString()} chars)`);

  let rawTextResult: { rawText: string; inputTokens: number; outputTokens: number };
  if (providerOpenAI) {
    rawTextResult = await parseSectionOpenAI(openai, prompt, section.label);
  } else {
    rawTextResult = await parseSectionClaude(claude, prompt, section.label);
  }

  const { inputTokens, outputTokens } = rawTextResult;

  // Extraire le JSON (peut être enveloppé dans ```json ... ```)
  const rawText = rawTextResult.rawText
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim();

  let parsed: { chunks: ParsedChunk[] };
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    throw new Error(`Section "${section.label}" : JSON invalide — ${String(e)}\n${rawText.slice(0, 500)}`);
  }

  if (!Array.isArray(parsed.chunks)) {
    throw new Error(`Section "${section.label}" : champ "chunks" absent ou non-array`);
  }

  const validChunks = parsed.chunks.filter(c =>
    c.content && c.content.trim().length >= 50
  );

  console.log(`     → ${validChunks.length} chunks valides (${inputTokens} in / ${outputTokens} out tokens)`);
  return { chunks: validChunks, inputTokens, outputTokens };
}

// ─── Compute chunk hash ───────────────────────────────────────────────────────

function chunkHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

// ─── Generate embeddings ──────────────────────────────────────────────────────

async function generateEmbeddings(
  openai: OpenAI,
  texts: string[]
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    process.stdout.write(`   Embeddings batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}/${Math.ceil(texts.length / EMBEDDING_BATCH_SIZE)}... `);

    const resp = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIM,
    });

    for (const item of resp.data) {
      allEmbeddings.push(item.embedding);
    }
    console.log(`✓ (${batch.length})`);

    // Throttle entre batches
    if (i + EMBEDDING_BATCH_SIZE < texts.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return allEmbeddings;
}

// ─── Archive old RGPD chunks ──────────────────────────────────────────────────

async function archiveOldRgpdChunks(sb: ReturnType<typeof createClient>): Promise<{
  archived: number;
  ids: string[];
}> {
  // 1. Récupérer tous les chunks RGPD (avec embeddings pour préservation)
  const { data: oldChunks, error } = await (sb as any)
    .from("legal_chunks")
    .select("id, regulation, article_number, content, embedding, chunk_hash, version_date")
    .eq("regulation", REGULATION_NAME);

  if (error) throw new Error(`Récupération anciens chunks RGPD : ${error.message}`);
  if (!oldChunks || oldChunks.length === 0) return { archived: 0, ids: [] };

  console.log(`\n  Archivage de ${oldChunks.length} anciens chunks RGPD...`);

  const archivedIds: string[] = [];

  // 2. Insérer dans historical_chunks par batch de 50
  const BATCH = 50;
  for (let i = 0; i < oldChunks.length; i += BATCH) {
    const batch = oldChunks.slice(i, i + BATCH);
    const rows = batch.map((c: any) => ({
      original_chunk_id: c.id,
      regulation: c.regulation,
      article_number: c.article_number,
      content: c.content,
      embedding: c.embedding,      // embeddings préservés pour rollback possible
      chunk_hash: c.chunk_hash,
      version_date: c.version_date,
      archive_reason: "rechunking_paragraph_level",
      superseded_by: null,
      archived_at: new Date().toISOString(),
    }));

    const { error: archErr } = await (sb as any)
      .from("historical_chunks")
      .insert(rows);

    if (archErr) throw new Error(`Archivage batch ${i / BATCH} : ${archErr.message}`);
    archivedIds.push(...batch.map((c: any) => c.id));
  }

  return { archived: oldChunks.length, ids: archivedIds };
}

// ─── Delete old RGPD chunks ───────────────────────────────────────────────────

async function deleteOldRgpdChunks(sb: ReturnType<typeof createClient>, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await (sb as any)
    .from("legal_chunks")
    .delete()
    .in("id", ids);
  if (error) throw new Error(`Suppression anciens chunks : ${error.message}`);
}

// ─── Insert new chunks ────────────────────────────────────────────────────────

async function insertNewChunks(
  sb: ReturnType<typeof createClient>,
  chunks: NewLegalChunk[]
): Promise<void> {
  const BATCH = 50;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const rows = batch.map(c => ({
      regulation: c.regulation,
      article_number: c.article_number,
      paragraph_number: c.paragraph_number,
      point_letter: c.point_letter,
      article_title: c.article_title,
      chapter: c.chapter,
      content: c.content,
      embedding: c.embedding,
      language: c.language,
      country: c.country,
      text_type: c.text_type,
      source_method: c.source_method,
      eurlex_url: c.eurlex_url,
      chunk_hash: c.chunk_hash,
      version_date: "2016-05-04",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await (sb as any)
      .from("legal_chunks")
      .insert(rows);

    if (error) throw new Error(`Insertion batch ${i / BATCH} : ${error.message}`);
    process.stdout.write(`   Inseré batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(chunks.length / BATCH)}... ✓\n`);
  }
}

// ─── Semantic cache invalidation ──────────────────────────────────────────────

async function invalidateCache(embeddings: number[][]): Promise<{ scanned: number; invalidated: number }> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    console.log("  Cache Upstash : variables manquantes — skip invalidation");
    return { scanned: 0, invalidated: 0 };
  }

  const headers = { Authorization: `Bearer ${redisToken}` };

  // 1. Récupérer l'index des SHAs
  const shasResp = await fetch(`${redisUrl}/smembers/sc%3Aidx`, { headers, cache: "no-store" });
  if (!shasResp.ok) return { scanned: 0, invalidated: 0 };
  const { result: shas }: { result: string[] } = await shasResp.json();
  if (!shas || shas.length === 0) return { scanned: 0, invalidated: 0 };

  let invalidated = 0;

  for (const sha of shas) {
    const embResp = await fetch(`${redisUrl}/get/sc%3Aemb%3A${sha}`, { headers, cache: "no-store" });
    if (!embResp.ok) continue;
    const { result: raw }: { result: string | null } = await embResp.json();
    if (!raw) continue;

    let cachedEmb: number[];
    try { cachedEmb = JSON.parse(raw).embedding; }
    catch { continue; }

    // Cosinus similarity
    const shouldInvalidate = embeddings.some(newEmb => {
      const dot = newEmb.reduce((s, v, i) => s + v * (cachedEmb[i] ?? 0), 0);
      const magNew = Math.sqrt(newEmb.reduce((s, v) => s + v * v, 0));
      const magCached = Math.sqrt(cachedEmb.reduce((s, v) => s + v * v, 0));
      return magNew > 0 && magCached > 0 && dot / (magNew * magCached) >= CACHE_THRESHOLD;
    });

    if (shouldInvalidate && !dryRun) {
      await fetch(`${redisUrl}/del/sc%3Aemb%3A${sha}/sc%3Aresp%3A${sha}`, { method: "POST", headers });
      await fetch(`${redisUrl}/srem/sc%3Aidx/${sha}`, { method: "POST", headers });
      invalidated++;
    } else if (shouldInvalidate) {
      invalidated++;  // compte sans supprimer en dry-run
    }
  }

  return { scanned: shas.length, invalidated };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  CompliAI — P2 : Re-chunking RGPD niveau paragraphe");
  console.log("=".repeat(60));
  const activeModel = providerOpenAI ? `${OPENAI_PARSE_MODEL} (OpenAI)` : `${CLAUDE_MODEL} (Anthropic)`;
  console.log(`Mode      : ${dryRun ? "DRY-RUN (simulation)" : parseOnly ? "PARSE-ONLY" : "PRODUCTION"}${resumeMode ? " + RESUME" : ""}`);
  console.log(`Source    : ${GDPR_FR_PATH}`);
  console.log(`Modèle LM : ${activeModel} (max_tokens ${CLAUDE_MAX_TOKENS} par section)`);
  console.log(`Embedding : ${EMBEDDING_MODEL}`);
  console.log();

  if (!fs.existsSync(GDPR_FR_PATH)) {
    throw new Error(`Fichier source introuvable : ${GDPR_FR_PATH}`);
  }

  // ─── 1. Lecture et découpage ────────────────────────────────────────────────

  console.log("ÉTAPE 1 : Lecture et découpage du RGPD...");
  const sections = readAndSplitGdpr();
  const totalChars = sections.reduce((s, sec) => s + sec.text.length, 0);
  console.log(`  ${sections.length} sections identifiées (${totalChars.toLocaleString()} chars total)`);
  sections.forEach((s, i) => console.log(`  [${i + 1}] ${s.label} (${s.text.length.toLocaleString()} chars)`));

  // ─── 2. Parsing Claude par section ─────────────────────────────────────────

  const providerLabel = providerOpenAI ? "GPT-4.1 (OpenAI)" : "Claude Sonnet 4.6 (Anthropic)";
  console.log(`\nÉTAPE 2 : Parsing ${providerLabel} (1 chunk = 1 paragraphe légal)...`);
  const claude = getAnthropic();
  const openai = getOpenAI();
  const allParsedChunks: ParsedChunk[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const completedSections: number[] = [];

  // Charger le checkpoint si --resume
  let checkpoint: CheckpointData | null = null;
  if (resumeMode) {
    checkpoint = loadCheckpoint();
    if (checkpoint) {
      console.log(`  [RESUME] Checkpoint trouvé (${checkpoint.savedAt})`);
      console.log(`  [RESUME] ${checkpoint.completedSections.length}/${sections.length} sections déjà parsées`);
      allParsedChunks.push(...checkpoint.allChunks);
      totalInputTokens = checkpoint.totalInputTokens;
      totalOutputTokens = checkpoint.totalOutputTokens;
      completedSections.push(...checkpoint.completedSections);
    } else {
      console.log("  [RESUME] Aucun checkpoint trouvé — démarrage depuis le début");
    }
  }

  for (let i = 0; i < sections.length; i++) {
    // Sauter les sections déjà parsées
    if (completedSections.includes(i)) {
      console.log(`\n  [Claude ${i + 1}/${sections.length}] "${sections[i].label}" — DÉJÀ PARSÉ (checkpoint)`);
      continue;
    }

    const { chunks, inputTokens, outputTokens } = await parseSection(claude, openai, sections[i], i, sections.length);
    allParsedChunks.push(...chunks);
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    completedSections.push(i);

    // Sauvegarder le checkpoint après chaque section
    saveCheckpoint(sections, completedSections, allParsedChunks, totalInputTokens, totalOutputTokens);

    // Throttle entre appels
    if (i < sections.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  // Claude: $3/M in, $15/M out — GPT-4.1: $2/M in, $8/M out
  const parseCost = providerOpenAI
    ? totalInputTokens / 1e6 * 2 + totalOutputTokens / 1e6 * 8
    : totalInputTokens / 1e6 * 3 + totalOutputTokens / 1e6 * 15;
  const providerLabel2 = providerOpenAI ? "GPT-4.1" : "Claude";
  console.log(`\n  Parsing terminé : ${allParsedChunks.length} chunks`);
  console.log(`  Tokens : ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`);
  console.log(`  Coût ${providerLabel2} estimé : $${parseCost.toFixed(4)}`);

  // ─── 3. Validation ─────────────────────────────────────────────────────────

  console.log("\nÉTAPE 3 : Validation des chunks...");
  const seen = new Set<string>();
  const deduped: ParsedChunk[] = [];
  let duplicates = 0;

  for (const chunk of allParsedChunks) {
    if (!chunk.content || chunk.content.trim().length < 50) continue;
    const h = chunkHash(chunk.content);
    if (seen.has(h)) { duplicates++; continue; }
    seen.add(h);
    deduped.push(chunk);
  }

  console.log(`  Chunks bruts : ${allParsedChunks.length}`);
  console.log(`  Doublons supprimés : ${duplicates}`);
  console.log(`  Chunks validés : ${deduped.length}`);

  if (deduped.length < 50) {
    throw new Error(`Nombre de chunks insuffisant (${deduped.length}) — vérifiez le parsing`);
  }

  // Distribution par type
  const byArt: Record<string, number> = {};
  for (const c of deduped) {
    const key = c.article_number?.split("_")[0] ?? "?";
    byArt[key] = (byArt[key] || 0) + 1;
  }
  const multiParagraph = Object.entries(byArt)
    .filter(([k, n]) => n > 1 && !k.startsWith("Considér"));
  console.log(`\n  Articles avec plusieurs chunks (échantillon) :`);
  multiParagraph.slice(0, 15).forEach(([a, n]) => console.log(`    Art. ${a} : ${n} chunks`));
  if (multiParagraph.length > 15) {
    console.log(`    ... et ${multiParagraph.length - 15} autres articles`);
  }

  if (parseOnly) {
    console.log("\n[PARSE-ONLY] Arrêt avant insertion. Parsing réussi.");
    return;
  }

  // ─── 4. Préparation des chunks production ──────────────────────────────────

  const newChunks: NewLegalChunk[] = deduped.map(c => ({
    regulation: REGULATION_NAME,
    article_number: c.article_number,
    paragraph_number: c.paragraph_number,
    point_letter: c.point_letter,
    article_title: c.article_title,
    chapter: c.chapter,
    content: c.content.trim(),
    language: "fr",
    country: "EU",
    text_type: "reglement_ue",
    source_method: "automated_pipeline",
    eurlex_url: EURLEX_URL,
    chunk_hash: chunkHash(c.content),
  }));

  if (dryRun) {
    console.log("\n[DRY-RUN] Arrêt avant écriture en base. Résumé :");
    console.log(`  Anciens chunks RGPD à archiver : 118 (estimé)`);
    console.log(`  Nouveaux chunks à insérer : ${newChunks.length}`);
    return;
  }

  const sb = getSb();

  // ─── 5. Archivage anciens chunks ────────────────────────────────────────────

  console.log("\nÉTAPE 4 : Archivage des anciens chunks RGPD...");
  const { archived, ids: oldIds } = await archiveOldRgpdChunks(sb);
  console.log(`  ✅ ${archived} anciens chunks archivés dans historical_chunks`);

  // ─── 6. Génération des embeddings ──────────────────────────────────────────

  console.log("\nÉTAPE 5 : Génération des embeddings OpenAI...");
  const texts = newChunks.map(c => c.content);
  const embeddings = await generateEmbeddings(openai, texts);

  const embCost = texts.length * 0.00002 / 1000; // text-embedding-3-small: $0.02/1M tokens, ~1000 tokens/chunk
  console.log(`  ✅ ${embeddings.length} embeddings générés`);
  console.log(`  Coût OpenAI estimé : $${(embCost * 1000).toFixed(4)}`);

  for (let i = 0; i < newChunks.length; i++) {
    newChunks[i].embedding = embeddings[i];
  }

  // ─── 7. Suppression anciens chunks ─────────────────────────────────────────

  console.log("\nÉTAPE 6 : Suppression anciens chunks RGPD de legal_chunks...");
  await deleteOldRgpdChunks(sb, oldIds);
  console.log(`  ✅ ${oldIds.length} anciens chunks supprimés`);

  // ─── 8. Insertion nouveaux chunks ──────────────────────────────────────────

  console.log("\nÉTAPE 7 : Insertion des nouveaux chunks dans legal_chunks...");
  await insertNewChunks(sb, newChunks);
  console.log(`  ✅ ${newChunks.length} nouveaux chunks insérés`);

  // ─── 9. Invalidation cache ─────────────────────────────────────────────────

  console.log("\nÉTAPE 8 : Invalidation du cache sémantique...");
  const cacheResult = await invalidateCache(embeddings);
  if (cacheResult.scanned === 0) {
    console.log("  ℹ️  Cache vide ou inaccessible — aucune entrée à invalider");
  } else {
    console.log(`  ✅ ${cacheResult.invalidated}/${cacheResult.scanned} entrées cache invalidées`);
  }

  // ─── 10. Rapport final ──────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(60));
  console.log("  P2 TERMINÉ");
  console.log("=".repeat(60));
  console.log(`Anciens chunks archivés     : ${archived}`);
  console.log(`Anciens chunks supprimés    : ${oldIds.length}`);
  console.log(`Nouveaux chunks insérés     : ${newChunks.length}`);
  console.log(`Sections parsées            : ${sections.length}`);
  console.log(`Tokens Claude               : ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`);
  console.log(`Coût ${providerOpenAI ? "GPT-4.1" : "Claude"} estimé          : $${parseCost.toFixed(4)}`);
  console.log(`Entrées cache invalidées    : ${cacheResult.invalidated}`);
  console.log();

  // Distribution finale
  const artWithMulti = Object.entries(byArt).filter(([,n]) => n > 1).length;
  const artWithSingle = Object.entries(byArt).filter(([,n]) => n === 1).length;
  console.log(`Articles avec 1 chunk       : ${artWithSingle}`);
  console.log(`Articles avec plusieurs §§  : ${artWithMulti}`);
  console.log();
  console.log("Prochaine étape : vérifier Q06 (Art.22), Q08 (Art.45), Q13 (Art.9)");
  console.log("Puis relancer : npx tsx scripts/generate-rag-baseline.ts");
}

main().catch(err => {
  console.error("\n❌ ERREUR FATALE:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
