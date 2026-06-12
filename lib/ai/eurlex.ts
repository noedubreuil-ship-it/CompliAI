/**
 * EUR-Lex full-text search integration.
 *
 * Uses the EUR-Lex REST API v3 to search the full corpus of EU law when
 * the local RAG vector database does not return enough relevant chunks.
 *
 * API reference: https://eur-lex.europa.eu/content/tools/eur-lex-api/
 * Endpoint:      https://eur-lex.europa.eu/api/search
 */

// ─── In-memory cache (per process, ~1h TTL) ──────────────────────────────────
const _cache = new Map<string, { results: EurLexResult[]; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCached(key: string): EurLexResult[] | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
  return entry.results;
}

function setCached(key: string, results: EurLexResult[]) {
  if (_cache.size > 200) {
    // Evict oldest entries to prevent unbounded growth
    const oldest = Array.from(_cache.entries()).sort((a, b) => a[1].ts - b[1].ts).slice(0, 50);
    oldest.forEach(([k]) => _cache.delete(k));
  }
  _cache.set(key, { results, ts: Date.now() });
}

export interface EurLexResult {
  celex: string;
  title: string;
  summary: string;
  eurlex_url: string;
  date?: string;
  docType?: string;
}

const EURLEX_API = "https://eur-lex.europa.eu/api/search";
const EURLEX_BASE = "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:";

/** Map a CELEX number to an EUR-Lex URL */
function celexToUrl(celex: string): string {
  return `${EURLEX_BASE}${encodeURIComponent(celex)}`;
}

/**
 * Extract text between XML tags — tiny helper that avoids a full parser
 * dependency. Used to pull fields from EUR-Lex API XML responses.
 */
function extractXmlField(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

function extractAllXmlFields(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text) results.push(text);
  }
  return results;
}

/**
 * Search EUR-Lex for documents matching `query`.
 * Returns at most `maxResults` documents (default 5).
 *
 * Falls back gracefully to [] on network errors or unexpected API responses.
 */
export async function searchEurLex(
  query: string,
  maxResults = 5,
): Promise<EurLexResult[]> {
  const cacheKey = `${query.toLowerCase().trim()}:${maxResults}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // EUR-Lex API v3 search — full-text across all EU legislation
    const params = new URLSearchParams({
      query: `text:${query};lang=fr;scope=EURLEX`,
      page: "1",
      pageSize: String(maxResults),
    });

    const res = await fetch(`${EURLEX_API}?${params}`, {
      headers: {
        Accept: "application/xml, text/xml, */*",
        "Accept-Language": "fr",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 }, // cache identical queries for 1 hour
    });

    if (!res.ok) return [];

    const xml = await res.text();

    // The EUR-Lex API wraps results in <RESULT> or <result> elements.
    // Each block contains REFERENCE (CELEX), TITRE / TITLE, and optionally a SUMMARY.
    const resultBlocks = extractAllXmlBlocks(xml, ["RESULT", "result", "notice"]);

    if (resultBlocks.length === 0) {
      // Some EUR-Lex API versions return a flat structure — parse as fallback
      const flatResults = parseFlatXml(xml, maxResults);
      setCached(cacheKey, flatResults);
      return flatResults;
    }

    const results = resultBlocks
      .slice(0, maxResults)
      .map((block) => parseResultBlock(block))
      .filter((r): r is EurLexResult => !!r.celex && !!r.title);

    setCached(cacheKey, results);
    return results;
  } catch {
    return [];
  }
}

function extractAllXmlBlocks(xml: string, tags: string[]): string[] {
  for (const tag of tags) {
    const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, "gi");
    const matches = xml.match(re);
    if (matches && matches.length > 0) return matches;
  }
  return [];
}

function parseResultBlock(block: string): EurLexResult {
  const celex =
    extractXmlField(block, "REFERENCE") ||
    extractXmlField(block, "reference") ||
    extractXmlField(block, "CELEX") ||
    extractXmlField(block, "celex") ||
    extractXmlField(block, "num_sequence");

  const title =
    extractXmlField(block, "TITRE") ||
    extractXmlField(block, "TITLE") ||
    extractXmlField(block, "title") ||
    extractXmlField(block, "dc:title") ||
    "(Sans titre)";

  const summary =
    extractXmlField(block, "SUMMARY") ||
    extractXmlField(block, "summary") ||
    extractXmlField(block, "SAMMANFATTNING") ||
    extractXmlField(block, "dc:description") ||
    "";

  const date =
    extractXmlField(block, "DATE_DOCUMENT") ||
    extractXmlField(block, "date") ||
    extractXmlField(block, "dc:date") ||
    "";

  const docType =
    extractXmlField(block, "TYPE_DOCUMENT") ||
    extractXmlField(block, "type") ||
    "";

  return {
    celex: celex.trim(),
    title: title.trim(),
    summary: summary.slice(0, 600).trim(),
    eurlex_url: celex ? celexToUrl(celex.trim()) : `https://eur-lex.europa.eu/search.html?text=${encodeURIComponent(title)}`,
    date: date.trim() || undefined,
    docType: docType.trim() || undefined,
  };
}

/**
 * Fallback for API responses that don't wrap items in a block element.
 * Tries to extract CELEX numbers from raw XML.
 */
function parseFlatXml(xml: string, maxResults: number): EurLexResult[] {
  const celexNumbers = Array.from(new Set(
    (xml.match(/\b[0-9]{5}[A-Z][0-9]{4}\b/g) ?? []).slice(0, maxResults)
  ));

  return celexNumbers.map((celex) => ({
    celex,
    title: `Document EUR-Lex ${celex}`,
    summary: "",
    eurlex_url: celexToUrl(celex),
  }));
}

/**
 * Convert EUR-Lex search results into a context string that can be injected
 * into Claude's system/user message alongside (or in place of) RAG chunks.
 */
export function buildEurLexContext(results: EurLexResult[]): string {
  if (results.length === 0) return "";

  return results
    .map((r) => {
      const parts = [
        `[EUR-Lex ${r.celex}${r.docType ? ` · ${r.docType}` : ""}]`,
        `Titre : ${r.title}`,
        r.date ? `Date : ${r.date}` : null,
        r.summary ? `Résumé : ${r.summary}` : null,
        `Lien : ${r.eurlex_url}`,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n---\n\n");
}

/**
 * Build a direct EUR-Lex advanced-search URL for a given query, so the UI
 * can offer a "Rechercher sur EUR-Lex" link even when the API returns nothing.
 */
export function buildEurLexSearchUrl(query: string): string {
  return `https://eur-lex.europa.eu/search.html?text=${encodeURIComponent(query)}&scope=EURLEX&type=named&lang=fr&FM_CODED=ALL`;
}
