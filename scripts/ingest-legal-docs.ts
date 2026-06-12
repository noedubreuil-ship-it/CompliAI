/**
 * Legal Document Ingestion Pipeline
 *
 * Usage:
 *   npm run ingest              → ingère tous les fichiers de scripts/data/
 *   npm run ingest AI_ACT.txt  → ingère un seul fichier
 *
 * Pour ajouter un texte de loi :
 *   1. Télécharger le texte (copier-coller depuis EUR-Lex ou autre source)
 *   2. Sauvegarder en .txt dans scripts/data/
 *   3. Optionnel : ajouter un en-tête YAML pour des métadonnées précises :
 *
 *      ---
 *      name: AI Act (UE 2024/1689)
 *      version_date: 2024-08-01
 *      eurlex_url: https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689
 *      ---
 *      <texte de la loi>
 *
 *   Sans en-tête, le nom de fichier est utilisé comme nom du règlement.
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DATA_DIR = path.join(__dirname, "data");

// ─── Metadata parsing ─────────────────────────────────────────────────────────

interface DocMeta {
  name: string;
  version_date: string;
  eurlex_url: string;
  body: string;
}

function parseDoc(filename: string, raw: string): DocMeta {
  const baseName = path.basename(filename, ".txt").replace(/_/g, " ");

  // Parse optional YAML front-matter
  const frontMatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (frontMatterMatch) {
    const yaml = frontMatterMatch[1];
    const body = frontMatterMatch[2];
    const get = (key: string) => {
      const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
      return m ? m[1].trim() : "";
    };
    const rawDate = get("version_date") || "";
    const version_date = /^\d{4}$/.test(rawDate)
      ? `${rawDate}-01-01`
      : rawDate || new Date().toISOString().slice(0, 10);

    return {
      name: get("name") || baseName,
      version_date,
      eurlex_url: get("eurlex_url") || "",
      body,
    };
  }

  // Try to extract a year from the text and build a valid date
  const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
  const version_date = yearMatch
    ? `${yearMatch[0]}-01-01`
    : new Date().toISOString().slice(0, 10);

  return {
    name: baseName,
    version_date,
    eurlex_url: "",
    body: raw,
  };
}

// ─── HTML stripping (if file contains HTML) ───────────────────────────────────

function stripHtml(text: string): string {
  if (!text.includes("<")) return text;
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(p|div|br|h[1-6]|li|tr|td|th|blockquote|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#[0-9]+;/gi, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Article parser ───────────────────────────────────────────────────────────

interface ArticleChunk {
  article_number: string;
  article_title: string;
  chapter: string;
  content: string;
}

function parseArticles(text: string): ArticleChunk[] {
  const chunks: ArticleChunk[] = [];

  // Track chapters/sections
  const chapterRegex = /(?:CHAPITRE|TITRE|SECTION|CHAPTER|TITLE)\s+([IVXLCDM\d]+)[^\n]{0,120}/gi;
  const chapPositions: { pos: number; chapter: string }[] = [];
  let chapMatch;
  while ((chapMatch = chapterRegex.exec(text)) !== null) {
    chapPositions.push({ pos: chapMatch.index, chapter: chapMatch[0].trim().slice(0, 120) });
  }

  function chapterAt(pos: number): string {
    let chapter = "";
    for (const c of chapPositions) {
      if (c.pos <= pos) chapter = c.chapter;
      else break;
    }
    return chapter;
  }

  // Split on article boundaries (FR + EN)
  const articleSplitRegex = /(?=(?:Article|Artikel|Artículo)\s+(?:\d+[a-z]*|premier|first)\b)/gi;
  const parts = text.split(articleSplitRegex);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length < 80) continue;

    const headerMatch = trimmed.match(/^(?:Article|Artikel|Artículo)\s+([\w]+)\s*\n?(.*?)(?:\n|$)/i);
    if (!headerMatch) continue;

    const articleNumber = headerMatch[1].trim();
    const rest = trimmed.slice(headerMatch[0].length).trim();
    const titleCandidate = rest.split("\n")[0].trim();
    const articleTitle = titleCandidate.length > 0 && titleCandidate.length < 150 ? titleCandidate : "";
    const contentStart = articleTitle ? rest.slice(titleCandidate.length).trim() : rest;
    const content = contentStart.length > 50 ? contentStart : rest;

    if (content.length < 50) continue;

    chunks.push({
      article_number: articleNumber,
      article_title: articleTitle,
      chapter: chapterAt(text.indexOf(part)),
      content: content.slice(0, 2000),
    });
  }

  // Fallback: chunk by paragraphs (for guidelines, opinions, non-article documents)
  if (chunks.length === 0) {
    const paragraphs = text.split(/\n{2,}/);
    let idx = 0;
    for (const para of paragraphs) {
      const p = para.trim();
      if (p.length < 100) continue;
      chunks.push({
        article_number: `P${++idx}`,
        article_title: p.slice(0, 80),
        chapter: "",
        content: p.slice(0, 2000),
      });
    }
  }

  return chunks;
}

// ─── Embedding ────────────────────────────────────────────────────────────────

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts.map((t) => t.replace(/\n/g, " ")),
    dimensions: 1536,
  });
  return response.data.map((d) => d.embedding);
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// ─── Ingest one file ──────────────────────────────────────────────────────────

async function ingestFile(filePath: string) {
  const filename = path.basename(filePath);
  console.log(`\n📥 Processing: ${filename}`);

  const raw = fs.readFileSync(filePath, "utf8");

  if (raw.trim().length === 0) {
    console.warn(`  ⚠️  File is empty, skipping.`);
    return;
  }

  const meta = parseDoc(filename, raw);
  const plainText = stripHtml(meta.body);

  console.log(`  📋 Regulation: ${meta.name}`);
  console.log(`  📏 Text size: ${plainText.length.toLocaleString()} chars`);

  const articles = parseArticles(plainText);
  console.log(`  📄 Found ${articles.length} chunks`);

  if (articles.length === 0) {
    console.warn(`  ⚠️  No chunks parsed. Check the file content.`);
    return;
  }

  const BATCH_SIZE = 50;
  let upserted = 0;
  let skipped = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const texts = batch.map(
      (a) => `${meta.name} — Article ${a.article_number} ${a.article_title}\n\n${a.content}`
    );

    let embeddings: number[][];
    try {
      embeddings = await embedBatch(texts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Embedding error at batch ${i}: ${msg}`);
      continue;
    }

    const rows = batch.map((article, j) => ({
      regulation: meta.name,
      article_number: article.article_number,
      article_title: article.article_title,
      chapter: article.chapter || null,
      content: article.content,
      embedding: embeddings[j],
      eurlex_url: meta.eurlex_url ? `${meta.eurlex_url}#${article.article_number}` : null,
      language: "fr",
      chunk_hash: sha256(`${meta.name}:${article.article_number}:${article.content}`),
      version_date: meta.version_date,
    }));

    const { error, data: insertedRows } = await supabase
      .from("legal_chunks")
      .upsert(rows, { onConflict: "chunk_hash", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error(`  ❌ Supabase error: ${error.message}`);
    } else {
      const n = insertedRows?.length ?? 0;
      upserted += n;
      skipped += batch.length - n;
    }

    await new Promise((r) => setTimeout(r, 50));
    process.stdout.write(`  ⏳ ${Math.min(i + BATCH_SIZE, articles.length)}/${articles.length} chunks\r`);
  }

  console.log(`\n  ✅ Done: ${upserted} upserted, ${skipped} already indexed`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔒 CompliAI — Legal Document Ingestion Pipeline");
  console.log("================================================\n");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
    console.error("❌ Missing environment variables. Fill in .env.local first.");
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.error(`❌ Created scripts/data/ — add your .txt files there and re-run.`);
    process.exit(1);
  }

  // If a specific file is passed as argument, ingest only that one
  const target = process.argv[2];
  if (target) {
    const targetPath = path.isAbsolute(target) ? target : path.join(DATA_DIR, target);
    if (!fs.existsSync(targetPath)) {
      console.error(`❌ File not found: ${targetPath}`);
      process.exit(1);
    }
    await ingestFile(targetPath);
  } else {
    // Ingest all .txt files in data/
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".txt")).sort();
    if (files.length === 0) {
      console.error(`❌ No .txt files found in scripts/data/`);
      console.error(`   Add your regulation texts there and re-run npm run ingest`);
      process.exit(1);
    }
    console.log(`📁 Found ${files.length} file(s): ${files.join(", ")}\n`);
    for (const file of files) {
      await ingestFile(path.join(DATA_DIR, file));
    }
  }

  console.log("\n🎉 Ingestion complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
