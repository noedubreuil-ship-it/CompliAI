import { createHash } from "crypto";
import { XMLParser } from "fast-xml-parser";
import { DetectedDocument, DocumentType, FetchFn } from "../types";

/**
 * Flux RSS du Journal officiel, série L (législation).
 *
 * L'ancienne URL (`/oj/daily-view/P1/1/RSS/FR.xml`) renvoie un **HTTP 404**
 * depuis au moins le 2026-07-18 — constaté depuis une IP GitHub, donc c'est
 * bien l'endpoint qui est mort, pas un blocage réseau. EUR-Lex expose
 * desormais ses flux predefinis sous `display-feed.rss?rssId=<n>` ; 222 est
 * la serie L. Verifie le 2026-07-18 : 100 entrees, titres FR, a jour.
 *
 * Autres identifiants utiles : 221 = serie C, 162 = actes PE/Conseil,
 * 163/164 = jurisprudence, 161 = propositions de la Commission.
 */
export const EURLEX_RSS_URL =
  "https://eur-lex.europa.eu/FR/display-feed.rss?rssId=222";

/** Mots-clés déclenchant la détection d'un acte EUR-Lex */
const EURLEX_RELEVANCE_KEYWORDS = [
  "intelligence artificielle",
  "données à caractère personnel",
  "données personnelles",
  "protection des données",
  "RGPD",
  "numérique",
  "cybersécurité",
  "IA",
  "AI Act",
  "données",
  "algorithme",
  "automatisé",
  "traitement de données",
  "marché numérique",
  "services numériques",
  "interopérabilité",
];

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

export function extractCelex(
  link: string,
  dcIdentifier?: string,
  title?: string
): string | undefined {
  if (dcIdentifier && /^3\d{4}[RL]/.test(dcIdentifier)) {
    return dcIdentifier;
  }
  // Le flux `display-feed.rss` prefixe le titre du CELEX
  // (« CELEX:32026R1778: Reglement d'execution… ») alors que l'ancien flux JO
  // ne le portait que dans le lien. On regarde les deux, sinon le CELEX serait
  // perdu et l'externalId retomberait sur un hash d'URL — la deduplication et
  // le typage du document se degraderaient silencieusement.
  const match =
    link.match(/CELEX[=:]([0-9A-Z()]+)/i) ??
    title?.match(/CELEX[=:]([0-9A-Z()]+)/i);
  return match?.[1];
}

function isRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return EURLEX_RELEVANCE_KEYWORDS.some((kw) =>
    text.includes(kw.toLowerCase())
  );
}

function inferDocumentType(celex: string | undefined, title: string): DocumentType {
  if (celex) {
    if (/^3\d{4}R/.test(celex)) return "eu_regulation";
    if (/^3\d{4}L/.test(celex)) return "eu_directive";
    if (/^3\d{4}D/.test(celex)) return "eu_decision";
  }
  const t = title.toLowerCase();
  if (t.includes("règlement")) return "eu_regulation";
  if (t.includes("directive")) return "eu_directive";
  if (t.includes("décision")) return "eu_decision";
  return "eu_regulation";
}

function urlToExternalId(url: string, celex?: string): string {
  if (celex) return celex;
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export interface EurlexRssOptions {
  url?: string;
  fetcher?: FetchFn;
}

/**
 * Connecteur EUR-Lex RSS — Journal Officiel série L.
 * Détecte les nouvelles publications législatives pertinentes (IA, données, numérique).
 */
export async function fetchEurlexRss(
  options: EurlexRssOptions = {}
): Promise<DetectedDocument[]> {
  const { url = EURLEX_RSS_URL, fetcher = fetch as unknown as FetchFn } = options;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`EUR-Lex RSS returned HTTP ${response.status}`);
  }

  const xml = await response.text();

  // Guard against HTML responses (SPA error pages)
  if (xml.trimStart().startsWith("<!DOCTYPE") || xml.trimStart().startsWith("<html")) {
    return [];
  }

  let parsed: ReturnType<typeof XML_PARSER.parse>;
  try {
    parsed = XML_PARSER.parse(xml);
  } catch {
    return [];
  }

  const rawItems: unknown[] = parsed?.rss?.channel?.item ?? [];
  if (!Array.isArray(rawItems)) return [];

  const documents: DetectedDocument[] = [];
  const seen = new Set<string>();

  for (const rawItem of rawItems) {
    const item = rawItem as Record<string, unknown>;
    const title = String(item["title"] ?? "");
    const link = String(item["link"] ?? "");
    const description = String(item["description"] ?? "");
    const dcIdentifier = String(item["dc:identifier"] ?? "");
    const dcDate = String(item["dc:date"] ?? "");
    const pubDate = String(item["pubDate"] ?? "");

    if (!link) continue;
    if (!isRelevant(title, description)) continue;

    const celex = extractCelex(link, dcIdentifier, title);
    const externalId = urlToExternalId(link, celex);

    if (seen.has(externalId)) continue;
    seen.add(externalId);

    const publicationDate = dcDate
      ? new Date(dcDate)
      : pubDate
      ? new Date(pubDate)
      : undefined;

    documents.push({
      externalId,
      celex,
      sourceUrl: link,
      title: title.trim(),
      documentType: inferDocumentType(celex, title),
      language: "fr",
      country: "EU",
      publicationDate,
    });
  }

  return documents;
}
