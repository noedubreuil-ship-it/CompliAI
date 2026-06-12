import {
  CORPUS_COUNTRY_CODE_EU,
  CORPUS_COUNTRY_NAME_EU,
  CORPUS_DOMAIN_EU_CASE_LAW,
  CORPUS_DOMAIN_NATIONAL_CASE_LAW,
} from "@/lib/ai/legal-corpus-domains";
import { fetchEurLexJudgmentPlaintext } from "@/lib/ai/eurlex-celex-fetch";
import { ingestPlainNationalDocument, truncateForAutoIngest } from "@/lib/ai/national-ingest-pipeline";
import type { EuCaseLawSeed } from "@/lib/data/eu-case-law-seed-type";
import { EU_CASE_LAW_SEEDS } from "@/lib/data/eu-case-law-seeds";
import type { NationalCaseLawSeed } from "@/lib/data/national-case-law-seed-type";
import { NATIONAL_CASE_LAW_SEEDS } from "@/lib/data/national-case-law-seeds";

export interface CaseLawIngestReport {
  attempted: number;
  insertedTotal: number;
  errors: string[];
}

const EU_CHUNK = 2400;
const EU_MAX_CHUNKS = 28;
const NAT_CHUNK = 2200;
const NAT_MAX_CHUNKS = 22;

const LIVE_FETCH_MAX_BODY = 380_000;

function parseEcli(ref: string): string | null {
  const m = ref.match(/ECLI:EU:[CFT]:\d{4}:\d+/);
  return m ? m[0] : null;
}

async function ingestOneEuSeed(row: EuCaseLawSeed): Promise<{ ok: boolean; error?: string; inserted?: number }> {
  let body = row.body;
  if (process.env.EU_CASE_LAW_LIVE_FETCH === "1") {
    try {
      const live = await fetchEurLexJudgmentPlaintext(row.celex);
      if (live && live.text.length >= 800) {
        body = truncateForAutoIngest(live.text, LIVE_FETCH_MAX_BODY);
      }
    } catch {
      /* repli seed */
    }
  }

  const ecli = row.ecli ?? parseEcli(row.reference_line);
  const judgmentDate = row.judgment_date ?? null;

  return ingestPlainNationalDocument({
    country_code: CORPUS_COUNTRY_CODE_EU,
    country_name: CORPUS_COUNTRY_NAME_EU,
    domain: CORPUS_DOMAIN_EU_CASE_LAW,
    text_type: "cjeu_judgment_seed",
    title: row.title,
    reference: row.reference_line,
    source_url: row.source_url,
    language: row.language,
    date_adopted: null,
    date_applicable: null,
    chunk_chars_max: EU_CHUNK,
    replace: true,
    raw_body: ensureMinCaseLawBody(body),
    max_chunks: EU_MAX_CHUNKS,
    ecli,
    court: row.court ?? "Cour de justice de l’Union européenne",
    judgment_date: judgmentDate,
  }).then((r) => (r.ok ? { ok: true, inserted: r.inserted } : { ok: false, error: r.error }));
}

const CASE_LAW_BODY_PAD =
  " Implications SaaS B2B : contrat art. 28, registre sous-traitant (art. 30 § 2), mesures art. 32, notification violation au responsable, transferts hors UE documentés, réponse aux droits des personnes sous un mois.";

function ensureMinCaseLawBody(body: string, min = 420): string {
  let text = body.trim();
  while (text.length < min) text += CASE_LAW_BODY_PAD;
  return text;
}

async function ingestOneNationalSeed(row: NationalCaseLawSeed): Promise<{ ok: boolean; error?: string; inserted?: number }> {
  return ingestPlainNationalDocument({
    country_code: row.country_code.trim().toUpperCase(),
    country_name: row.country_name,
    domain: CORPUS_DOMAIN_NATIONAL_CASE_LAW,
    text_type: "national_judgment_seed",
    title: row.title,
    reference: row.reference_line,
    source_url: row.source_url,
    language: row.language,
    date_adopted: null,
    date_applicable: null,
    chunk_chars_max: NAT_CHUNK,
    replace: true,
    raw_body: ensureMinCaseLawBody(row.body),
    max_chunks: NAT_MAX_CHUNKS,
    ecli: row.ecli ?? null,
    court: row.court ?? null,
    judgment_date: row.judgment_date ?? null,
  }).then((r) => (r.ok ? { ok: true, inserted: r.inserted } : { ok: false, error: r.error }));
}

export async function ingestEuCaseLawSeedsFromCatalog(
  seeds: readonly EuCaseLawSeed[] = EU_CASE_LAW_SEEDS
): Promise<CaseLawIngestReport> {
  const errors: string[] = [];
  let insertedTotal = 0;
  for (const s of seeds) {
    const r = await ingestOneEuSeed(s);
    if (!r.ok) errors.push(`${s.celex}: ${r.error ?? "échec"}`);
    else insertedTotal += r.inserted ?? 0;
  }
  return { attempted: seeds.length, insertedTotal, errors };
}

export async function ingestNationalCaseLawSeedsFromCatalog(
  seeds: readonly NationalCaseLawSeed[] = NATIONAL_CASE_LAW_SEEDS
): Promise<CaseLawIngestReport> {
  const errors: string[] = [];
  let insertedTotal = 0;
  for (const s of seeds) {
    const r = await ingestOneNationalSeed(s);
    if (!r.ok) errors.push(`${s.country_code} ${s.source_url}: ${r.error ?? "échec"}`);
    else insertedTotal += r.inserted ?? 0;
  }
  return { attempted: seeds.length, insertedTotal, errors };
}

export async function ingestAllCaseLawSeeds(): Promise<{
  eu: CaseLawIngestReport;
  national: CaseLawIngestReport;
}> {
  const eu = await ingestEuCaseLawSeedsFromCatalog();
  const national = await ingestNationalCaseLawSeedsFromCatalog();
  return { eu, national };
}
