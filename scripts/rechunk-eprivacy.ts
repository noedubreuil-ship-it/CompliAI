#!/usr/bin/env tsx
/**
 * rechunk-eprivacy.ts — Rechunking parent-child de la Directive ePrivacy
 *
 * Source : scripts/data/EPRIVACY_FR.txt (388 lignes)
 *   Directive 2002/58/CE — vie privée et communications électroniques
 *   CELEX : 32002L0058
 *
 * Opération :
 *   1. Extraction des 49 considérants (chunks considerant, sans Claude)
 *   2. Extraction des 21 articles avec Claude Sonnet 4.6
 *      → chunks article (parent) + paragraph + point (enfants)
 *   3. Création d'une entrée pending_documents en staging DB
 *   4. Insertion dans staging_chunks
 *
 * La regulation existante "Directive ePrivacy (UE 2002/58/CE) — communications
 * électroniques & cookies" a 21 chunks plats en production. Ce rechunk crée la
 * hiérarchie parent-child + ajoute les 49 considérants.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/rechunk-eprivacy.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/rechunk-eprivacy.ts
 *
 * Règles (CLAUDE.md) :
 *   - Claude Sonnet 4.6 exclusivement
 *   - Staging avant production TOUJOURS
 *   - Validation admin obligatoire avant promotion
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ─── Config ───────────────────────────────────────────────────────────────────

const SOURCE_PATH = path.join(__dirname, "data/EPRIVACY_FR.txt");
const REGULATION_NAME = "Directive ePrivacy (UE 2002/58/CE) — communications électroniques & cookies";
const CELEX = "32002L0058";
const EURLEX_URL = "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32002L0058";
const VERSION_DATE = "2026-06-24";
const LANGUAGE = "fr";
const COUNTRY = "EU";
const TEXT_TYPE = "directive_ue";
const SOURCE_TYPE = "eurlex";
const CLAUDE_MODEL = "claude-sonnet-4-6";
const CLAUDE_MAX_TOKENS = 8192;
const THROTTLE_MS = 2000;

const dryRun = process.argv.includes("--dry-run");

// ─── Clients ──────────────────────────────────────────────────────────────────

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes");
  return createClient(url, key);
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquant");
  return new Anthropic({ apiKey: key });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EPrivacyArticle {
  article_number: string;
  article_title: string | null;
  content: string;
}

interface EPrivacyConsiderant {
  number: string;
  content: string;
}

interface ParsedChunk {
  article_number: string | null;
  paragraph_number: string | null;
  point_letter: string | null;
  article_title: string | null;
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
  granularity: "article" | "paragraph" | "point" | "considerant";
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

// ─── Extraction des considérants ──────────────────────────────────────────────

function extractConsiderants(text: string): EPrivacyConsiderant[] {
  // Supprimer le front-matter YAML
  const body = text.replace(/^---[\s\S]*?---\n/, "");
  const lines = body.split("\n");

  // Trouver la ligne "ONT ARRÊTÉ LA PRÉSENTE DIRECTIVE:"
  let endLine = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^ONT ARR[EÊ]T/.test(lines[i])) {
      endLine = i;
      break;
    }
  }

  const considerants: EPrivacyConsiderant[] = [];
  // Pattern : ligne commençant par (N) suivi d'un espace et du texte
  const RE = /^\((\d+)\)\s+(.+)$/;

  for (let i = 0; i < endLine; i++) {
    const line = lines[i].trim();
    const m = line.match(RE);
    if (m) {
      considerants.push({
        number: m[1],
        content: `(${m[1]}) ${m[2]}`,
      });
    }
  }

  return considerants;
}

// ─── Extraction des articles ───────────────────────────────────────────────────

function extractArticles(text: string): EPrivacyArticle[] {
  const body = text.replace(/^---[\s\S]*?---\n/, "");
  const lines = body.split("\n");

  // Trouver "ONT ARRÊTÉ" (début des articles)
  let articlesStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^ONT ARR[EÊ]T/.test(lines[i])) {
      articlesStart = i + 1;
      break;
    }
  }

  // Regex article : "Article N" seul sur une ligne
  const ARTICLE_RE = /^Article\s+(\d+|premier)$/;

  const articleStarts: { lineIdx: number; number: string }[] = [];
  for (let i = articlesStart; i < lines.length; i++) {
    const t = lines[i].trim();
    const m = t.match(ARTICLE_RE);
    if (m) {
      articleStarts.push({
        lineIdx: i,
        number: m[1] === "premier" ? "1" : m[1],
      });
    }
  }

  // Fin des articles : première ligne de signatures/notes de bas de page
  // (repère : "Fait à Bruxelles" ou "(1) JO")
  let footerStart = lines.length;
  for (let i = articlesStart; i < lines.length; i++) {
    if (/^Fait à|^\(1\) JO/.test(lines[i].trim())) {
      footerStart = i;
      break;
    }
  }

  const articles: EPrivacyArticle[] = [];

  for (let s = 0; s < articleStarts.length; s++) {
    const { lineIdx, number } = articleStarts[s];
    const endLine = s + 1 < articleStarts.length
      ? articleStarts[s + 1].lineIdx
      : footerStart;

    const blockLines = lines.slice(lineIdx, endLine);
    const content = blockLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (content.length < 20) continue;

    // Titre : première ligne non vide après "Article N"
    let title: string | null = null;
    for (let j = 1; j < blockLines.length; j++) {
      const line = blockLines[j].trim();
      if (!line) continue;
      // Si la ligne commence par un chiffre suivi de "." ou une lettre suivie de ")" → contenu
      if (/^\d+\./.test(line) || /^[a-z]\)/.test(line)) break;
      title = line;
      break;
    }

    articles.push({ article_number: number, article_title: title, content });
  }

  return articles;
}

// ─── Parsing Claude Sonnet 4.6 ────────────────────────────────────────────────

const PARSE_PROMPT = `Tu es un expert en droit européen des données personnelles et des communications électroniques.

On te fournit le texte d'un article de la Directive ePrivacy (2002/58/CE).

Ta tâche : décomposer cet article en chunks atomiques selon la hiérarchie suivante :
- "paragraph" : chaque paragraphe numéroté (1., 2., 3...) ou non numéroté s'il n'y a qu'un paragraphe
- "point" : chaque sous-point lettre (a), b), c)...) à l'intérieur d'un paragraphe

Règles :
- Chaque chunk doit être autonome et compréhensible seul (inclure le contexte de l'article si nécessaire)
- paragraph_number : "1", "2", "3"... (null si l'article n'a pas de paragraphes numérotés)
- point_letter : "a", "b", "c"... (null si ce n'est pas un point)
- Pour un article sans structure interne : 1 seul chunk de type "paragraph", paragraph_number null
- Le contenu de chaque chunk doit commencer par l'en-tête de l'article (ex: "Article 5 — Confidentialité des communications")

Retourne un JSON valide avec ce format exact :
{
  "chunks": [
    {
      "granularity": "paragraph" | "point",
      "paragraph_number": "1" | null,
      "point_letter": "a" | null,
      "content": "texte complet du chunk"
    }
  ]
}`;

async function parseArticleWithClaude(
  anthropic: Anthropic,
  article: EPrivacyArticle
): Promise<ParsedChunk[]> {
  const userMsg = `Article ${article.article_number}${article.article_title ? ` — ${article.article_title}` : ""}

${article.content}`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    temperature: 0,
    system: PARSE_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";

  // Extraire le JSON de la réponse
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Pas de JSON dans la réponse Claude pour Art. ${article.article_number}`);

  const parsed = JSON.parse(jsonMatch[0]) as { chunks: ParsedChunk[] };
  return parsed.chunks.map((c) => ({
    ...c,
    article_number: article.article_number,
    article_title: article.article_title,
  }));
}

// ─── Pipeline principal ────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  rechunk-eprivacy.ts — Directive ePrivacy → staging_chunks");
  console.log("=".repeat(70));
  console.log(`Mode : ${dryRun ? "DRY-RUN" : "PRODUCTION"}`);
  console.log(`Regulation : ${REGULATION_NAME}`);
  console.log();

  if (!fs.existsSync(SOURCE_PATH)) throw new Error(`Fixture introuvable : ${SOURCE_PATH}`);

  const rawText = fs.readFileSync(SOURCE_PATH, "utf-8");
  console.log(`Fixture lue : ${rawText.length} caractères, ${rawText.split("\n").length} lignes`);

  // ── Extraction ────────────────────────────────────────────────────────────

  const considerants = extractConsiderants(rawText);
  console.log(`Considérants extraits : ${considerants.length}`);

  const articles = extractArticles(rawText);
  console.log(`Articles extraits : ${articles.length}`);

  if (dryRun) {
    console.log("\n[DRY-RUN] Aperçu des 3 premiers considérants :");
    considerants.slice(0, 3).forEach((c) => console.log(`  (${c.number}) ${c.content.slice(0, 80)}...`));
    console.log("\n[DRY-RUN] Aperçu des 3 premiers articles :");
    articles.slice(0, 3).forEach((a) => console.log(`  Art.${a.article_number} — ${a.article_title} (${a.content.length} chars)`));
    console.log("\n[DRY-RUN] Aucune écriture DB. Relancez sans --dry-run.");
    return;
  }

  // ── Clients ───────────────────────────────────────────────────────────────

  const sb = getSb();
  const anthropic = getAnthropic();
  const now = new Date().toISOString();

  // ── Création du pending_document ─────────────────────────────────────────

  // Vérifier si un document existant correspond au CELEX
  const { data: existing } = await sb
    .from("pending_documents")
    .select("id, status")
    .eq("celex", CELEX)
    .maybeSingle();

  if (existing) {
    console.log(`\npending_document existant : ${existing.id} (status: ${existing.status})`);
    if (existing.status !== "pending") {
      await sb.from("pending_documents").update({ status: "pending", updated_at: now }).eq("id", existing.id);
    }
    // Nettoyer les staging_chunks existants pour ce document
    const { error: delErr } = await sb.from("staging_chunks").delete().eq("document_id", existing.id);
    if (delErr) console.warn(`  ⚠️  Erreur suppression anciens chunks : ${delErr.message}`);
    else console.log(`  Anciens staging_chunks supprimés.`);
  }

  let documentId: string;
  if (existing) {
    documentId = existing.id;
  } else {
    const { data: docData, error: docError } = await sb
      .from("pending_documents")
      .insert({
        celex: CELEX,
        title: REGULATION_NAME,
        document_type: "eu_directive",
        language: LANGUAGE,
        country: COUNTRY,
        source_url: EURLEX_URL,
        status: "staged",
        detected_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (docError) throw new Error(`Erreur création pending_document : ${docError.message}`);
    documentId = (docData as { id: string }).id;
    console.log(`\npending_document créé : ${documentId}`);
  }


  // ── Préparer les staging_chunks ──────────────────────────────────────────

  const stagingChunks: StagingChunkInsert[] = [];

  // ── 1. Considérants (pas de Claude, pas de parent) ────────────────────────

  console.log(`\n[1/2] Insertion des ${considerants.length} considérants...`);
  for (const c of considerants) {
    const id = crypto.randomUUID();
    stagingChunks.push({
      id,
      document_id: documentId,
      regulation: REGULATION_NAME,
      article_number: null,
      paragraph_number: null,
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
      chunk_hash: chunkHash(`${REGULATION_NAME}|considerant|${c.number}|${LANGUAGE}|${c.content}`),
      parsed_at: now,
      validation_status: "pending",
    });
  }
  console.log(`  ${considerants.length} considérants préparés.`);

  // ── 2. Articles avec Claude Sonnet 4.6 ────────────────────────────────────

  console.log(`\n[2/2] Parsing des ${articles.length} articles avec Claude Sonnet 4.6...`);

  let totalArticleChunks = 0;
  let totalChildChunks = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`  Art.${article.article_number.padEnd(3)} — ${(article.article_title ?? "(sans titre)").slice(0, 50)}...`);

    // Chunk article parent
    const articleId = crypto.randomUUID();
    const articleContent = `Article ${article.article_number}${article.article_title ? ` — ${article.article_title}` : ""}\n\n${article.content}`;
    stagingChunks.push({
      id: articleId,
      document_id: documentId,
      regulation: REGULATION_NAME,
      article_number: article.article_number,
      paragraph_number: null,
      point_letter: null,
      article_title: article.article_title,
      chapter: null,
      granularity: "article",
      parent_chunk_id: null,
      content: articleContent,
      language: LANGUAGE,
      country: COUNTRY,
      text_type: TEXT_TYPE,
      source_type: SOURCE_TYPE,
      source_url: EURLEX_URL,
      eurlex_url: EURLEX_URL,
      publication_date: VERSION_DATE,
      chunk_hash: chunkHash(`${REGULATION_NAME}|article|${article.article_number}|${LANGUAGE}|${articleContent}`),
      parsed_at: now,
      validation_status: "pending",
    });
    totalArticleChunks++;

    // Chunks enfants via Claude
    let children: ParsedChunk[] = [];
    try {
      children = await parseArticleWithClaude(anthropic, article);
      if (throttleMs > 0 && i < articles.length - 1) await sleep(THROTTLE_MS);
    } catch (e) {
      console.error(`  ⚠️  Erreur parsing Art.${article.article_number} : ${(e as Error).message}`);
      continue;
    }

    for (const child of children) {
      const childId = crypto.randomUUID();
      stagingChunks.push({
        id: childId,
        document_id: documentId,
        regulation: REGULATION_NAME,
        article_number: article.article_number,
        paragraph_number: child.paragraph_number,
        point_letter: child.point_letter,
        article_title: article.article_title,
        chapter: null,
        granularity: child.granularity,
        parent_chunk_id: articleId,
        content: child.content,
        language: LANGUAGE,
        country: COUNTRY,
        text_type: TEXT_TYPE,
        source_type: SOURCE_TYPE,
        source_url: EURLEX_URL,
        eurlex_url: EURLEX_URL,
        publication_date: VERSION_DATE,
        chunk_hash: chunkHash(`${REGULATION_NAME}|${child.granularity}|${article.article_number}|${child.paragraph_number ?? ""}|${child.point_letter ?? ""}|${LANGUAGE}|${child.content}`),
        parsed_at: now,
        validation_status: "pending",
      });
      totalChildChunks++;
    }

    console.log(`     → 1 article + ${children.length} enfants (${children.filter(c => c.granularity === "paragraph").length} §, ${children.filter(c => c.granularity === "point").length} pts)`);
  }

  // ── Insertion en DB ────────────────────────────────────────────────────────

  const totalChunks = stagingChunks.length;
  console.log(`\nTotal chunks à insérer : ${totalChunks}`);
  console.log(`  Considérants : ${considerants.length}`);
  console.log(`  Articles     : ${totalArticleChunks}`);
  console.log(`  Enfants      : ${totalChildChunks}`);

  // Insérer par batch de 100
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < stagingChunks.length; i += BATCH) {
    const batch = stagingChunks.slice(i, i + BATCH);
    const { error } = await sb.from("staging_chunks").insert(batch);
    if (error) throw new Error(`Erreur insertion batch ${i}-${i + BATCH} : ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`\r  Inséré : ${inserted}/${totalChunks}`);
  }
  console.log("\n");

  // ── Mise à jour statut pending_document ───────────────────────────────────

  await sb.from("pending_documents").update({
    status: "pending",
    updated_at: new Date().toISOString(),
  }).eq("id", documentId);

  // ── Rapport final ──────────────────────────────────────────────────────────

  console.log("=".repeat(70));
  console.log("  RAPPORT STAGING ePrivacy");
  console.log("=".repeat(70));
  console.log(`Document ID       : ${documentId}`);
  console.log(`Regulation        : ${REGULATION_NAME}`);
  console.log(`Total chunks      : ${totalChunks}`);
  console.log(`  considerant     : ${considerants.length}`);
  console.log(`  article         : ${totalArticleChunks}`);
  console.log(`  paragraph+point : ${totalChildChunks}`);
  console.log(`Statut staging    : pending (validation admin requise)`);
  console.log(`Validation        : /dashboard/admin/rag-validation`);
  console.log();
  console.log("Prochaine étape : valider les chunks dans le dashboard admin,");
  console.log("puis promouvoir en production via le bouton 'Tout approuver'.");
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const throttleMs = THROTTLE_MS;

void main().catch((e) => {
  console.error("\n❌ Erreur fatale :", e);
  process.exit(1);
});
