/**
 * Pipeline d’écriture dans `national_legal_texts` (chunks + embeddings + Supabase).
 */

import { createClient } from "@supabase/supabase-js";

import { embedBatch } from "@/lib/ai/embeddings";
import { chunkLegalText, stripHtml } from "@/lib/ai/national-ingest-core";

export interface NationalIngestPlainInput {
  country_code: string;
  country_name: string;
  domain: string;
  text_type: string;
  title: string;
  reference: string;
  source_url: string;
  language: string;
  date_adopted: string | null;
  date_applicable: string | null;
  chunk_chars_max: number;
  replace: boolean;
  /** Texte brut ou HTML ; sera stripé puis découpé. */
  raw_body: string;
  /** Optionnel — limite du nombre de segments (auto-ingestion). */
  max_chunks?: number;
  /** Métadonnées jurisprudentielles (col. Supabase 013+). */
  ecli?: string | null;
  court?: string | null;
  judgment_date?: string | null;
}

type NationalTableClient = {
  from: (name: string) => {
    delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    insert: (rows: unknown[]) => Promise<{ error: { message: string } | null }>;
  };
};

function adminNationalTable(): NationalTableClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.");
  const client = createClient(url, key);
  return client as unknown as NationalTableClient;
}

/**
 * Ingère du texte national : découpage, embeddings, insertion.
 * Utilisé par le script CLI et par l’ingestion automatique depuis les URL officielles.
 */
export async function ingestPlainNationalDocument(
  input: NationalIngestPlainInput
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const plain = stripHtml(input.raw_body).trim();
  if (plain.length < 400) {
    return { ok: false, error: `Corps trop court après nettoyage (${plain.length} caractères).` };
  }

  const piecesAll = chunkLegalText(plain, input.chunk_chars_max);
  const pieces =
    typeof input.max_chunks === "number" && input.max_chunks > 0
      ? piecesAll.slice(0, input.max_chunks)
      : piecesAll;
  if (pieces.length === 0) {
    return { ok: false, error: "Aucun chunk exploitable après découpage." };
  }

  let nationalTable: NationalTableClient;
  try {
    nationalTable = adminNationalTable();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  if (input.replace) {
    const { error: delErr } = await nationalTable.from("national_legal_texts").delete().eq("source_url", input.source_url);
    if (delErr) return { ok: false, error: delErr.message };
  }

  const BATCH = 40;
  let inserted = 0;

  for (let i = 0; i < pieces.length; i += BATCH) {
    const batch = pieces.slice(i, i + BATCH);
    const contents = batch.map((b, j) => {
      const ordinal = `segment ${i + j + 1}/${pieces.length}`;
      return `${input.country_name} (${input.country_code}) — ${input.title} — ${ordinal} [${b.label}]\n\n${b.content}`;
    });

    let vectors: number[][];
    try {
      vectors = await embedBatch(contents);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    const rows = batch.map((b, j) => {
      const ordinal = `${i + j + 1}/${pieces.length}`;
      const rowTitle = `${input.title} — partie ${ordinal} (${b.label})`;
      const rowReference =
        input.reference ?
          `${input.reference} — ${b.label} — partie ${ordinal}`
        : `${b.label} (${ordinal})`;

      return {
        country_code: input.country_code,
        country_name: input.country_name,
        domain: input.domain,
        text_type: input.text_type,
        title: rowTitle,
        reference: rowReference || null,
        date_adopted: input.date_adopted,
        date_applicable: input.date_applicable,
        content: b.content,
        embedding: vectors[j],
        source_url: input.source_url,
        language: input.language,
        is_current: true,
        ecli: input.ecli ?? null,
        court: input.court ?? null,
        judgment_date: input.judgment_date ?? null,
      };
    });

    const { error } = await nationalTable.from("national_legal_texts").insert(rows);
    if (error) return { ok: false, error: error.message };
    inserted += rows.length;
  }

  return { ok: true, inserted };
}

/** Limite supérieure pour ne pas saturer la base sur des pages énormes (auto-ingest). */
export function truncateForAutoIngest(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[… contenu tronqué pour limite d’ingestion automatique …]`;
}
