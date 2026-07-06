#!/usr/bin/env tsx
/**
 * rechunk-reglements.ts — Rechunking parent-child générique pour 8 règlements/directives EU
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/rechunk-reglements.ts --reg=DSA --dry-run
 *   npx tsx --env-file=.env.local scripts/rechunk-reglements.ts --reg=DSA
 *   npx tsx --env-file=.env.local scripts/rechunk-reglements.ts --reg=all --dry-run
 *
 * Règlements supportés : DSA, DMA, CRA, DATA_ACT, DGA, DSM, MACHINE, NIS2
 *
 * Fixes appliqués (appris depuis ePrivacy) :
 *   - NBSP ( ) normalisé avant parsing
 *   - Considérants extraits uniquement entre préambule et "ONT ADOPTÉ/ARRÊTÉ"
 *   - article_number = "considérant N" + paragraph_number = "N"
 *   - paragraph_number = "1" si null pour paragraphes (évite collision identité avec article)
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

// ─── Config règlements ─────────────────────────────────────────────────────────

interface RegConfig {
  key: string;
  file: string;
  name: string;
  celex: string;
  eurlex_url: string;
  version_date: string;
  text_type: "reglement_ue" | "directive_ue";
  document_type: string;
}

const REGULATIONS: RegConfig[] = [
  {
    key: "DSA",
    file: "DSA_FR.txt",
    name: "DSA — Règlement sur les services numériques (UE 2022/2065)",
    celex: "32022R2065",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R2065",
    version_date: "2026-06-24",
    text_type: "reglement_ue",
    document_type: "eu_regulation",
  },
  {
    key: "DMA",
    file: "DMA_FR.txt",
    name: "DMA — Règlement sur les marchés numériques (UE 2022/1925)",
    celex: "32022R1925",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R1925",
    version_date: "2026-06-24",
    text_type: "reglement_ue",
    document_type: "eu_regulation",
  },
  {
    key: "CRA",
    file: "CRA_FR.txt",
    name: "Cyber Resilience Act — Règlement sur la cyberrésilience (UE 2024/2847)",
    celex: "32024R2847",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R2847",
    version_date: "2026-06-24",
    text_type: "reglement_ue",
    document_type: "eu_regulation",
  },
  {
    key: "DATA_ACT",
    file: "DATA_ACT_FR.txt",
    name: "Data Act — Règlement sur les données (UE 2023/2854)",
    celex: "32023R2854",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023R2854",
    version_date: "2026-06-24",
    text_type: "reglement_ue",
    document_type: "eu_regulation",
  },
  {
    key: "DGA",
    file: "DGA_FR.txt",
    name: "Data Governance Act — Règlement sur la gouvernance des données (UE 2022/868)",
    celex: "32022R0868",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R0868",
    version_date: "2026-06-24",
    text_type: "reglement_ue",
    document_type: "eu_regulation",
  },
  {
    key: "DSM",
    file: "DSM_FR.txt",
    name: "Directive DSM (UE 2019/790) — droit d'auteur marché unique numérique",
    celex: "32019L0790",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32019L0790",
    version_date: "2026-06-20",
    text_type: "directive_ue",
    document_type: "eu_directive",
  },
  {
    key: "MACHINE",
    file: "MACHINE_FR.txt",
    name: "Règlement Machines (UE 2023/1230) — produits IA intégrés",
    celex: "32023R1230",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023R1230",
    version_date: "2026-06-24",
    text_type: "reglement_ue",
    document_type: "eu_regulation",
  },
  {
    key: "NIS2",
    file: "NIS2_FR.txt",
    name: "Directive NIS 2 (UE 2022/2555)",
    celex: "32022L2555",
    eurlex_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2555",
    version_date: "2026-06-20",
    text_type: "directive_ue",
    document_type: "eu_directive",
  },
];

const CLAUDE_MODEL = "claude-sonnet-4-6";
const CLAUDE_MAX_TOKENS = 8192;
const THROTTLE_MS = 2500;
const LANGUAGE = "fr";
const COUNTRY = "EU";
const SOURCE_TYPE = "eurlex";

const dryRun = process.argv.includes("--dry-run");
const regKey = process.argv.find(a => a.startsWith("--reg="))?.replace("--reg=", "").toUpperCase();

// ─── Types ────────────────────────────────────────────────────────────────────

interface Article { article_number: string; article_title: string | null; chapter: string | null; content: string; }
interface Considerant { number: string; content: string; }
interface Annexe { number: string; title: string | null; content: string; }
interface ParsedChunk { granularity: "paragraph" | "point"; paragraph_number: string | null; point_letter: string | null; content: string; }

interface StagingChunk {
  id: string; document_id: string; regulation: string;
  article_number: string | null; paragraph_number: string | null; point_letter: string | null;
  article_title: string | null; chapter: string | null;
  granularity: "article" | "paragraph" | "point" | "considerant" | "annexe";
  parent_chunk_id: string | null; content: string;
  language: string; country: string; text_type: string; source_type: string;
  source_url: string; eurlex_url: string; publication_date: string;
  chunk_hash: string; parsed_at: string; validation_status: "pending";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunkHash(s: string) { return crypto.createHash("sha256").update(s.trim()).digest("hex"); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function normalizeText(raw: string): string {
  // Supprimer front-matter YAML
  let text = raw.replace(/^---[\s\S]*?---\n/, "");
  // Normaliser non-breaking spaces → espace normal
  text = text.replace(/ /g, " ");
  // Nettoyer marqueurs EUR-Lex consolidé
  text = text.split("\n").filter(l => {
    const t = l.trim();
    if (/^[►▼][BM]\d*\s*$/.test(t)) return false;
    return true;
  }).map(l => l.replace(/^[►▼][BM]\d*\s+/, "").replace(/[►▼][BM]\d*/g, "")).join("\n");
  return text;
}

// ─── Extraction considérants ───────────────────────────────────────────────────

function extractConsiderants(text: string): Considerant[] {
  const lines = text.split("\n");
  // Borner entre début du texte et "ONT ADOPTÉ/ARRÊTÉ"
  let endLine = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^ONT (ADOPT|ARR[EÊ]T)/.test(lines[i].trim())) { endLine = i; break; }
  }
  const cons: Considerant[] = [];
  // Format 1 : "(N) Texte..." sur une ligne
  // Format 2 : "(N)" seul puis texte sur les lignes suivantes (format EUR-Lex consolidé)
  const NUM_RE = /^\((\d+)\)$/;
  const INLINE_RE = /^\((\d+)\)\s+(.+)$/;
  let i = 0;
  while (i < endLine) {
    const t = lines[i].trim();
    const inlineM = t.match(INLINE_RE);
    if (inlineM) {
      cons.push({ number: inlineM[1], content: `(${inlineM[1]}) ${inlineM[2]}` });
      i++; continue;
    }
    const numM = t.match(NUM_RE);
    if (numM) {
      // Chercher le texte sur les lignes suivantes (passer les vides)
      const contentLines: string[] = [];
      let j = i + 1;
      while (j < endLine) {
        const l = lines[j].trim();
        // Arrêt si on rencontre un nouveau numéro de considérant
        if (NUM_RE.test(l) || INLINE_RE.test(l)) break;
        // Arrêt si nouvelle structure majeure
        if (/^(CHAPITRE|SECTION|Article|ANNEXE|ONT )/.test(l)) break;
        if (l) contentLines.push(l);
        else if (contentLines.length > 0) break; // fin du paragraphe (ligne vide après contenu)
        j++;
      }
      if (contentLines.length > 0) {
        cons.push({ number: numM[1], content: `(${numM[1]}) ${contentLines.join(" ")}` });
      }
      i = j; continue;
    }
    i++;
  }
  return cons;
}

// ─── Extraction articles ────────────────────────────────────────────────────────

function extractArticles(text: string): Article[] {
  const lines = text.split("\n");
  // Trouver première annexe (arrêt parsing)
  let firstAnnexeLine = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^ANNEXE\s+[IVX]+$/.test(lines[i].trim())) { firstAnnexeLine = i; break; }
  }

  const ART_RE = /^Article (premier|\d+(?:\s+(?:bis|ter|quater|quinquies))?)$/;

  // Chapitres
  let currentChapter: string | null = null;
  const chapterAtLine: (string | null)[] = new Array(lines.length).fill(null);
  for (let i = 0; i < firstAnnexeLine; i++) {
    const t = lines[i].trim();
    if (/^CHAPITRE\s/.test(t)) {
      const num = t.replace(/^CHAPITRE\s+/, "").trim();
      let title = "";
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nxt = lines[j].trim();
        if (nxt && !/^CHAPITRE|^SECTION|^ANNEXE/.test(nxt)) { title = nxt; break; }
      }
      currentChapter = title ? `CHAPITRE ${num} — ${title}` : `CHAPITRE ${num}`;
    }
    chapterAtLine[i] = currentChapter;
  }

  // Starts d'articles
  const starts: { lineIdx: number; number: string }[] = [];
  for (let i = 0; i < firstAnnexeLine; i++) {
    const m = lines[i].trim().match(ART_RE);
    if (m) starts.push({ lineIdx: i, number: m[1] === "premier" ? "1" : m[1] });
  }

  // Fin des articles (pied de page / signatures)
  let footerStart = firstAnnexeLine;
  for (let i = 0; i < firstAnnexeLine; i++) {
    if (/^Fait à|^\(1\) JO|^Notes?\s*$|^Annexe\s*$/.test(lines[i].trim())) {
      if (starts.length > 0 && i > starts[starts.length - 1].lineIdx + 5) {
        footerStart = i; break;
      }
    }
  }

  const articles: Article[] = [];
  for (let s = 0; s < starts.length; s++) {
    const { lineIdx, number } = starts[s];
    const endLine = s + 1 < starts.length ? starts[s + 1].lineIdx : footerStart;
    const blockLines = lines.slice(lineIdx, endLine);
    const content = blockLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (content.length < 20) continue;

    let title: string | null = null;
    for (let j = 1; j < blockLines.length; j++) {
      const l = blockLines[j].trim();
      if (!l) continue;
      if (/^\d+\./.test(l) || /^[a-z]\)/.test(l) || /^CHAPITRE|^SECTION|^ANNEXE|^Article/.test(l)) break;
      title = l;
      break;
    }
    articles.push({ article_number: number, article_title: title, chapter: chapterAtLine[lineIdx], content });
  }
  return articles;
}

// ─── Extraction annexes ─────────────────────────────────────────────────────────

function extractAnnexes(text: string): Annexe[] {
  const lines = text.split("\n");
  const ANNEXE_RE = /^ANNEXE\s+([IVX]+)$/;
  const starts: { lineIdx: number; number: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(ANNEXE_RE);
    if (m) starts.push({ lineIdx: i, number: m[1] });
  }

  // Fin du texte
  let footerStart = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^Fait à|^\(1\) JO/.test(lines[i].trim())) { footerStart = i; break; }
  }

  const annexes: Annexe[] = [];
  for (let s = 0; s < starts.length; s++) {
    const { lineIdx, number } = starts[s];
    const endLine = s + 1 < starts.length ? starts[s + 1].lineIdx : footerStart;
    const blockLines = lines.slice(lineIdx, endLine);
    const content = blockLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (content.length < 20) continue;
    let title: string | null = null;
    for (let j = 1; j < Math.min(5, blockLines.length); j++) {
      const l = blockLines[j].trim();
      if (!l) continue;
      if (!/^ANNEXE/.test(l)) { title = l; break; }
    }
    annexes.push({ number, title, content });
  }
  return annexes;
}

// ─── Parsing Claude ────────────────────────────────────────────────────────────

const PARSE_SYSTEM = `Tu es un expert en droit européen. On te fournit le texte d'un article d'un règlement ou d'une directive EU.

Décompose-le en chunks atomiques :
- "paragraph" : chaque paragraphe numéroté (1., 2., 3...) ou le texte principal si non numéroté
- "point" : chaque sous-point lettre (a), b), c)...)

Règles :
- paragraph_number : "1", "2"... (toujours non-null pour les paragraphes — utiliser "1" si l'article n'a pas de numérotation)
- point_letter : "a", "b"... (null si ce n'est pas un point)
- Contenu autonome et compréhensible seul (inclure l'en-tête de l'article)
- Retourner JSON strict : { "chunks": [{ "granularity": "paragraph"|"point", "paragraph_number": "1"|"2"|..., "point_letter": "a"|null, "content": "..." }] }`;

async function parseWithClaude(anthropic: Anthropic, article: Article, reg: RegConfig): Promise<ParsedChunk[]> {
  const userMsg = `${reg.name}\nArticle ${article.article_number}${article.article_title ? ` — ${article.article_title}` : ""}\n\n${article.content}`;
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL, max_tokens: CLAUDE_MAX_TOKENS, temperature: 0,
    system: PARSE_SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });
  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Pas de JSON pour Art.${article.article_number}`);
  const parsed = JSON.parse(jsonMatch[0]) as { chunks: ParsedChunk[] };
  return parsed.chunks;
}

// ─── Pipeline d'un règlement ───────────────────────────────────────────────────

async function rechunkRegulation(reg: RegConfig) {
  const sourcePath = path.join(__dirname, "data", reg.file);
  if (!fs.existsSync(sourcePath)) throw new Error(`Fixture introuvable : ${sourcePath}`);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${reg.key} — ${reg.name}`);
  console.log(`${"=".repeat(70)}`);
  console.log(`Mode : ${dryRun ? "DRY-RUN" : "PRODUCTION"}`);

  const rawText = fs.readFileSync(sourcePath, "utf-8");
  const text = normalizeText(rawText);

  const considerants = extractConsiderants(text);
  const articles = extractArticles(text);
  const annexes = extractAnnexes(text);

  console.log(`Considérants : ${considerants.length}`);
  console.log(`Articles     : ${articles.length}`);
  console.log(`Annexes      : ${annexes.length}`);

  if (dryRun) {
    console.log(`[DRY-RUN] Aperçu articles : ${articles.slice(0,3).map(a=>`Art.${a.article_number}`).join(", ")}...`);
    if (annexes.length) console.log(`[DRY-RUN] Annexes : ${annexes.map(a=>`ANNEXE ${a.number}`).join(", ")}`);
    return null;
  }

  const sb = getSb();
  const anthropic = getAnthropic();
  const now = new Date().toISOString();

  // ── Pending document ─────────────────────────────────────────────────────────
  const { data: existing } = await sb.from("pending_documents").select("id,status").eq("celex", reg.celex).maybeSingle();
  let documentId: string;
  if (existing) {
    documentId = existing.id;
    console.log(`pending_document existant : ${documentId}`);
    await sb.from("staging_chunks").delete().eq("document_id", documentId);
    await sb.from("pending_documents").update({ status: "pending", updated_at: now }).eq("id", documentId);
    console.log(`  staging_chunks précédents supprimés.`);
  } else {
    const { data: inserted, error } = await sb.from("pending_documents").insert({
      celex: reg.celex, title: reg.name, document_type: reg.document_type,
      language: LANGUAGE, country: COUNTRY, source_url: reg.eurlex_url,
      status: "pending", detected_at: now, updated_at: now,
    }).select("id").single();
    if (error) throw new Error(`Erreur pending_document : ${error.message}`);
    documentId = (inserted as { id: string }).id;
    console.log(`pending_document créé : ${documentId}`);
  }

  // ── Préparer chunks ──────────────────────────────────────────────────────────
  const stagingChunks: StagingChunk[] = [];

  // 1. Considérants
  for (const c of considerants) {
    stagingChunks.push({
      id: crypto.randomUUID(), document_id: documentId, regulation: reg.name,
      article_number: `considérant ${c.number}`, paragraph_number: c.number, point_letter: null,
      article_title: null, chapter: null, granularity: "considerant", parent_chunk_id: null,
      content: c.content, language: LANGUAGE, country: COUNTRY,
      text_type: reg.text_type, source_type: SOURCE_TYPE,
      source_url: reg.eurlex_url, eurlex_url: reg.eurlex_url, publication_date: reg.version_date,
      chunk_hash: chunkHash(`${reg.name}|considerant|${c.number}|${LANGUAGE}|${c.content}`),
      parsed_at: now, validation_status: "pending",
    });
  }

  // 2. Annexes
  for (const a of annexes) {
    stagingChunks.push({
      id: crypto.randomUUID(), document_id: documentId, regulation: reg.name,
      article_number: `annexe ${a.number}`, paragraph_number: null, point_letter: null,
      article_title: a.title, chapter: null, granularity: "annexe", parent_chunk_id: null,
      content: a.content, language: LANGUAGE, country: COUNTRY,
      text_type: reg.text_type, source_type: SOURCE_TYPE,
      source_url: reg.eurlex_url, eurlex_url: reg.eurlex_url, publication_date: reg.version_date,
      chunk_hash: chunkHash(`${reg.name}|annexe|${a.number}|${LANGUAGE}|${a.content}`),
      parsed_at: now, validation_status: "pending",
    });
  }

  // 3. Articles + enfants via Claude
  console.log(`\nParsing ${articles.length} articles avec Claude Sonnet 4.6...`);
  let totalChildren = 0;
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const articleId = crypto.randomUUID();
    const articleContent = `Article ${article.article_number}${article.article_title ? ` — ${article.article_title}` : ""}\n\n${article.content}`;

    // Chunk article parent
    stagingChunks.push({
      id: articleId, document_id: documentId, regulation: reg.name,
      article_number: article.article_number, paragraph_number: null, point_letter: null,
      article_title: article.article_title, chapter: article.chapter,
      granularity: "article", parent_chunk_id: null,
      content: articleContent, language: LANGUAGE, country: COUNTRY,
      text_type: reg.text_type, source_type: SOURCE_TYPE,
      source_url: reg.eurlex_url, eurlex_url: reg.eurlex_url, publication_date: reg.version_date,
      chunk_hash: chunkHash(`${reg.name}|article|${article.article_number}|${LANGUAGE}|${articleContent}`),
      parsed_at: now, validation_status: "pending",
    });

    // Chunks enfants
    let children: ParsedChunk[] = [];
    try {
      children = await parseWithClaude(anthropic, article, reg);
      if (THROTTLE_MS > 0 && i < articles.length - 1) await sleep(THROTTLE_MS);
    } catch (e) {
      console.error(`  ⚠️  Erreur Art.${article.article_number} : ${(e as Error).message}`);
      continue;
    }

    let pCount = 0, ptCount = 0;
    for (const child of children) {
      const childId = crypto.randomUUID();
      // Fix : paragraph_number toujours non-null pour les paragraphes
      const paragraphNumber = child.granularity === "paragraph" && !child.paragraph_number
        ? "1" : child.paragraph_number;
      stagingChunks.push({
        id: childId, document_id: documentId, regulation: reg.name,
        article_number: article.article_number,
        paragraph_number: paragraphNumber,
        point_letter: child.point_letter,
        article_title: article.article_title, chapter: article.chapter,
        granularity: child.granularity, parent_chunk_id: articleId,
        content: child.content, language: LANGUAGE, country: COUNTRY,
        text_type: reg.text_type, source_type: SOURCE_TYPE,
        source_url: reg.eurlex_url, eurlex_url: reg.eurlex_url, publication_date: reg.version_date,
        chunk_hash: chunkHash(`${reg.name}|${child.granularity}|${article.article_number}|${paragraphNumber ?? ""}|${child.point_letter ?? ""}|${LANGUAGE}|${child.content}`),
        parsed_at: now, validation_status: "pending",
      });
      if (child.granularity === "paragraph") pCount++;
      else ptCount++;
      totalChildren++;
    }

    if ((i + 1) % 10 === 0 || i === articles.length - 1) {
      process.stdout.write(`\r  Art.${article.article_number.padEnd(4)} [${i+1}/${articles.length}] — ${stagingChunks.length} chunks total`);
    }
  }
  console.log();

  // ── Insertion par batch ───────────────────────────────────────────────────────
  const total = stagingChunks.length;
  console.log(`\nInsertion de ${total} chunks...`);
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < stagingChunks.length; i += BATCH) {
    const batch = stagingChunks.slice(i, i + BATCH);
    const { error } = await sb.from("staging_chunks").insert(batch);
    if (error) throw new Error(`Erreur insertion batch ${i} : ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`\r  Inséré : ${inserted}/${total}`);
  }
  console.log();

  // ── Passer en staged ──────────────────────────────────────────────────────────
  await sb.from("pending_documents").update({ status: "staged", updated_at: new Date().toISOString() }).eq("id", documentId);

  console.log(`\n✅ ${reg.key} staging terminé :`);
  console.log(`   Document ID : ${documentId}`);
  console.log(`   Total       : ${total} chunks`);
  console.log(`   Considérants: ${considerants.length}`);
  console.log(`   Articles    : ${articles.length}`);
  console.log(`   Annexes     : ${annexes.length}`);
  console.log(`   Enfants     : ${totalChildren}`);

  return { documentId, total, considerants: considerants.length, articles: articles.length, annexes: annexes.length, children: totalChildren };
}

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

// ─── Entry point ──────────────────────────────────────────────────────────────

void (async () => {
  if (!regKey) {
    console.error("Usage: --reg=DSA|DMA|CRA|DATA_ACT|DGA|DSM|MACHINE|NIS2|all");
    process.exit(1);
  }

  const toProcess = regKey === "ALL"
    ? REGULATIONS
    : REGULATIONS.filter(r => r.key === regKey);

  if (toProcess.length === 0) {
    console.error(`Règlement inconnu : ${regKey}. Valides : ${REGULATIONS.map(r=>r.key).join(", ")}`);
    process.exit(1);
  }

  const results = [];
  for (const reg of toProcess) {
    const result = await rechunkRegulation(reg);
    if (result) results.push({ reg: reg.key, ...result });
  }

  if (results.length > 0 && !dryRun) {
    console.log(`\n${"=".repeat(70)}`);
    console.log("  RÉCAPITULATIF STAGING");
    console.log("=".repeat(70));
    results.forEach(r => console.log(`  ${r.reg.padEnd(10)} : ${r.total} chunks (${r.considerants} cons. + ${r.articles} art. + ${r.annexes} annexes + ${r.children} enfants)`));
    console.log("\nProchaine étape : valider dans /dashboard/admin/rag-validation");
  }

  if (dryRun) console.log("\n[DRY-RUN] Aucune écriture. Relancez sans --dry-run.");
})().catch(e => { console.error("\n❌ Erreur fatale:", e); process.exit(1); });
