/**
 * Ingestion manuelle dans `national_legal_texts` — alternative aux fichiers data-national.
 * Lors des consultations (`/api/chat`), l’ingestion automatique peut aussi peupler ce corpus
 * (voir `lib/ai/national-auto-ingest.ts`, désactivable via NATIONAL_AUTO_INGEST=0).
 *
 * Usage :
 *   npm run ingest:national
 *       → tous les fichiers .md et .txt dans scripts/data-national/
 *   npm run ingest:national -- chemin/relatif/ou/absolu/fichier.md
 *   npm run ingest:national -- --dry-run scripts/data-national/mon.md
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY (via .env.local)
 *
 * Front-matter YAML (fichiers .md et .txt) — même schéma qu’auparavant.
 * Pour la jurisprudence : utiliser `domain: eu_case_law` + `country_code: EU` / `country_name: Union européenne`
 * ou `domain: national_case_law` + code pays ISO (DE, FR…). Voir `lib/ai/legal-corpus-domains.ts`.
 */

import * as fs from "fs";
import * as path from "path";

import { ingestPlainNationalDocument } from "@/lib/ai/national-ingest-pipeline";
import { stripHtml } from "@/lib/ai/national-ingest-core";

const DATA_DIR = path.join(__dirname, "data-national");

function stripMarkdownNoise(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\*{0,2}[^:]+:\*{0,2}\s*\n/gm, "")
    .trim();
}

interface NationalDocMeta {
  country_code: string;
  country_name: string;
  domain: string;
  text_type: string;
  title: string;
  reference: string;
  source_url: string;
  corpus_slug: string;
  replace: boolean;
  date_adopted: string | null;
  date_applicable: string | null;
  language: string;
  chunk_chars_max: number;
  body: string;
}

interface RawFrontMatter {
  yaml: string;
  body: string;
}

function splitFrontMatter(raw: string): RawFrontMatter | null {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  return { yaml: m[1], body: m[2] };
}

function yamlGet(yaml: string, key: string): string {
  const line = yaml.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  if (!line) return "";
  let v = line[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

function yamlGetBool(yaml: string, key: string, defaultVal: boolean): boolean {
  const v = yamlGet(yaml, key).toLowerCase();
  if (!v) return defaultVal;
  return v === "true" || v === "1" || v === "yes";
}

function isoDateOrNull(value: string): string | null {
  const t = value.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const y = t.match(/^(\d{4})/)?.[1];
  return y ? `${y}-01-01` : null;
}

function parseNationalDoc(filename: string, raw: string): NationalDocMeta {
  const basename = path.basename(filename).replace(/\.(md|txt)$/i, "");
  const fm = splitFrontMatter(raw.trim());
  if (!fm) {
    throw new Error(
      `[${filename}] Front-matter YAML obligatoire (--- ... ---) avec au minimum country_code, country_name, title.`
    );
  }
  const { yaml, body } = fm;

  const country_code = yamlGet(yaml, "country_code").toUpperCase();
  const country_name = yamlGet(yaml, "country_name");
  const title = yamlGet(yaml, "title");
  if (!/^[A-Z]{2}$/.test(country_code)) {
    throw new Error(`[${filename}] country_code invalide (attendu ex. FR, DE).`);
  }
  if (!country_name) throw new Error(`[${filename}] country_name manquant.`);
  if (!title) throw new Error(`[${filename}] title manquant.`);

  const domain = yamlGet(yaml, "domain") || "rgpd_nat";
  const text_type = yamlGet(yaml, "text_type") || "statute_consolidated";
  const reference = yamlGet(yaml, "reference");
  const corpusSlug = yamlGet(yaml, "corpus_slug") || basename.replace(/\s+/g, "-").toLowerCase();
  const source_url_user = yamlGet(yaml, "source_url");

  let source_url = source_url_user;
  if (!source_url) {
    source_url = `urn:compliai:national:${country_code}:${corpusSlug}`;
  }

  const replace = yamlGetBool(yaml, "replace", true);
  const chunkMax = Number(yamlGet(yaml, "chunk_chars_max")) || 2000;
  if (chunkMax < 400 || chunkMax > 16000) {
    throw new Error(`[${filename}] chunk_chars_max doit être entre 400 et 16000.`);
  }

  let plain = stripHtml(body);
  if (filename.toLowerCase().endsWith(".md")) plain = stripMarkdownNoise(plain);

  return {
    country_code,
    country_name,
    domain,
    text_type,
    title,
    reference: reference || "",
    source_url,
    corpus_slug: corpusSlug,
    replace,
    date_adopted: isoDateOrNull(yamlGet(yaml, "date_adopted")),
    date_applicable: isoDateOrNull(yamlGet(yaml, "date_applicable")),
    language: yamlGet(yaml, "language") || "fr",
    chunk_chars_max: chunkMax,
    body: plain.trim(),
  };
}

async function ingestOneFile(filePath: string, dryRun: boolean) {
  const filename = path.basename(filePath);
  console.log(`\n[National RAG] Fichier : ${filename}`);
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) {
    console.warn("  Vide : ignoré.");
    return;
  }

  let meta: NationalDocMeta;
  try {
    meta = parseNationalDoc(filename, raw);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return;
  }

  console.log(`  Pays : ${meta.country_code} — ${meta.title}`);
  console.log(`  source_url : ${meta.source_url}`);

  if (dryRun) {
    console.log("  [dry-run] pas d’écriture.");
    return;
  }

  const result = await ingestPlainNationalDocument({
    country_code: meta.country_code,
    country_name: meta.country_name,
    domain: meta.domain,
    text_type: meta.text_type,
    title: meta.title,
    reference: meta.reference,
    source_url: meta.source_url,
    language: meta.language,
    date_adopted: meta.date_adopted,
    date_applicable: meta.date_applicable,
    chunk_chars_max: meta.chunk_chars_max,
    replace: meta.replace,
    raw_body: meta.body,
  });

  if (result.ok) console.log(`  Terminé : ${result.inserted} ligne(s).`);
  else console.error(`  Erreur : ${result.error}`);
}

function listDataFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(md|txt)$/i.test(ent.name)) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const args = argv.filter((a) => a !== "--dry-run");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Variables Supabase manquantes.");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY manquant.");
    process.exit(1);
  }

  console.log("CompliAI — Ingestion national_legal_texts (fichiers manuels)");
  if (dryRun) console.log("(mode --dry-run)\n");

  if (args.length > 0) {
    const p = path.isAbsolute(args[0]) ? args[0] : path.resolve(process.cwd(), args[0]);
    if (!fs.existsSync(p)) {
      console.error(`Fichier introuvable : ${p}`);
      process.exit(1);
    }
    await ingestOneFile(p, dryRun);
  } else {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.error(`Répertoire créé : ${DATA_DIR}`);
      process.exit(1);
    }
    const files = listDataFiles(DATA_DIR);
    if (files.length === 0) {
      console.error(`Aucun fichier dans ${DATA_DIR}`);
      process.exit(1);
    }
    for (const f of files) await ingestOneFile(f, dryRun);
  }

  console.log("\n[Succès]");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
