/**
 * Ingestion automatique du droit national depuis les URL du registre UE-27 lors des consultations.
 *
 * - Liste blanche stricte des hôtes (`allowed_domains` + domaines EU institutionnels).
 * - Pas d’URL arbitraire : uniquement `gdpr_law.fetch_url` lorsqu’elle existe pour le pays.
 * - Rafraîchissement paresseux avec TTL (env) pour limiter coût / charge.
 *
 * Les consolidations en ligne peuvent être partiellement rendues en HTML/JS : l’extraction reste
 * heuristique ; l’utilisateur doit confirmer sur le site officiel (déjà prévu au prompt consultant).
 */

import { createClient } from "@supabase/supabase-js";

import { EU27, getNationalStatuteFetchCandidates } from "@/lib/data/eu27-registry";
import { fetchGesetzeImInternetStatute } from "@/lib/ai/national-fetch-gesetze-de";
import { countNationalRgpdNatSegments } from "@/lib/ai/national-rag";
import {
  getNationalStatuteFallbackSeed,
  type NationalStatuteFallbackSeed,
} from "@/lib/data/national-statute-fallback-seeds";
import { isExploitableStatutePlaintext } from "@/lib/ai/national-statute-plaintext";
import { statutePlaintextMatchesRegistry } from "@/lib/ai/national-statute-fetch-quality";
import { ingestPlainNationalDocument, truncateForAutoIngest } from "@/lib/ai/national-ingest-pipeline";
import { fetchAllowlistedNationalHttpsPage } from "@/lib/ai/national-fetch-page";

export { isNationalFetchHostnameAllowed } from "@/lib/ai/national-fetch-allowlist";

const rawTtlH = Number(process.env.NATIONAL_AUTO_INGEST_TTL_HOURS);
const DEFAULT_TTL_HOURS = Number.isFinite(rawTtlH) && rawTtlH >= 0 ? rawTtlH : 168;
export function getNationalIngestTtlMs(): number {
  return DEFAULT_TTL_HOURS * 3600 * 1000;
}
const DEFAULT_DEADLINE_MS = Number(process.env.NATIONAL_AUTO_INGEST_BUDGET_MS) || 12000;
export { fetchAllowlistedNationalHttpsPage } from "@/lib/ai/national-fetch-page";

/** Troncature du HTML brut avant découpage (caractères). */
const MAX_AUTO_BODY_CHARS = Number(process.env.NATIONAL_AUTO_INGEST_MAX_BODY_CHARS) || 600_000;
const MAX_CHUNKS = Math.min(Number(process.env.NATIONAL_AUTO_INGEST_MAX_CHUNKS) || 100, 200);
const CHUNK_CHARS = Math.min(Math.max(Number(process.env.NATIONAL_AUTO_INGEST_CHUNK_CHARS) || 2000, 800), 6000);

function supabaseAny() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function isNationalLegalSourceFreshForUrl(sourceUrl: string, ttlMs: number): Promise<boolean> {
  return nationalSourceStillFresh(sourceUrl, ttlMs);
}

async function nationalSourceStillFresh(sourceUrl: string, ttlMs: number): Promise<boolean> {
  const sb = supabaseAny();
  if (!sb) return false;
  const { data, error } = await (sb as any)
    .from("national_legal_texts")
    .select("updated_at")
    .eq("source_url", sourceUrl)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.updated_at) return false;
  const t = new Date(data.updated_at as string).getTime();
  return Date.now() - t < ttlMs;
}

export type DirectNationalIngestResult = {
  code: string;
  status: "indexed" | "fresh_ttl" | "skipped_no_source" | "no_fetch" | "ingest_error" | "skipped_env";
  summary: string;
  inserted?: number;
};

async function ingestFetchedNationalStatute(
  code: string,
  row: (typeof EU27)[string],
  canonicalSourceUrl: string,
  fetched: { text: string; finalUrl: string },
  textType: "statute_consolidated_auto" | "statute_consolidated_direct" | "statute_consolidated_fallback"
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  let body = truncateForAutoIngest(fetched.text, MAX_AUTO_BODY_CHARS);
  if (body.length > CHUNK_CHARS * MAX_CHUNKS * 0.5) {
    body = body.slice(0, Math.floor(CHUNK_CHARS * MAX_CHUNKS * 0.55));
  }

  let hostLabel = canonicalSourceUrl;
  try {
    hostLabel = new URL(fetched.finalUrl || canonicalSourceUrl).hostname;
  } catch {
    /* ignore */
  }

  const dpaLang = row.dpa.language.split(/[,/|]/)[0]?.trim()?.toLowerCase() || "";
  const language = /^[a-z]{2}$/.test(dpaLang) ? dpaLang : "fr";

  const result = await ingestPlainNationalDocument({
    country_code: code,
    country_name: row.name_fr,
    domain: "rgpd_nat",
    text_type: textType,
    title: `${row.gdpr_law.title} (cache auto - ${hostLabel})`,
    reference: `${row.gdpr_law.reference} - source ${fetched.finalUrl}`,
    source_url: canonicalSourceUrl,
    language,
    date_adopted:
      typeof row.gdpr_law.year === "number" && row.gdpr_law.year > 1850 && row.gdpr_law.year < 2100
        ? `${row.gdpr_law.year}-01-01`
        : null,
    date_applicable: null,
    chunk_chars_max: CHUNK_CHARS,
    replace: true,
    raw_body: body,
    max_chunks: MAX_CHUNKS,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, inserted: result.inserted };
}

/** Aligné sur le minimum d'ingestPlainNationalDocument (400). */
const MIN_STATUTE_BODY_CHARS = 400;

/** Seuil minimal de segments rgpd_nat par pays (sinon complément synthèse). */
const MIN_RGPD_NAT_SEGMENTS_PER_COUNTRY = 5;

async function ensureSynthesisSupplementIfSparse(
  code: string,
  row: (typeof EU27)[string],
  officialInserted?: number
): Promise<string> {
  const fallback = getNationalStatuteFallbackSeed(code);
  if (!fallback || fallback.body.length < MIN_STATUTE_BODY_CHARS) return "";

  const total = await countNationalRgpdNatSegments(code);
  const officialThin =
    typeof officialInserted === "number" && officialInserted < MIN_RGPD_NAT_SEGMENTS_PER_COUNTRY;
  if (!officialThin && total >= MIN_RGPD_NAT_SEGMENTS_PER_COUNTRY) return "";

  const ingested = await ingestNationalStatuteFallback(code, row, fallback);
  if (!ingested.ok) return ` (synthèse complémentaire échouée: ${ingested.error})`;
  return ` + synthèse complémentaire: ${ingested.inserted} segments`;
}

async function ingestNationalStatuteFallback(
  code: string,
  row: (typeof EU27)[string],
  seed: NationalStatuteFallbackSeed
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  return ingestFetchedNationalStatute(
    code,
    row,
    seed.source_url,
    { text: seed.body, finalUrl: seed.source_url },
    "statute_consolidated_fallback"
  );
}

/**
 * Télécharge fetch_url puis portal_url (allowlist) et indexe sans agent Claude.
 * Utilisé par le backfill EU-27 avant l'agent (moins cher, évite les 529 Anthropic).
 */
export async function tryDirectNationalStatuteIngest(
  countryCode: string,
  options?: { ignoreTtl?: boolean; synthesisOnly?: boolean }
): Promise<DirectNationalIngestResult> {
  const code = countryCode.trim().toUpperCase();
  const row = EU27[code];

  if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { code, status: "skipped_env", summary: "OPENAI_API_KEY ou SUPABASE_SERVICE_ROLE_KEY absent." };
  }

  if (!row) return { code, status: "skipped_no_source", summary: "Pays hors registre UE-27." };

  const fetchUrl = row.gdpr_law.fetch_url?.trim() || "";
  const portalUrl = row.gdpr_law.portal_url?.trim() || "";
  const canonicalSource = fetchUrl || portalUrl;
  if (!canonicalSource) {
    return { code, status: "skipped_no_source", summary: "Aucune fetch_url ni portal_url." };
  }

  const ttlMs = getNationalIngestTtlMs();
  if (!options?.ignoreTtl && (await nationalSourceStillFresh(canonicalSource, ttlMs))) {
    return {
      code,
      status: "fresh_ttl",
      summary: `Corpus encore dans le TTL (${Math.round(ttlMs / 3600000)} h).`,
    };
  }

  const fallback = getNationalStatuteFallbackSeed(code);

  if (options?.synthesisOnly && fallback && fallback.body.length >= MIN_STATUTE_BODY_CHARS) {
    const ingested = await ingestNationalStatuteFallback(code, row, fallback);
    if (!ingested.ok) {
      return { code, status: "ingest_error", summary: ingested.error };
    }
    return {
      code,
      status: "indexed",
      summary: `fallback synthèse (forcé): ${ingested.inserted} segments (${fallback.source_url})`,
      inserted: ingested.inserted,
    };
  }

  const candidates = getNationalStatuteFetchCandidates(code);
  let best: { text: string; finalUrl: string } | null = null;

  if (code === "DE") {
    for (const url of candidates.filter((u) => u.includes("gesetze-im-internet.de/bdsg"))) {
      const aggregated = await fetchGesetzeImInternetStatute(url, code);
      if (!aggregated || !statutePlaintextMatchesRegistry(row.gdpr_law, aggregated.text)) continue;
      if (!best || aggregated.text.length > best.text.length) best = aggregated;
    }
  }

  for (const url of candidates) {
    const fetched = await fetchAllowlistedNationalHttpsPage(url, code);
    if (!fetched || !isExploitableStatutePlaintext(fetched.text)) continue;
    if (!statutePlaintextMatchesRegistry(row.gdpr_law, fetched.text)) continue;
    if (!best || fetched.text.length > best.text.length) best = fetched;
  }

  if (!best && fallback && fallback.body.length >= MIN_STATUTE_BODY_CHARS) {
    const ingested = await ingestNationalStatuteFallback(code, row, fallback);
    if (!ingested.ok) {
      return { code, status: "ingest_error", summary: ingested.error };
    }
    return {
      code,
      status: "indexed",
      summary: `fallback synthèse: ${ingested.inserted} segments (${fallback.source_url})`,
      inserted: ingested.inserted,
    };
  }

  if (!best) {
    if (fallback && fallback.body.length >= MIN_STATUTE_BODY_CHARS) {
      const ingested = await ingestNationalStatuteFallback(code, row, fallback);
      if (ingested.ok) {
        return {
          code,
          status: "indexed",
          summary: `fallback synthèse (fetch impossible): ${ingested.inserted} segments`,
          inserted: ingested.inserted,
        };
      }
    }
    return {
      code,
      status: "no_fetch",
      summary: `Fetch vide, SPA ou trop court pour ${candidates.slice(0, 3).join(" ; ")}${fallback ? "" : " (pas de synthèse de repli)"}.`,
    };
  }

  const ingested = await ingestFetchedNationalStatute(
    code,
    row,
    canonicalSource,
    best,
    "statute_consolidated_direct"
  );
  if (!ingested.ok) {
    return { code, status: "ingest_error", summary: ingested.error };
  }

  const supplement = await ensureSynthesisSupplementIfSparse(code, row, ingested.inserted);

  return {
    code,
    status: "indexed",
    summary: `direct ingest: ${ingested.inserted} segments depuis ${best.finalUrl}${supplement}`,
    inserted: ingested.inserted,
  };
}

async function maybeAutoIngestCountry(
  countryCode: string,
  deadline: number,
  ttlMs: number
): Promise<void> {
  if (Date.now() > deadline) return;
  const r = await tryDirectNationalStatuteIngest(countryCode, { ignoreTtl: false });
  if (r.status === "ingest_error") {
    console.warn("[national-auto-ingest] ingest", countryCode, r.summary);
  }
}

/**
 * Pour chaque État détecté : si le cache national pour l’URL officielle du registre est absent ou
 * expiré, télécharge, découpe et indexe (budget temps limité).
 */
export async function refreshNationalCorpusForDetectedCountries(
  countryCodes: string[],
  options?: { deadlineMs?: number }
): Promise<void> {
  if (process.env.NATIONAL_AUTO_INGEST === "0") return;

  if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const uniq = [...new Set(countryCodes.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))];
  if (!uniq.length) return;

  const ttlMs = DEFAULT_TTL_HOURS * 3600 * 1000;
  const budget = options?.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const deadline = Date.now() + budget;

  uniq.sort();
  for (const code of uniq) {
    if (Date.now() > deadline) break;
    try {
      await maybeAutoIngestCountry(code, deadline, ttlMs);
    } catch (e) {
      console.warn("[national-auto-ingest]", code, e instanceof Error ? e.message : e);
    }
  }
}
