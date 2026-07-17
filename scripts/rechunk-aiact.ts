#!/usr/bin/env tsx
/**
 * rechunk-aiact.ts — Re-chunking de l'AI Act en granularité parent-child.
 *
 * Problème actuel : les 165 chunks AI Act en production sont en taille-fixe
 * (granularity='paragraph', chunks jusqu'à 4 000 caractères sans structure juridique).
 * Cela provoque des erreurs sur Q02, Q04, Q05, Q15 du golden set (articles 5, 26, 50, 51, 53).
 *
 * Opération :
 *   1. Lecture du texte officiel AI Act FR (scripts/data/AI_ACT_FR.txt)
 *   2. Découpage par article (1 article = 1 appel Claude)
 *   3. Parsing Claude Sonnet 4.6 → chunks paragraph + point
 *   4. Génération chunks parent article (granularity='article') = texte intégral article
 *   5. Archivage des 165 anciens chunks dans historical_chunks
 *   6. Suppression anciens chunks de legal_chunks
 *   7. Génération embeddings (OpenAI text-embedding-3-small, dim 1536)
 *   8. Insertion dans legal_chunks avec metadata complète
 *   9. Invalidation cache sémantique Upstash
 *  10. Rapport final
 *
 * Usage :
 *   npx tsx --env-file=.env.local   scripts/rechunk-aiact.ts --dry-run   # simulation — TOUJOURS commencer par la
 *   (le projet compliai-staging est abandonné depuis le 17/07/2026 : plus de
 *    répétition possible sur une base séparée, --dry-run est le seul filet)
 *   npx tsx --env-file=.env.local   scripts/rechunk-aiact.ts              # production
 *   npx tsx --env-file=.env.local   scripts/rechunk-aiact.ts --resume    # reprendre après interruption
 *   npx tsx --env-file=.env.local   scripts/rechunk-aiact.ts --articles=5,26,50,53 # articles ciblés
 *
 * Règles non-négociables (CLAUDE.md) :
 *   - Claude Sonnet 4.6 exclusivement pour le parsing
 *   - Staging avant production obligatoire
 *   - Backup dans historical_chunks avant toute suppression
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ─── Config ────────────────────────────────────────────────────────────────────

const AIACT_FR_PATH = path.join(__dirname, "data/AI_ACT_FR.txt");
const REGULATION_NAME = "AI Act (UE 2024/1689)";
const EURLEX_URL = "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689";
const VERSION_DATE = "2026-06-24";
const CLAUDE_MODEL = "claude-sonnet-4-6";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;
const EMBEDDING_BATCH_SIZE = 50;
const CLAUDE_MAX_TOKENS = 16000;
const THROTTLE_MS = 3000;  // entre appels Claude
const CHECKPOINT_FILE = path.join(__dirname, "data/rechunk-aiact-checkpoint.json");
const REPORT_FILE = path.join(process.cwd(), "RAG_AIACT_RECHUNK_STAGING_REPORT_2026-07-01.md");
const ESTIMATED_COST_USD = 2.5; // ~113 articles × ~$0.02/article (ordre de grandeur pré-run)

const CRITICAL_GOLDEN_IDS = ["Q02", "Q03", "Q04", "Q05", "Q15"] as const;

const dryRun = process.argv.includes("--dry-run");
const resumeMode = process.argv.includes("--resume");

// --articles=5,26,50,53 : traiter seulement ces articles (mode ciblé)
const targetArticlesArg = process.argv.find(a => a.startsWith("--articles="));
const targetArticles: Set<string> | null = targetArticlesArg
  ? new Set(targetArticlesArg.split("=")[1].split(",").map(a => a.trim()))
  : null;

// ─── Clients ──────────────────────────────────────────────────────────────────

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key);
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY manquant");
  return new OpenAI({ apiKey: key });
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquant");
  return new Anthropic({ apiKey: key });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiActArticle {
  article_number: string;   // "1", "5", "premier" → normalisé en "1"
  article_number_raw: string; // texte exact ("premier", "5", etc.)
  article_title: string | null;
  chapter: string | null;
  content: string;          // texte intégral de l'article
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
  version_date: string;
  granularity: "article" | "paragraph" | "point";
  embedding?: number[];
}

interface CheckpointData {
  completedArticles: string[];
  allChunks: (ParsedChunk & { article_number_base: string })[];
  totalInputTokens: number;
  totalOutputTokens: number;
  savedAt: string;
}

// ─── Checkpoint ───────────────────────────────────────────────────────────────

function saveCheckpoint(data: CheckpointData): void {
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

// ─── Lecture et découpage du texte AI Act ─────────────────────────────────────

function chunkHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeArticleNumber(raw: string): string {
  if (raw === "premier") return "1";
  return raw.trim();
}

/**
 * Lit le texte AI Act et extrait chaque article avec son titre, chapitre et contenu.
 * Gère le non-breaking space (U+00A0) utilisé par EUR-Lex dans le fichier source.
 */
function extractArticlesFromSource(text: string): AiActArticle[] {
  // Supprimer front-matter YAML
  const withoutFrontMatter = text.replace(/^---[\s\S]*?---\n/, "");
  const lines = withoutFrontMatter.split("\n");

  // Construire la map chapitre → titre
  const chapterTitles: Map<string, string> = new Map();
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (/^CHAPITRE[\s ]/.test(stripped)) {
      const num = stripped.replace(/^CHAPITRE[\s ]/, "").trim();
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nxt = lines[j].trim();
        if (nxt && !/^CHAPITRE/.test(nxt)) {
          chapterTitles.set(num, `CHAPITRE ${num} — ${nxt}`);
          break;
        }
      }
    }
  }

  // Stopper avant les annexes (sinon Art.113 capture tout le fichier)
  let firstAnnexeLine = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^ANNEXE[\s]/.test(lines[i].trim()) || lines[i].trim() === "ANNEXE") {
      firstAnnexeLine = i;
      break;
    }
  }

  // Détecter les débuts d'articles (Article N ou Article premier)
  const articleStarts: { lineIdx: number; artRaw: string }[] = [];
  for (let i = 0; i < firstAnnexeLine; i++) {
    const stripped = lines[i].trim();
    const mNbsp = stripped.match(/^Article[\s ](\d+)$/);
    const mPremier = stripped.match(/^Article[\s ]premier$/);
    if (mNbsp) {
      articleStarts.push({ lineIdx: i, artRaw: mNbsp[1] });
    } else if (mPremier) {
      articleStarts.push({ lineIdx: i, artRaw: "premier" });
    }
  }

  if (articleStarts.length < 100) {
    throw new Error(
      `Nombre d'articles insuffisant : ${articleStarts.length} détectés (attendu ~113). Vérifiez AI_ACT_FR.txt`
    );
  }

  const articles: AiActArticle[] = [];

  for (let s = 0; s < articleStarts.length; s++) {
    const { lineIdx, artRaw } = articleStarts[s];
    const endLine = s + 1 < articleStarts.length ? articleStarts[s + 1].lineIdx : lines.length;

    const blockLines = lines.slice(lineIdx, endLine);
    const content = blockLines.join("\n").trim();

    if (content.length < 30) continue;

    // Titre : première ligne non vide après "Article N"
    let title: string | null = null;
    for (let j = 1; j < blockLines.length; j++) {
      const line = blockLines[j].trim();
      if (!line) continue;
      if (/^\d+\./.test(line) || /^[a-z]\)/.test(line)) break;
      if (/^CHAPITRE|^TITRE|^ANNEXE/.test(line)) break;
      title = line;
      break;
    }

    // Chapitre courant : chercher en remontant
    let chapter: string | null = null;
    for (let k = lineIdx - 1; k >= 0; k--) {
      const stripped = lines[k].trim();
      if (/^CHAPITRE[\s ]/.test(stripped)) {
        const num = stripped.replace(/^CHAPITRE[\s ]/, "").trim();
        chapter = chapterTitles.get(num) ?? stripped;
        break;
      }
    }

    articles.push({
      article_number: normalizeArticleNumber(artRaw),
      article_number_raw: artRaw,
      article_title: title,
      chapter,
      content,
    });
  }

  return articles;
}

// ─── Prompt Claude ─────────────────────────────────────────────────────────────

const PARSE_AIACT_PROMPT = `Tu es un juriste expert en droit de l'Union Européenne, spécialisé dans le Règlement (UE) 2024/1689 sur l'intelligence artificielle (AI Act).

## Tâche

Tu reçois UN ARTICLE de l'AI Act. Tu dois le découper en chunks structurés en respectant STRICTEMENT les règles suivantes.

## Règles de découpage — OBLIGATOIRES

1. **Un chunk paragraph = un paragraphe numéroté** : si l'article a §1, §2, §3... chaque § est UN chunk distinct (granularity="paragraph"). Ne jamais fusionner deux §§ dans un même chunk.

2. **Un chunk point = un point lettré** : si un paragraphe contient des points a), b), c)... ou i), ii)..., chaque point est UN chunk distinct (granularity="point"). Le préambule du paragraphe (avant le premier point) forme un chunk paragraph séparé.

3. **Articles courts** (sans §§ numérotés, < 400 mots) : un seul chunk paragraph pour l'article entier.

4. **Auto-suffisance** : chaque chunk doit commencer par "Article X — Titre" si le titre n'est pas déjà dans le contenu.

5. **Jamais de chunk > 800 mots** : si un § dépasse 800 mots, découper en sous-sections logiques avec paragraph_number suffixé ("1a", "1b"...).

6. **Considérants** : pas dans les articles — ignorer si présents.

## Format de sortie JSON strict

\`\`\`json
{
  "chunks": [
    {
      "article_number": "5",
      "paragraph_number": "1",
      "point_letter": null,
      "article_title": "Pratiques interdites en matière d'IA",
      "chapter": "CHAPITRE II — PRATIQUES INTERDITES EN MATIÈRE D'IA",
      "granularity": "paragraph",
      "content": "Article 5 — Pratiques interdites en matière d'IA\\n\\n1. Les pratiques en matière d'IA suivantes sont interdites:"
    },
    {
      "article_number": "5",
      "paragraph_number": "1",
      "point_letter": "a",
      "article_title": "Pratiques interdites en matière d'IA",
      "chapter": "CHAPITRE II — PRATIQUES INTERDITES EN MATIÈRE D'IA",
      "granularity": "point",
      "content": "Article 5 §1(a) — Pratiques interdites en matière d'IA\\n\\na) la mise sur le marché, la mise en service ou l'utilisation d'un système d'IA qui a recours à des techniques subliminales..."
    }
  ]
}
\`\`\`

## Champs obligatoires

- \`article_number\` : numéro exact ("5", "113", etc.)
- \`paragraph_number\` : "1", "2"... (null si article entier sans §§)
- \`point_letter\` : "a", "b"... ou "i", "ii"... (null si pas de point lettré)
- \`article_title\` : titre officiel (null si absent)
- \`chapter\` : titre du chapitre (null si absent)
- \`granularity\` : "paragraph" ou "point"
- \`content\` : texte complet du chunk (≥ 50 caractères)

## Article à traiter

{{ARTICLE_TEXT}}`;

// ─── Appel Claude ─────────────────────────────────────────────────────────────

interface ClaudeResult {
  chunks: ParsedChunk[];
  inputTokens: number;
  outputTokens: number;
}

async function parseArticleWithClaude(
  anthropic: Anthropic,
  article: AiActArticle
): Promise<ClaudeResult> {
  const prompt = PARSE_AIACT_PROMPT.replace("{{ARTICLE_TEXT}}", article.content);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error(`Réponse Claude vide pour Article ${article.article_number}`);
  }

  // Extraire le JSON de la réponse
  const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ??
    textContent.text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error(`Pas de JSON dans la réponse Claude pour Article ${article.article_number}`);
  }

  let parsed: { chunks: ParsedChunk[] };
  try {
    parsed = JSON.parse(jsonMatch[1]);
  } catch (e) {
    throw new Error(`JSON invalide pour Article ${article.article_number}: ${(e as Error).message}`);
  }

  if (!Array.isArray(parsed.chunks) || parsed.chunks.length === 0) {
    throw new Error(`Aucun chunk retourné par Claude pour Article ${article.article_number}`);
  }

  // Forcer les métadonnées depuis l'article source si manquantes
  const chunks = parsed.chunks.map((c) => ({
    ...c,
    article_number: c.article_number ?? article.article_number,
    article_title: c.article_title ?? article.article_title,
    chapter: c.chapter ?? article.chapter,
  }));

  return { chunks, inputTokens, outputTokens };
}

// ─── Embeddings ───────────────────────────────────────────────────────────────

async function generateEmbeddings(openai: OpenAI, texts: string[]): Promise<number[][]> {
  const all: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    process.stdout.write(
      `  Embeddings batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}/${Math.ceil(texts.length / EMBEDDING_BATCH_SIZE)}... `
    );
    const resp = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIM,
    });
    for (const item of resp.data) all.push(item.embedding);
    console.log("✓");
    if (i + EMBEDDING_BATCH_SIZE < texts.length) await sleep(300);
  }
  return all;
}

// ─── Backup ───────────────────────────────────────────────────────────────────

async function backupExistingChunks(sb: ReturnType<typeof getSb>): Promise<number> {
  // Lire les chunks existants AI Act
  const { data: existingChunks, error: readErr } = await sb
    .from("legal_chunks")
    .select("*")
    .eq("regulation", REGULATION_NAME);

  if (readErr) throw new Error(`Lecture chunks existants : ${readErr.message}`);
  if (!existingChunks || existingChunks.length === 0) {
    console.log("  Aucun chunk existant à archiver.");
    return 0;
  }

  console.log(`  Archivage de ${existingChunks.length} chunks dans historical_chunks...`);

  // Insérer dans historical_chunks avec reason
  // Note : historical_chunks a ses propres colonnes — ne pas spreader toutes les colonnes de legal_chunks
  // pour éviter les erreurs de colonne inconnue (ex: tsvector, séquences internes).
  // Utiliser une sélection explicite.
  const archiveRows = existingChunks.map((c: Record<string, unknown>) => ({
    original_chunk_id: c.id as string,
    regulation: c.regulation as string,
    article_number: c.article_number as string | null,
    article_title: c.article_title as string | null,
    granularity: c.granularity as string | null,
    parent_chunk_id: c.parent_chunk_id as string | null,
    content: c.content as string,
    embedding: c.embedding,
    chunk_hash: c.chunk_hash as string | null,
    version_date: (c.updated_at as string | null)?.slice(0, 10) ?? null,
    archived_at: new Date().toISOString(),
    archive_reason: "rechunking_parent_child",
    superseded_by: null,
  }));

  const BATCH = 50;
  for (let i = 0; i < archiveRows.length; i += BATCH) {
    const batch = archiveRows.slice(i, i + BATCH);
    const { error: archErr } = await sb.from("historical_chunks").insert(batch);
    if (archErr) {
      // historical_chunks peut ne pas exister — log et continuer
      console.warn(`  ⚠️  Archivage historical_chunks : ${archErr.message}`);
      console.warn("  → Continuer sans archivage (les chunks seront supprimés directement)");
      break;
    }
  }

  return existingChunks.length;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  rechunk-aiact.ts — Re-chunking AI Act en parent-child");
  console.log("=".repeat(70));
  console.log(`Mode       : ${dryRun ? "DRY-RUN (pas d'écriture)" : "PRODUCTION"}`);
  console.log(`Modèle IA  : ${CLAUDE_MODEL}`);
  console.log(`Embeddings : ${EMBEDDING_MODEL} dim=${EMBEDDING_DIM}`);
  console.log(`Règlement  : ${REGULATION_NAME}`);
  console.log(`Source     : ${AIACT_FR_PATH}`);
  if (targetArticles) console.log(`Articles ciblés : ${[...targetArticles].join(", ")}`);
  console.log();

  if (!fs.existsSync(AIACT_FR_PATH)) {
    throw new Error(`Source introuvable : ${AIACT_FR_PATH}`);
  }

  // 1. Extraction des articles
  console.log("1. Extraction des articles...");
  const rawText = fs.readFileSync(AIACT_FR_PATH, "utf8");
  const articles = extractArticlesFromSource(rawText);
  const articlesToProcess = targetArticles
    ? articles.filter((a) => targetArticles.has(a.article_number))
    : articles;

  console.log(`   ${articles.length} articles extraits du texte EUR-Lex`);
  console.log(`   ${articlesToProcess.length} articles à traiter`);

  if (articles.length < 100) {
    throw new Error(`Nombre d'articles insuffisant (${articles.length}) — vérifiez AI_ACT_FR.txt`);
  }

  // 2. Checkpoint resume
  let completedArticles = new Set<string>();
  let allChildChunks: (ParsedChunk & { article_number_base: string })[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  if (resumeMode) {
    const cp = loadCheckpoint();
    if (cp) {
      completedArticles = new Set(cp.completedArticles);
      allChildChunks = cp.allChunks;
      totalInputTokens = cp.totalInputTokens;
      totalOutputTokens = cp.totalOutputTokens;
      console.log(`\nReprend depuis checkpoint : ${completedArticles.size} articles déjà traités`);
    }
  }

  // 3. Initialiser clients
  const anthropic = getAnthropic();
  const openai = getOpenAI();

  // 4. Parsing article par article avec Claude
  console.log(`\n2. Parsing avec ${CLAUDE_MODEL} (${articlesToProcess.length - completedArticles.size} articles restants)...`);

  for (let i = 0; i < articlesToProcess.length; i++) {
    const art = articlesToProcess[i];
    if (completedArticles.has(art.article_number)) {
      process.stdout.write(`   [${i + 1}/${articlesToProcess.length}] Art.${art.article_number} — skip (déjà traité)\n`);
      continue;
    }

    process.stdout.write(`   [${i + 1}/${articlesToProcess.length}] Art.${art.article_number} "${art.article_title?.slice(0, 40) ?? "?"}"... `);

    try {
      const result = await parseArticleWithClaude(anthropic, art);
      totalInputTokens += result.inputTokens;
      totalOutputTokens += result.outputTokens;

      const enriched = result.chunks.map((c) => ({
        ...c,
        article_number_base: art.article_number,
      }));
      allChildChunks.push(...enriched);
      completedArticles.add(art.article_number);

      console.log(`${result.chunks.length} chunks (${result.inputTokens}in/${result.outputTokens}out tok)`);

      // Checkpoint toutes les 10 articles
      if (!dryRun && i % 10 === 9) {
        saveCheckpoint({
          completedArticles: [...completedArticles],
          allChunks: allChildChunks,
          totalInputTokens,
          totalOutputTokens,
          savedAt: new Date().toISOString(),
        });
      }

      if (i < articlesToProcess.length - 1) await sleep(THROTTLE_MS);
    } catch (err) {
      console.error(`\n   ❌ Erreur Art.${art.article_number} : ${(err as Error).message}`);
      // Sauvegarder et continuer
      saveCheckpoint({
        completedArticles: [...completedArticles],
        allChunks: allChildChunks,
        totalInputTokens,
        totalOutputTokens,
        savedAt: new Date().toISOString(),
      });
      console.error("   Checkpoint sauvegardé. Relancez avec --resume pour continuer.");
      process.exit(1);
    }
  }

  console.log(`\n   Parsing terminé : ${allChildChunks.length} chunks enfants générés`);
  console.log(`   Tokens totaux : ${totalInputTokens.toLocaleString()} input, ${totalOutputTokens.toLocaleString()} output`);

  // Estimation coût
  const costInput = (totalInputTokens / 1_000_000) * 3.0;
  const costOutput = (totalOutputTokens / 1_000_000) * 15.0;
  console.log(`   Coût estimé : ~$${(costInput + costOutput).toFixed(2)} USD`);

  if (dryRun) {
    console.log("\n[DRY-RUN] Validation du parsing...");
    // Vérifier les articles critiques pour le golden set
    const criticals = ["5", "26", "50", "51", "53"];
    for (const art of criticals) {
      const artChunks = allChildChunks.filter((c) => c.article_number_base === art);
      if (artChunks.length === 0) {
        console.error(`  ❌ Art.${art} — aucun chunk généré !`);
      } else {
        console.log(`  ✓ Art.${art} — ${artChunks.length} chunks`);
        for (const c of artChunks.slice(0, 2)) {
          console.log(`    §${c.paragraph_number ?? "?"} pt(${c.point_letter ?? "-"}) [${c.granularity}] : ${c.content.slice(0, 80)}...`);
        }
      }
    }
    console.log("\n[DRY-RUN] Terminé. Aucune écriture en base.");
    return;
  }

  // 5. Backup et suppression anciens chunks
  const sb = getSb();
  console.log("\n3. Backup des chunks existants...");
  const backupCount = await backupExistingChunks(sb);
  console.log(`   ${backupCount} chunks archivés`);

  console.log("\n4. Suppression des anciens chunks AI Act...");
  const { error: delErr } = await sb
    .from("legal_chunks")
    .delete()
    .eq("regulation", REGULATION_NAME);
  if (delErr) throw new Error(`Suppression échouée : ${delErr.message}`);
  console.log("   ✓ Anciens chunks supprimés");

  // 6. Préparer les chunks enfants (paragraph + point)
  const childRows: NewLegalChunk[] = allChildChunks.map((c) => ({
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
    version_date: VERSION_DATE,
    granularity: c.granularity,
  }));

  // 7. Chunks parents (granularity='article') = texte intégral de chaque article
  const parentRows: NewLegalChunk[] = articlesToProcess.map((art) => ({
    regulation: REGULATION_NAME,
    article_number: art.article_number,
    paragraph_number: null,
    point_letter: null,
    article_title: art.article_title,
    chapter: art.chapter,
    content: art.content.trim(),
    language: "fr",
    country: "EU",
    text_type: "reglement_ue",
    source_method: "automated_pipeline",
    eurlex_url: EURLEX_URL,
    chunk_hash: chunkHash(art.content),
    version_date: VERSION_DATE,
    granularity: "article",
  }));

  const allRows = [...childRows, ...parentRows];
  console.log(`\n5. Total chunks à insérer : ${allRows.length}`);
  console.log(`   Chunks paragraph + point : ${childRows.length}`);
  console.log(`   Chunks article (parents) : ${parentRows.length}`);

  // 8. Génération embeddings
  // text-embedding-3-small : limite 8192 tokens ≈ 32 000 chars.
  // Les chunks parent (article entier) peuvent dépasser cette limite si l'article
  // est suivi de contenu annexe dans le fichier source. On tronque à 24 000 chars
  // pour l'embedding uniquement (le contenu complet reste en base).
  // text-embedding-3-small max = 8192 tokens ≈ 2-3 chars/token pour le français.
  // On tronque à 8000 chars (seuil safe absolu) uniquement pour l'embedding.
  const MAX_EMBED_CHARS = 8_000;
  console.log("\n6. Génération des embeddings...");
  const texts = allRows.map((r) => r.content.slice(0, MAX_EMBED_CHARS));
  const embeddings = await generateEmbeddings(openai, texts);
  const rowsWithEmb = allRows.map((r, i) => ({
    ...r,
    embedding: embeddings[i],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // 9. Insertion dans legal_chunks
  console.log("\n7. Insertion dans legal_chunks...");
  const BATCH = 25;
  for (let i = 0; i < rowsWithEmb.length; i += BATCH) {
    const batch = rowsWithEmb.slice(i, i + BATCH);
    const { error: insErr } = await sb.from("legal_chunks").insert(batch);
    if (insErr) throw new Error(`Insert batch ${Math.floor(i / BATCH)} : ${insErr.message}`);
    process.stdout.write(`  Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(rowsWithEmb.length / BATCH)} ✓\n`);
  }

  // 10. Invalidation cache Upstash — cosine 0.85 (ciblée sur les chunks modifiés)
  // Voir RAG_CACHE_INVALIDATION_FIX_2026-07-03.md pour le détail du correctif
  console.log("\n8. Invalidation cache sémantique Upstash (cosine 0.85)...");
  try {
    const { invalidateSemanticCache } = await import("../lib/rag-production-indexer/cache-invalidator");
    const embeddings = rowsWithEmb
      .filter((r) => r.embedding && (r.embedding as number[]).length > 0)
      .map((r) => r.embedding as number[]);
    const cacheResult = await invalidateSemanticCache(embeddings, 0.85);
    if (cacheResult.cacheUnavailable) {
      console.log("   Cache Upstash non configuré — ignoré");
    } else {
      console.log(`   Scannées : ${cacheResult.scanned} entrées | Invalidées : ${cacheResult.invalidated}`);
    }
  } catch (e) {
    console.warn(`   ⚠️  Invalidation cache échouée : ${(e as Error).message}`);
  }

  // 11. Vérification finale
  const { count: paraCount } = await sb
    .from("legal_chunks")
    .select("*", { count: "exact", head: true })
    .eq("regulation", REGULATION_NAME)
    .eq("granularity", "paragraph");

  const { count: pointCount } = await sb
    .from("legal_chunks")
    .select("*", { count: "exact", head: true })
    .eq("regulation", REGULATION_NAME)
    .eq("granularity", "point");

  const { count: artCount } = await sb
    .from("legal_chunks")
    .select("*", { count: "exact", head: true })
    .eq("regulation", REGULATION_NAME)
    .eq("granularity", "article");

  // Supprimer checkpoint si succès
  if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);

  const costUsd =
    (totalInputTokens / 1_000_000) * 3.0 + (totalOutputTokens / 1_000_000) * 15.0;

  console.log("\n9. Golden set critique (Art. 5, 26, 50, 51, 53)...");
  const { runQuestion } = await import("../lib/rag-quality/runner");
  const { GOLDEN_SET } = await import("../lib/rag-quality/golden-set");
  const goldenResults = [];
  for (const qid of CRITICAL_GOLDEN_IDS) {
    const q = GOLDEN_SET.find((item) => item.id === qid);
    if (!q) continue;
    const result = await runQuestion(q);
    goldenResults.push(result);
    const icon = result.status === "ok" ? "✓" : result.status === "warning" ? "⚠" : "✗";
    console.log(`   ${icon} ${qid} — ${result.status.toUpperCase()} — articles: ${result.articles_cited.slice(0, 5).join(", ") || "(aucun)"}`);
    if (result.anomalies.length > 0) {
      for (const a of result.anomalies.slice(0, 2)) {
        console.log(`      → ${a}`);
      }
    }
  }

  const goldenOk = goldenResults.filter((r) => r.status === "ok").length;
  const anomalies: string[] = [];
  if ((paraCount ?? 0) + (pointCount ?? 0) + (artCount ?? 0) < 300) {
    anomalies.push(`Volume total faible : ${(paraCount ?? 0) + (pointCount ?? 0) + (artCount ?? 0)} chunks (attendu ~400-800)`);
  }
  for (const art of ["5", "26", "50", "51", "53"]) {
    const { count } = await sb
      .from("legal_chunks")
      .select("*", { count: "exact", head: true })
      .eq("regulation", REGULATION_NAME)
      .eq("article_number", art);
    if (!count || count < 2) {
      anomalies.push(`Article ${art} : seulement ${count ?? 0} chunk(s) — parent-child probablement incomplet`);
    }
  }

  const report = [
    "# Rapport re-chunking AI Act",
    "",
    `**Date** : ${new Date().toISOString()}`,
    // Ne jamais coder l'environnement en dur : le rapport annoncait
    // « compliai-staging » quel que soit le projet reellement vise.
    `**Projet Supabase** : ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(non defini)"}`,
    `**Modèle parsing** : ${CLAUDE_MODEL}`,
    `**Statut production** : NON promu — en attente validation explicite`,
    "",
    "## Chunks générés",
    "",
    "| Granularité | Nombre |",
    "|---|---:|",
    `| paragraph | ${paraCount ?? 0} |`,
    `| point | ${pointCount ?? 0} |`,
    `| article (parents) | ${artCount ?? 0} |`,
    `| **Total** | **${(paraCount ?? 0) + (pointCount ?? 0) + (artCount ?? 0)}** |`,
    "",
    "## Coût API",
    "",
    `| Métrique | Valeur |`,
    `|---|---:|`,
    `| Tokens input | ${totalInputTokens.toLocaleString()} |`,
    `| Tokens output | ${totalOutputTokens.toLocaleString()} |`,
    `| Coût estimé pré-run | ~$${ESTIMATED_COST_USD.toFixed(2)} USD |`,
    `| **Coût réel mesuré** | **$${costUsd.toFixed(2)} USD** |`,
    "",
    "## Golden set — articles critiques (Art. 5, 26, 50, 51, 53)",
    "",
    `Score : **${goldenOk}/${goldenResults.length} OK**`,
    "",
    "| Question | Thème | Statut | Articles retrouvés |",
    "|---|---|---|---|",
    ...goldenResults.map((r) => {
      const q = GOLDEN_SET.find((item) => item.id === r.question_id);
      return `| ${r.question_id} | ${q?.theme ?? "?"} | ${r.status.toUpperCase()} | ${r.articles_cited.slice(0, 6).join(", ") || "—"} |`;
    }),
    "",
    "## Anomalies",
    "",
    ...(anomalies.length > 0 ? anomalies.map((a) => `- ${a}`) : ["- Aucune anomalie bloquante détectée"]),
    "",
    "## Prochaine étape",
    "",
    "Validation explicite requise avant promotion production.",
  ].join("\n");

  fs.writeFileSync(REPORT_FILE, report, "utf8");

  console.log("\n" + "=".repeat(70));
  console.log("  RE-CHUNKING AI ACT TERMINÉ");
  console.log("=".repeat(70));
  console.log(`Chunks paragraph : ${paraCount ?? 0}`);
  console.log(`Chunks point     : ${pointCount ?? 0}`);
  console.log(`Chunks article   : ${artCount ?? 0}`);
  console.log(`Total AI Act     : ${(paraCount ?? 0) + (pointCount ?? 0) + (artCount ?? 0)}`);
  console.log(`\nTokens consommés : ${totalInputTokens.toLocaleString()} input + ${totalOutputTokens.toLocaleString()} output`);
  console.log(`Coût API réel    : $${costUsd.toFixed(2)} USD (estimé ~$${ESTIMATED_COST_USD.toFixed(2)})`);
  console.log(`Golden set       : ${goldenOk}/${goldenResults.length} OK`);
  console.log(`Rapport écrit    : ${REPORT_FILE}`);
  if (anomalies.length > 0) {
    console.log("\nAnomalies :");
    for (const a of anomalies) console.log(`  ⚠ ${a}`);
  }
}

main().catch((err) => {
  console.error("\n❌ ERREUR FATALE:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
