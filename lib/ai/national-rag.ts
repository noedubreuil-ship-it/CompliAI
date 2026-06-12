import { createClient } from "@supabase/supabase-js";

import {
  CORPUS_COUNTRY_CODE_EU,
  CORPUS_COUNTRY_CODE_GB,
  CORPUS_DOMAIN_EU_CASE_LAW,
  CORPUS_DOMAIN_INTL_STANDARDS,
  CORPUS_DOMAIN_NATURAL_STATUTE,
  CORPUS_DOMAIN_NATIONAL_CASE_LAW,
  CORPUS_DOMAIN_UK_REGULATOR,
} from "@/lib/ai/legal-corpus-domains";
import { embedText } from "./embeddings";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface NationalLegalText {
  id: string;
  country_code: string;
  country_name: string;
  domain: string;
  text_type: string;
  title: string;
  reference: string | null;
  content: string;
  source_url: string | null;
  ecli?: string | null;
  court?: string | null;
  judgment_date?: string | null;
  similarity?: number;
}

async function searchNationalCorpusVectors(
  query: string,
  options: {
    countryCodes: string[];
    filterDomains: string[] | null;
    matchCount: number;
    threshold: number;
  }
): Promise<NationalLegalText[]> {
  const { countryCodes, filterDomains, matchCount, threshold } = options;
  if (!countryCodes.length) return [];

  const supabase = getSupabaseAdmin();
  const embedding = await embedText(query);
  const upper = [...new Set(countryCodes.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))];
  if (!upper.length) return [];

  const { data, error } = await supabase.rpc("search_national_legal_texts", {
    query_embedding: embedding,
    filter_country_codes: upper,
    match_threshold: threshold,
    match_count: matchCount,
    filter_domains:
      filterDomains && filterDomains.length > 0 ?
        filterDomains
      : null,
  });

  if (error) {
    console.error("[national-rag] search_national_legal_texts:", error.message);
    return [];
  }

  return (data as NationalLegalText[]) ?? [];
}

/** Recherche sémantique : conservé pour compatibilité (tous domains indexés pour les pays donnés). */
export async function searchNationalLegalTexts(
  query: string,
  countryCodes: string[],
  matchCount = 4,
  threshold = 0.58
): Promise<NationalLegalText[]> {
  return searchNationalCorpusVectors(query, {
    countryCodes,
    filterDomains: null,
    matchCount,
    threshold,
  });
}

/** Lois / actes nationaux (transposition RGPD, etc.). */
export async function searchNationalStatuteTexts(
  query: string,
  countryCodes: string[],
  matchCount = 4,
  threshold = 0.58
): Promise<NationalLegalText[]> {
  return searchNationalCorpusVectors(query, {
    countryCodes,
    filterDomains: [CORPUS_DOMAIN_NATURAL_STATUTE],
    matchCount,
    threshold,
  });
}

/** Nombre de segments `rgpd_nat` indexés pour un pays (toutes sources confondues). */
export async function countNationalRgpdNatSegments(countryCode: string): Promise<number> {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return 0;

  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("national_legal_texts")
    .select("id", { count: "exact", head: true })
    .eq("country_code", code)
    .eq("domain", CORPUS_DOMAIN_NATURAL_STATUTE)
    .eq("is_current", true);

  if (error) {
    console.error("[national-rag] countNationalRgpdNatSegments:", code, error.message);
    return 0;
  }
  return count ?? 0;
}

function dedupeNationalChunks(chunks: NationalLegalText[]): NationalLegalText[] {
  const seen = new Set<string>();
  return chunks.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/**
 * Liste des segments nationaux en base (sans embedding) — filet quand la recherche
 * vectorielle ne remonte rien ou omet un pays explicitement visé.
 */
export async function listNationalStatuteTextsForCountries(
  countryCodes: string[],
  limitPerCountry = 2
): Promise<NationalLegalText[]> {
  const upper = [...new Set(countryCodes.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))];
  if (!upper.length) return [];

  const supabase = getSupabaseAdmin();
  const rows: NationalLegalText[] = [];

  for (const code of upper) {
    const { data, error } = await supabase
      .from("national_legal_texts")
      .select(
        "id, country_code, country_name, domain, text_type, title, reference, content, source_url, ecli, court, judgment_date"
      )
      .eq("country_code", code)
      .eq("domain", CORPUS_DOMAIN_NATURAL_STATUTE)
      .eq("is_current", true)
      .order("updated_at", { ascending: false })
      .limit(limitPerCountry);

    if (error) {
      console.error("[national-rag] listNationalStatuteTextsForCountries:", code, error.message);
      continue;
    }
    if (data?.length) rows.push(...(data as NationalLegalText[]));
  }

  return rows;
}

/**
 * Recherche vectorielle + retry seuil bas + complément par pays manquant.
 */
export async function resolveNationalStatuteChunksForChat(
  question: string,
  countryCodes: string[],
  matchCount: number,
  threshold: number
): Promise<NationalLegalText[]> {
  if (!countryCodes.length) return [];

  let chunks = await searchNationalStatuteTexts(question, countryCodes, matchCount, threshold);

  const minExpected = Math.min(countryCodes.length, 3);
  if (chunks.length < minExpected) {
    const retry = await searchNationalStatuteTexts(question, countryCodes, matchCount, 0.42);
    chunks = dedupeNationalChunks([...chunks, ...retry]);
  }

  const codesWithHits = new Set(chunks.map((c) => c.country_code.toUpperCase()));
  const missing = countryCodes.filter((c) => !codesWithHits.has(c.trim().toUpperCase()));
  if (missing.length > 0) {
    const listed = await listNationalStatuteTextsForCountries(missing, 2);
    chunks = dedupeNationalChunks([...chunks, ...listed]);
  }

  return chunks;
}

/** Arrêts CJUE / TJUE / TG indexés avec domain = eu_case_law, country_code = EU. */
export async function searchEuCaseLawTexts(
  query: string,
  matchCount = 4,
  threshold = 0.52
): Promise<NationalLegalText[]> {
  return searchNationalCorpusVectors(query, {
    countryCodes: [CORPUS_COUNTRY_CODE_EU],
    filterDomains: [CORPUS_DOMAIN_EU_CASE_LAW],
    matchCount,
    threshold,
  });
}

/** Jurisprudence nationale (tribunaux de l’État membre détecté dans la question). */
export async function searchNationalCaseLawTexts(
  query: string,
  countryCodes: string[],
  matchCount = 4,
  threshold = 0.52
): Promise<NationalLegalText[]> {
  return searchNationalCorpusVectors(query, {
    countryCodes,
    filterDomains: [CORPUS_DOMAIN_NATIONAL_CASE_LAW],
    matchCount,
    threshold,
  });
}

/** Cadres ISO 42001, NIST AI RMF, OCDE, guide CURIA (country_code = EU). */
export async function searchIntlStandardsTexts(
  query: string,
  matchCount = 4,
  threshold = 0.52
): Promise<NationalLegalText[]> {
  return searchNationalCorpusVectors(query, {
    countryCodes: [CORPUS_COUNTRY_CODE_EU],
    filterDomains: [CORPUS_DOMAIN_INTL_STANDARDS],
    matchCount,
    threshold,
  });
}

/** Doctrine ICO / UK GDPR (country_code = GB). */
export async function searchUkRegulatorTexts(
  query: string,
  matchCount = 4,
  threshold = 0.52
): Promise<NationalLegalText[]> {
  return searchNationalCorpusVectors(query, {
    countryCodes: [CORPUS_COUNTRY_CODE_GB],
    filterDomains: [CORPUS_DOMAIN_UK_REGULATOR],
    matchCount,
    threshold,
  });
}

export function buildNationalLegalContext(chunks: NationalLegalText[], sectionLabel?: string): string {
  if (chunks.length === 0) return "";

  const body = chunks
    .map((c) => {
      const metaBits = [c.ecli, c.court, c.reference, c.country_name].filter(Boolean).join(" — ");
      const ref = [metaBits, c.domain, c.title].filter(Boolean).join(" — ");
      return `[${ref}]\n${c.content}`;
    })
    .join("\n\n---\n\n");

  return sectionLabel ? `${sectionLabel}\n${body}` : body;
}
