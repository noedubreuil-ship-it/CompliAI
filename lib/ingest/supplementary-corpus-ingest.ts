import {
  CORPUS_DOMAIN_INTL_STANDARDS,
  CORPUS_DOMAIN_UK_REGULATOR,
} from "@/lib/ai/legal-corpus-domains";
import { ingestPlainNationalDocument } from "@/lib/ai/national-ingest-pipeline";
import {
  SUPPLEMENTARY_RAG_SEEDS,
  type SupplementaryRagSeed,
} from "@/lib/data/supplementary-rag-seeds";

export interface SupplementaryIngestReport {
  attempted: number;
  insertedTotal: number;
  errors: string[];
}

const CHUNK_BY_DOMAIN: Record<string, { chunk: number; max: number }> = {
  [CORPUS_DOMAIN_UK_REGULATOR]: { chunk: 2200, max: 22 },
  [CORPUS_DOMAIN_INTL_STANDARDS]: { chunk: 2400, max: 26 },
  default: { chunk: 2200, max: 22 },
};

async function ingestOneSupplementarySeed(
  row: SupplementaryRagSeed
): Promise<{ ok: boolean; error?: string; inserted?: number }> {
  const sizing = CHUNK_BY_DOMAIN[row.domain] ?? CHUNK_BY_DOMAIN.default;

  return ingestPlainNationalDocument({
    country_code: row.country_code.trim().toUpperCase(),
    country_name: row.country_name,
    domain: row.domain,
    text_type: row.text_type,
    title: row.title,
    reference: row.reference_line,
    source_url: row.source_url,
    language: row.language,
    date_adopted: null,
    date_applicable: null,
    chunk_chars_max: sizing.chunk,
    replace: true,
    raw_body: row.body,
    max_chunks: sizing.max,
    court: row.court ?? null,
    judgment_date: null,
  }).then((r) => (r.ok ? { ok: true, inserted: r.inserted } : { ok: false, error: r.error }));
}

export async function ingestSupplementaryCorpusSeeds(
  seeds: readonly SupplementaryRagSeed[] = SUPPLEMENTARY_RAG_SEEDS
): Promise<SupplementaryIngestReport> {
  const errors: string[] = [];
  let insertedTotal = 0;
  for (const s of seeds) {
    const r = await ingestOneSupplementarySeed(s);
    if (!r.ok) errors.push(`${s.domain} ${s.source_url}: ${r.error ?? "échec"}`);
    else insertedTotal += r.inserted ?? 0;
  }
  return { attempted: seeds.length, insertedTotal, errors };
}
