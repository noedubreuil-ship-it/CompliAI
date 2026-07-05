#!/usr/bin/env tsx
/**
 * rechunk-eidas2.ts — Chunking initial eIDAS 2 (texte consolidé) vers staging_chunks.
 *
 * Source : scripts/data/EIDAS2_CONSOLIDE_FR.txt
 *   CELEX 02014R0910-20240520 — Règlement (UE) 910/2014 modifié par 2024/1183
 *   Texte consolidé EUR-Lex en français.
 *
 * Opération :
 *   1. Lecture et nettoyage du texte (suppression marqueurs EUR-Lex ►B/►M1/▼B/▼M1)
 *   2. Extraction des articles (Article premier → Article 52 + variants bis/ter/...)
 *   3. Extraction des annexes (ANNEXE I → ANNEXE VII)
 *   4. Création d'une entrée pending_documents en staging DB
 *   5. Parsing Claude Sonnet 4.6 pour chaque article → chunks paragraph + point
 *   6. Chunks annexe (1 par annexe, granularity='annexe')
 *   7. Insertion dans staging_chunks (pas de légal_chunks direct)
 *   8. Rapport final staging
 *
 * IMPORTANT :
 *   - Target : staging_chunks UNIQUEMENT
 *   - Aucun embedding généré ici (rôle du production-indexer lors de la promotion)
 *   - Aucune modification de legal_chunks sans validation admin
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/rechunk-eidas2.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/rechunk-eidas2.ts
 *
 * Règles non-négociables (CLAUDE.md) :
 *   - Claude Sonnet 4.6 exclusivement pour le parsing
 *   - Staging avant production obligatoire
 *   - Validation admin via /dashboard/admin/rag-validation avant promotion
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ─── Config ────────────────────────────────────────────────────────────────────

const SOURCE_PATH = path.join(__dirname, "data/EIDAS2_CONSOLIDE_FR.txt");
const REGULATION_NAME = "eIDAS 2 — Identité numérique (UE 910/2014 mod. 2024/1183)";
const CELEX = "02014R0910-20240520";
const EURLEX_URL =
  "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02014R0910-20240520";
const VERSION_DATE = "2024-05-20";
const LANGUAGE = "fr";
const COUNTRY = "EU";
const TEXT_TYPE = "reglement_ue";
const SOURCE_TYPE = "eurlex";
const CLAUDE_MODEL = "claude-sonnet-4-6";
const CLAUDE_MAX_TOKENS = 16000;
const THROTTLE_MS = 2500;

const dryRun = process.argv.includes("--dry-run");

// ─── Clients ──────────────────────────────────────────────────────────────────

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Variables Supabase manquantes (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key);
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquant");
  return new Anthropic({ apiKey: key });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EidasArticle {
  article_number: string;
  article_title: string | null;
  chapter: string | null;
  section: string | null;
  content: string;
}

interface EidasAnnexe {
  annexe_number: string; // "I", "II", etc.
  annexe_title: string | null;
  content: string;
}

interface ParsedChunk {
  article_number: string | null;
  paragraph_number: string | null;
  point_letter: string | null;
  article_title: string | null;
  chapter: string | null;
  content: string;
  granularity: "paragraph" | "point";
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
  granularity: "article" | "paragraph" | "point" | "annexe";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunkHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Nettoie le texte EUR-Lex consolidé :
 * - Supprime les numéros de page (02014R0910 — FR — ...)
 * - Supprime les lignes de marqueurs EUR-Lex (►B, ►M1, ▼B, ▼M1 seules sur une ligne)
 * - Supprime les marqueurs inline en début de ligne
 */
function cleanEurLexMarkup(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      // Supprimer les numéros de page EUR-Lex
      if (/^02014R0910 — FR — /.test(t)) return false;
      // Supprimer les lignes qui ne sont que des marqueurs de version
      if (/^[►▼][BM]\d*\s*$/.test(t)) return false;
      return true;
    })
    .map((line) => {
      // Supprimer les marqueurs EUR-Lex en début de ligne (ex: "►M1 i) les informations...")
      return line.replace(/^[►▼][BM]\d*\s+/, "").replace(/[►▼][BM]\d*/g, "");
    })
    .join("\n");
}

// ─── Extraction des articles ───────────────────────────────────────────────────

/**
 * Extrait tous les articles du texte eIDAS 2 consolidé.
 * Gère les variantes : Article premier, Article 2, Article 5 bis, Article 45 terdecies...
 */
function extractArticles(rawText: string): EidasArticle[] {
  // Supprimer le front-matter YAML
  const text = rawText.replace(/^---[\s\S]*?---\n/, "");
  const cleaned = cleanEurLexMarkup(text);
  const lines = cleaned.split("\n");

  // Regex pour détecter un début d'article (avec variantes latines)
  const ARTICLE_RE =
    /^Article\s+(premier|\d+(?:\s+(?:bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies|undecies|duodecies|terdecies))?)$/;

  // Trouver la première annexe (on s'arrête là)
  let firstAnnexeLine = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^ANNEXE\s+[IVX]+$/.test(lines[i].trim())) {
      firstAnnexeLine = i;
      break;
    }
  }

  // Construire la map chapitre/section courant
  type SectionState = { chapter: string | null; section: string | null };
  const sectionAtLine: SectionState[] = new Array(lines.length).fill(null);
  let currentChapter: string | null = null;
  let currentSection: string | null = null;

  for (let i = 0; i < firstAnnexeLine; i++) {
    const t = lines[i].trim();
    if (/^CHAPITRE\s/.test(t)) {
      const num = t.replace(/^CHAPITRE\s+/, "").trim();
      // Titre du chapitre sur la ligne suivante non vide
      let chapTitle = "";
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nxt = lines[j].trim();
        if (nxt && !/^CHAPITRE|^SECTION|^ANNEXE/.test(nxt)) {
          chapTitle = nxt;
          break;
        }
      }
      currentChapter = chapTitle ? `CHAPITRE ${num} — ${chapTitle}` : `CHAPITRE ${num}`;
      currentSection = null;
    } else if (/^SECTION\s/.test(t)) {
      const num = t.replace(/^SECTION\s+/, "").trim();
      let sectTitle = "";
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nxt = lines[j].trim();
        if (nxt && !/^CHAPITRE|^SECTION|^ANNEXE|^Article/.test(nxt)) {
          sectTitle = nxt;
          break;
        }
      }
      currentSection = sectTitle ? `SECTION ${num} — ${sectTitle}` : `SECTION ${num}`;
    }
    sectionAtLine[i] = { chapter: currentChapter, section: currentSection };
  }

  // Détecter les débuts d'articles
  const articleStarts: { lineIdx: number; artRaw: string }[] = [];
  for (let i = 0; i < firstAnnexeLine; i++) {
    const t = lines[i].trim();
    const m = t.match(ARTICLE_RE);
    if (m) {
      articleStarts.push({ lineIdx: i, artRaw: m[1] });
    }
  }

  console.log(`   ${articleStarts.length} articles détectés dans le texte`);

  const articles: EidasArticle[] = [];

  for (let s = 0; s < articleStarts.length; s++) {
    const { lineIdx, artRaw } = articleStarts[s];
    const endLine =
      s + 1 < articleStarts.length ? articleStarts[s + 1].lineIdx : firstAnnexeLine;

    const blockLines = lines.slice(lineIdx, endLine);
    const content = blockLines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (content.length < 20) continue;

    // Titre : première ligne non vide après "Article N"
    let title: string | null = null;
    for (let j = 1; j < blockLines.length; j++) {
      const line = blockLines[j].trim();
      if (!line) continue;
      // Une ligne qui commence par un chiffre ou une lettre suivie de ) est du contenu, pas un titre
      if (/^\d+\./.test(line) || /^[a-z]\)/.test(line)) break;
      if (/^CHAPITRE|^SECTION|^ANNEXE|^Article/.test(line)) break;
      title = line;
      break;
    }

    const sec = sectionAtLine[lineIdx];

    articles.push({
      article_number: artRaw === "premier" ? "1" : artRaw,
      article_title: title,
      chapter: sec?.chapter ?? null,
      section: sec?.section ?? null,
      content,
    });
  }

  return articles;
}

// ─── Extraction des annexes ────────────────────────────────────────────────────

function extractAnnexes(rawText: string): EidasAnnexe[] {
  const text = rawText.replace(/^---[\s\S]*?---\n/, "");
  const cleaned = cleanEurLexMarkup(text);
  const lines = cleaned.split("\n");

  const ANNEXE_RE = /^ANNEXE\s+([IVX]+)$/;

  // Détecter les débuts d'annexes
  const annexeStarts: { lineIdx: number; num: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(ANNEXE_RE);
    if (m) {
      annexeStarts.push({ lineIdx: i, num: m[1] });
    }
  }

  const annexes: EidasAnnexe[] = [];

  for (let s = 0; s < annexeStarts.length; s++) {
    const { lineIdx, num } = annexeStarts[s];
    const endLine =
      s + 1 < annexeStarts.length ? annexeStarts[s + 1].lineIdx : lines.length;

    const blockLines = lines.slice(lineIdx, endLine);
    const content = blockLines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (content.length < 20) continue;

    // Titre de l'annexe : ligne non vide après "ANNEXE X"
    let title: string | null = null;
    for (let j = 1; j < blockLines.length; j++) {
      const line = blockLines[j].trim();
      if (!line) continue;
      title = line;
      break;
    }

    annexes.push({ annexe_number: num, annexe_title: title, content });
  }

  return annexes;
}

// ─── Prompt Claude ─────────────────────────────────────────────────────────────

const PARSE_EIDAS_PROMPT = `Tu es un juriste expert en droit européen de l'identité numérique, spécialisé dans le Règlement (UE) 910/2014 modifié par le Règlement (UE) 2024/1183 (eIDAS 2).

## Tâche

Tu reçois UN ARTICLE du règlement eIDAS 2 (texte consolidé EUR-Lex). Tu dois le découper en chunks structurés en respectant STRICTEMENT les règles suivantes.

## Règles de découpage — OBLIGATOIRES

1. **Un chunk paragraph = un paragraphe numéroté** : si l'article a §1, §2, §3... chaque § est UN chunk distinct (granularity="paragraph"). Ne jamais fusionner deux §§.

2. **Un chunk point = un point lettré** : si un paragraphe contient des points a), b), c)..., chaque point est UN chunk distinct (granularity="point"). Le préambule du paragraphe (avant le premier point) forme un chunk paragraph séparé.

3. **Articles courts** (sans §§ numérotés, < 400 mots) : un seul chunk paragraph pour l'article entier.

4. **Numérotation** :
   - paragraph_number : "1", "2", "3"... (toujours une string, jamais null)
   - point_letter : "a", "b", "c"... (string minuscule sans parenthèse)
   - Pour un article court sans §§ : paragraph_number = "1", point_letter = null

5. **Contenu** : reproduction EXACTE du texte de l'article, sans reformulation. Inclure le titre de l'article dans le premier chunk paragraph.

6. **Marqueurs EUR-Lex** : ignorer les marqueurs ►B, ►M1, ▼B, ▼M1 — ils ne font pas partie du texte normatif.

## Format de sortie — JSON STRICT

\`\`\`json
[
  {
    "paragraph_number": "1",
    "point_letter": null,
    "content": "Article 5 bis\\nPortefeuilles européens d'identité numérique\\n1. Chaque État membre délivre, dans un délai de vingt-quatre mois...",
    "granularity": "paragraph"
  },
  {
    "paragraph_number": "1",
    "point_letter": "a",
    "content": "a) être accessibles à toutes les personnes physiques et morales qui souhaitent utiliser le portefeuille...",
    "granularity": "point"
  }
]
\`\`\`

IMPORTANT : répondre UNIQUEMENT avec le JSON, sans texte avant ou après, sans blocs markdown.`;

// ─── Parsing Claude ────────────────────────────────────────────────────────────

interface ParseResult {
  chunks: ParsedChunk[];
  inputTokens: number;
  outputTokens: number;
}

async function parseArticleWithClaude(
  anthropic: Anthropic,
  article: EidasArticle
): Promise<ParseResult> {
  const userMsg = `Voici l'article à découper en chunks :\n\n${article.content}`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    temperature: 0,
    system: PARSE_EIDAS_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    // Tentative nettoyage markdown
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      raw = JSON.parse(jsonMatch[1].trim());
    } else {
      throw new Error(`JSON invalide reçu de Claude pour Art.${article.article_number}: ${text.slice(0, 200)}`);
    }
  }

  if (!Array.isArray(raw)) {
    throw new Error(`Réponse Claude non-array pour Art.${article.article_number}`);
  }

  const chunks: ParsedChunk[] = (raw as Array<Record<string, unknown>>).map((c) => ({
    article_number: article.article_number,
    paragraph_number: (c.paragraph_number as string | null) ?? null,
    point_letter: (c.point_letter as string | null) ?? null,
    article_title: article.article_title,
    chapter: article.chapter ?? article.section ?? null,
    content: String(c.content ?? "").trim(),
    granularity: (c.granularity as "paragraph" | "point") ?? "paragraph",
  }));

  return {
    chunks: chunks.filter((c) => c.content.length > 10),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ─── pending_documents ────────────────────────────────────────────────────────

async function ensurePendingDocument(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: ReturnType<typeof createClient<any>>,
  dryRun: boolean
): Promise<string> {
  // Cherche par CELEX (unique dans pending_documents)
  const { data: existing } = await sb
    .from("pending_documents")
    .select("id, status")
    .eq("celex", CELEX)
    .maybeSingle();

  if (existing) {
    console.log(`   Document existant trouvé : ${existing.id} (status: ${existing.status})`);
    if (existing.status !== "pending") {
      console.log(`   ⚠️  Status non-pending — réinitialisation à 'pending'`);
      if (!dryRun) {
        await sb
          .from("pending_documents")
          .update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
    }
    return existing.id;
  }

  if (dryRun) {
    const fakeId = crypto.randomUUID();
    console.log(`   [DRY-RUN] pending_document créé (fake id: ${fakeId})`);
    return fakeId;
  }

  const { data: inserted, error } = await sb
    .from("pending_documents")
    .insert({
      celex: CELEX,
      title: REGULATION_NAME,
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

  if (error || !inserted) {
    throw new Error(`Impossible de créer pending_document : ${error?.message}`);
  }

  console.log(`   Nouveau pending_document créé : ${inserted.id}`);
  return inserted.id;
}

// ─── Insertion staging_chunks ─────────────────────────────────────────────────

async function clearStagingChunks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: ReturnType<typeof createClient<any>>,
  documentId: string,
  dryRun: boolean
): Promise<number> {
  const { count } = await sb
    .from("staging_chunks")
    .select("*", { count: "exact", head: true })
    .eq("document_id", documentId);

  const existing = count ?? 0;
  if (existing > 0) {
    console.log(`   ${existing} staging_chunks existants pour ce document → suppression`);
    if (!dryRun) {
      await sb.from("staging_chunks").delete().eq("document_id", documentId);
    }
  }
  return existing;
}

async function insertStagingChunks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: ReturnType<typeof createClient<any>>,
  chunks: StagingChunkInsert[],
  dryRun: boolean
): Promise<{ inserted: number; errors: string[] }> {
  if (dryRun) {
    return { inserted: chunks.length, errors: [] };
  }

  const BATCH = 100;
  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const { error } = await sb.from("staging_chunks").insert(batch);
    if (error) {
      errors.push(`Batch ${Math.floor(i / BATCH) + 1} : ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

// ─── Assemblage des chunks finaux ─────────────────────────────────────────────

function buildArticleStagingChunks(
  documentId: string,
  article: EidasArticle,
  children: ParsedChunk[]
): StagingChunkInsert[] {
  const now = new Date().toISOString();
  const result: StagingChunkInsert[] = [];

  // Chunk parent : article entier
  const parentHash = chunkHash(`${REGULATION_NAME}|${article.article_number}|article|${article.content}`);
  const parentId = crypto.randomUUID();

  result.push({
    id: parentId,
    document_id: documentId,
    regulation: REGULATION_NAME,
    article_number: article.article_number,
    paragraph_number: null,
    point_letter: null,
    article_title: article.article_title,
    chapter: article.chapter ?? article.section ?? null,
    granularity: "article",
    parent_chunk_id: null,
    content: article.content,
    language: LANGUAGE,
    country: COUNTRY,
    text_type: TEXT_TYPE,
    source_type: SOURCE_TYPE,
    source_url: EURLEX_URL,
    eurlex_url: EURLEX_URL,
    publication_date: VERSION_DATE,
    chunk_hash: parentHash,
    parsed_at: now,
    validation_status: "pending",
  });

  // Chunks enfants
  for (const c of children) {
    const key = `${REGULATION_NAME}|${article.article_number}|${c.paragraph_number ?? ""}|${c.point_letter ?? ""}|${c.granularity}|${c.content}`;
    result.push({
      id: crypto.randomUUID(),
      document_id: documentId,
      regulation: REGULATION_NAME,
      article_number: article.article_number,
      paragraph_number: c.paragraph_number,
      point_letter: c.point_letter,
      article_title: article.article_title,
      chapter: c.chapter,
      granularity: c.granularity,
      parent_chunk_id: parentId,
      content: c.content,
      language: LANGUAGE,
      country: COUNTRY,
      text_type: TEXT_TYPE,
      source_type: SOURCE_TYPE,
      source_url: EURLEX_URL,
      eurlex_url: EURLEX_URL,
      publication_date: VERSION_DATE,
      chunk_hash: chunkHash(key),
      parsed_at: now,
      validation_status: "pending",
    });
  }

  return result;
}

function buildAnnexeStagingChunk(
  documentId: string,
  annexe: EidasAnnexe
): StagingChunkInsert {
  const now = new Date().toISOString();
  const key = `${REGULATION_NAME}|ANNEXE ${annexe.annexe_number}|annexe|${annexe.content}`;
  return {
    id: crypto.randomUUID(),
    document_id: documentId,
    regulation: REGULATION_NAME,
    article_number: `ANNEXE ${annexe.annexe_number}`,
    paragraph_number: null,
    point_letter: null,
    article_title: annexe.annexe_title,
    chapter: null,
    granularity: "annexe",
    parent_chunk_id: null,
    content: annexe.content,
    language: LANGUAGE,
    country: COUNTRY,
    text_type: TEXT_TYPE,
    source_type: SOURCE_TYPE,
    source_url: EURLEX_URL,
    eurlex_url: EURLEX_URL,
    publication_date: VERSION_DATE,
    chunk_hash: chunkHash(key),
    parsed_at: now,
    validation_status: "pending",
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  rechunk-eidas2.ts — eIDAS 2 consolidé → staging_chunks");
  console.log("=".repeat(70));
  console.log(`Mode       : ${dryRun ? "DRY-RUN (pas d'écriture)" : "LIVE (écriture staging)"}`);
  console.log(`Modèle IA  : ${CLAUDE_MODEL}`);
  console.log(`Règlement  : ${REGULATION_NAME}`);
  console.log(`Source     : ${SOURCE_PATH}`);
  console.log(`Target DB  : ${process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40)}...`);
  console.log();

  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error(`Source introuvable : ${SOURCE_PATH}`);
  }

  const rawText = fs.readFileSync(SOURCE_PATH, "utf8");

  // 1. Extraction
  console.log("1. Extraction du texte...");
  const articles = extractArticles(rawText);
  const annexes = extractAnnexes(rawText);

  console.log(`   ${articles.length} articles extraits`);
  console.log(`   ${annexes.length} annexes extraites`);
  console.log();

  if (articles.length < 40) {
    throw new Error(`Extraction insuffisante (${articles.length} articles) — vérifiez EIDAS2_CONSOLIDE_FR.txt`);
  }

  // 2. pending_documents
  console.log("2. Création/récupération pending_document...");
  const sb = getSb();
  const documentId = await ensurePendingDocument(sb, dryRun);
  console.log(`   document_id : ${documentId}`);
  console.log();

  // 3. Nettoyage staging_chunks existants
  console.log("3. Nettoyage staging_chunks existants...");
  await clearStagingChunks(sb, documentId, dryRun);
  console.log();

  // 4. Parsing Claude article par article
  console.log(`4. Parsing ${CLAUDE_MODEL} — ${articles.length} articles...`);
  const anthropic = getAnthropic();

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const allStagingChunks: StagingChunkInsert[] = [];
  const parsedArticles: string[] = [];
  const failedArticles: string[] = [];

  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];
    process.stdout.write(
      `   [${String(i + 1).padStart(2, " ")}/${articles.length}] Art.${art.article_number} "${(art.article_title ?? "?").slice(0, 35)}"... `
    );

    try {
      const result = await parseArticleWithClaude(anthropic, art);
      totalInputTokens += result.inputTokens;
      totalOutputTokens += result.outputTokens;

      const stagingChunks = buildArticleStagingChunks(documentId, art, result.chunks);
      allStagingChunks.push(...stagingChunks);
      parsedArticles.push(art.article_number);

      console.log(`${result.chunks.length} enfants → ${stagingChunks.length} chunks (${result.inputTokens}in/${result.outputTokens}out)`);

      if (i < articles.length - 1) await sleep(THROTTLE_MS);
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`\n   ❌ Art.${art.article_number} : ${msg}`);
      failedArticles.push(`${art.article_number}: ${msg}`);
      // On continue sur les autres articles
    }
  }

  // 5. Annexes (sans Claude, direct)
  console.log(`\n5. Annexes (${annexes.length} annexes, sans parsing Claude)...`);
  for (const annexe of annexes) {
    const sc = buildAnnexeStagingChunk(documentId, annexe);
    allStagingChunks.push(sc);
    console.log(`   ANNEXE ${annexe.annexe_number} "${(annexe.annexe_title ?? "?").slice(0, 50)}" — ${annexe.content.length} chars`);
  }

  // 6. Insertion
  console.log(`\n6. Insertion ${allStagingChunks.length} staging_chunks...`);
  const { inserted, errors: insertErrors } = await insertStagingChunks(sb, allStagingChunks, dryRun);

  // 7. Coût estimé
  const inputCost = (totalInputTokens / 1_000_000) * 3.0;
  const outputCost = (totalOutputTokens / 1_000_000) * 15.0;
  const totalCost = inputCost + outputCost;

  // 8. Rapport
  console.log("\n" + "=".repeat(70));
  console.log("  RAPPORT STAGING — eIDAS 2");
  console.log("=".repeat(70));
  console.log(`Mode : ${dryRun ? "DRY-RUN" : "LIVE"}`);
  console.log(`Date : ${new Date().toISOString()}`);
  console.log();

  // Comptes par granularité
  const counts = { article: 0, paragraph: 0, point: 0, annexe: 0, considerant: 0 };
  for (const c of allStagingChunks) counts[c.granularity]++;

  console.log("Chunks insérés en staging_chunks :");
  console.log(`  article    : ${counts.article}`);
  console.log(`  paragraph  : ${counts.paragraph}`);
  console.log(`  point      : ${counts.point}`);
  console.log(`  annexe     : ${counts.annexe}`);
  console.log(`  considerant: ${counts.considerant} (absent du texte consolidé EUR-Lex)`);
  console.log(`  TOTAL      : ${allStagingChunks.length}`);
  console.log();
  console.log(`Articles parsés avec succès : ${parsedArticles.length}/${articles.length}`);
  if (failedArticles.length > 0) {
    console.log(`Articles en erreur (${failedArticles.length}) :`);
    for (const f of failedArticles) console.log(`  ❌ ${f}`);
  }
  console.log();
  console.log(`Tokens : ${totalInputTokens.toLocaleString()} input, ${totalOutputTokens.toLocaleString()} output`);
  console.log(`Coût estimé : $${totalCost.toFixed(4)} USD (input $${inputCost.toFixed(4)} + output $${outputCost.toFixed(4)})`);
  console.log();

  // Liste articles parsés
  console.log("Articles présents :");
  console.log("  " + parsedArticles.join(", "));
  console.log();

  // Liste annexes
  console.log("Annexes présentes :");
  for (const a of annexes) {
    console.log(`  ANNEXE ${a.annexe_number} — ${a.annexe_title ?? "(sans titre)"}`);
  }
  console.log();

  if (insertErrors.length > 0) {
    console.log("Erreurs d'insertion :");
    for (const e of insertErrors) console.log(`  ❌ ${e}`);
  }

  console.log(`Chunks staging insérés : ${inserted}`);

  if (dryRun) {
    console.log("\n⚠️  DRY-RUN : aucune écriture effectuée. Relancez sans --dry-run pour staging.");
  } else {
    console.log("\n✅ Staging terminé. Prochaine étape :");
    console.log("   1. Valider les chunks via /dashboard/admin/rag-validation");
    console.log("   2. Approuver le document");
    console.log("   3. Lancer le production-indexer pour promotion vers legal_chunks");
  }

  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
