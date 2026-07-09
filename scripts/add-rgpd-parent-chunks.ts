#!/usr/bin/env tsx
/**
 * add-rgpd-parent-chunks.ts — P2.5 : chunks parent « article entier » pour le RGPD.
 *
 * Conserve les 802 chunks paragraphaires existants et ajoute ~99 chunks parent
 * (granularity = 'article') avec embedding sur le texte intégral de chaque article.
 *
 * Source texte : scripts/data/GDPR_FR.txt (EUR-Lex officiel)
 * Métadonnées chapitre/titre : reprises du premier chunk enfant en base.
 *
 * Usage :
 *   npx tsx scripts/add-rgpd-parent-chunks.ts
 *   npx tsx scripts/add-rgpd-parent-chunks.ts --dry-run
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const GDPR_FR_PATH = path.join(__dirname, "data/GDPR_FR.txt");
const REGULATION_NAME = "RGPD (UE 2016/679)";
const EURLEX_URL = "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;
const EMBEDDING_BATCH_SIZE = 50;

const dryRun = process.argv.includes("--dry-run");

interface ExtractedArticle {
  article_number: string;
  article_title: string | null;
  content: string;
}

function chunkHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

function readGdprText(): string {
  const raw = fs.readFileSync(GDPR_FR_PATH, "utf8");
  return raw.replace(/^---[\s\S]*?---\n/, "");
}

/**
 * Extrait les 99 articles du texte EUR-Lex (Article premier + Art. 2-99).
 */
function extractArticlesFromSource(text: string): ExtractedArticle[] {
  const lines = text.split("\n");
  const starts: { lineIdx: number; artNum: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const numMatch = trimmed.match(/^Article\s+(\d+)$/);
    if (numMatch) {
      starts.push({ lineIdx: i, artNum: numMatch[1] });
    } else if (trimmed === "Article premier") {
      starts.push({ lineIdx: i, artNum: "1" });
    }
  }

  const articles: ExtractedArticle[] = [];

  for (let s = 0; s < starts.length; s++) {
    const { lineIdx, artNum } = starts[s];
    const endLine = s + 1 < starts.length ? starts[s + 1].lineIdx : lines.length;
    const blockLines = lines.slice(lineIdx, endLine);

    // Titre : première ligne non vide après "Article N" qui ne commence pas par un chiffre de §
    let title: string | null = null;
    for (let j = 1; j < blockLines.length; j++) {
      const line = blockLines[j].trim();
      if (!line) continue;
      if (/^\d+\./.test(line)) break;
      if (line.startsWith("Section ") || line.startsWith("CHAPITRE")) break;
      title = line;
      break;
    }

    const header = artNum === "1" ? "Article premier" : `Article ${artNum}`;
    const body = blockLines.join("\n").trim();
    const content =
      title && !body.includes(title)
        ? `${header} — ${title}\n\n${body}`
        : body;

    if (content.length < 50) continue;

    articles.push({
      article_number: artNum,
      article_title: title,
      content,
    });
  }

  return articles;
}

function getSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

async function loadChildMetadata(
  sb: ReturnType<typeof createClient>
): Promise<Map<string, { chapter: string | null; article_title: string | null }>> {
  const { data, error } = await sb
    .from("legal_chunks")
    .select("article_number, chapter, article_title")
    .eq("regulation", REGULATION_NAME)
    .neq("granularity", "article");

  if (error) throw new Error(`Lecture metadata enfants : ${error.message}`);

  const map = new Map<string, { chapter: string | null; article_title: string | null }>();
  for (const row of data ?? []) {
    if (!row.article_number || map.has(row.article_number)) continue;
    map.set(row.article_number, {
      chapter: row.chapter,
      article_title: row.article_title,
    });
  }
  return map;
}

async function generateEmbeddings(openai: OpenAI, texts: string[]): Promise<number[][]> {
  const all: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    process.stdout.write(`  Embeddings ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}/${Math.ceil(texts.length / EMBEDDING_BATCH_SIZE)}... `);
    const resp = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIM,
    });
    for (const item of resp.data) all.push(item.embedding);
    console.log("✓");
    if (i + EMBEDDING_BATCH_SIZE < texts.length) await new Promise((r) => setTimeout(r, 400));
  }
  return all;
}

async function main() {
  console.log("=".repeat(60));
  console.log("  P2.5 — Chunks parent RGPD (granularity = article)");
  console.log("=".repeat(60));
  console.log(`Mode : ${dryRun ? "DRY-RUN" : "PRODUCTION"}\n`);

  if (!fs.existsSync(GDPR_FR_PATH)) {
    throw new Error(`Source introuvable : ${GDPR_FR_PATH}`);
  }

  const articles = extractArticlesFromSource(readGdprText());
  console.log(`Articles extraits du texte EUR-Lex : ${articles.length}`);

  if (articles.length < 90) {
    throw new Error(`Nombre d'articles insuffisant (${articles.length}) — vérifiez GDPR_FR.txt`);
  }

  const sb = getSb();
  const childMeta = await loadChildMetadata(sb);

  const { count: existingParents } = await sb
    .from("legal_chunks")
    .select("*", { count: "exact", head: true })
    .eq("regulation", REGULATION_NAME)
    .eq("granularity", "article");

  if ((existingParents ?? 0) > 0) {
    console.log(`\n⚠️  ${existingParents} chunks parent déjà présents — suppression avant réinsertion`);
    if (!dryRun) {
      const { error: delErr } = await sb
        .from("legal_chunks")
        .delete()
        .eq("regulation", REGULATION_NAME)
        .eq("granularity", "article");
      if (delErr) throw new Error(`Suppression parents existants : ${delErr.message}`);
    }
  }

  const parentRows = articles.map((art) => {
    const meta = childMeta.get(art.article_number);
    const title = meta?.article_title ?? art.article_title;
    return {
      regulation: REGULATION_NAME,
      article_number: art.article_number,
      paragraph_number: null,
      point_letter: null,
      article_title: title,
      chapter: meta?.chapter ?? null,
      content: art.content.trim(),
      language: "fr",
      country: "EU",
      text_type: "reglement_ue",
      source_method: "automated_pipeline",
      eurlex_url: EURLEX_URL,
      granularity: "article" as const,
      chunk_hash: chunkHash(art.content),
      version_date: "2016-05-04",
    };
  });

  console.log(`\nChunks parent à insérer : ${parentRows.length}`);
  console.log(`Taille moyenne : ${Math.round(parentRows.reduce((s, r) => s + r.content.length, 0) / parentRows.length)} chars`);

  if (dryRun) {
    console.log("\n[DRY-RUN] Échantillon Art.22 :");
    const a22 = parentRows.find((r) => r.article_number === "22");
    console.log(a22?.content.slice(0, 400) + "...");
    return;
  }

  console.log("\nGénération des embeddings...");
  const openai = getOpenAI();
  const embeddings = await generateEmbeddings(openai, parentRows.map((r) => r.content));

  const rowsWithEmb = parentRows.map((r, i) => ({
    ...r,
    embedding: embeddings[i],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  console.log("\nInsertion dans legal_chunks...");
  const BATCH = 25;
  for (let i = 0; i < rowsWithEmb.length; i += BATCH) {
    const batch = rowsWithEmb.slice(i, i + BATCH);
    const { error } = await sb.from("legal_chunks").insert(batch);
    if (error) throw new Error(`Insert batch ${i / BATCH} : ${error.message}`);
    process.stdout.write(`  Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(rowsWithEmb.length / BATCH)} ✓\n`);
  }

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

  console.log("\n" + "=".repeat(60));
  console.log("  P2.5 TERMINÉ");
  console.log("=".repeat(60));
  console.log(`Chunks paragraph : ${paraCount}`);
  console.log(`Chunks point     : ${pointCount}`);
  console.log(`Chunks article   : ${artCount}`);
  console.log(`Total RGPD       : ${(paraCount ?? 0) + (pointCount ?? 0) + (artCount ?? 0)}`);
}

main().catch((err) => {
  console.error("\n❌ ERREUR:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
