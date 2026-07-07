import { createHash } from "crypto";
import { XMLParser } from "fast-xml-parser";
import { DetectedDocument, DocumentType, FetchFn } from "../types";

export const AEPD_RSS_URL = "https://www.aepd.es/noticias/feed.xml";

/** Mots-clés positifs en espagnol */
const AEPD_POSITIVE_KEYWORDS = [
  "protección de datos",
  "datos personales",
  "resolución",
  "sanción",
  "expediente",
  "rgpd",
  "reglamento general",
  "inteligencia artificial",
  "ia ",
  " ia,",
  "recomendación",
  "directrices",
  "guía",
  "informe",
  "decisión",
  "neurodatos",
  "decisiones automatizadas",
  "perfilado",
  "consentimiento",
  "transferencia",
  "videovigilancia",
];

/** Mots-clés négatifs — contenu hors scope */
const AEPD_NEGATIVE_KEYWORDS = [
  "premio",
  "premios",
  "curso",
  "cursos",
  "jornada",
  "congreso",
  "evento ",
  "revistas",
  "anuario",
  "directo",
];

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

export function isAepdRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (AEPD_NEGATIVE_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()))) {
    return false;
  }
  return AEPD_POSITIVE_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

export function inferAepdDocumentType(title: string): DocumentType {
  const t = title.toLowerCase();
  if (
    t.includes("resolución") ||
    t.includes("sanción") ||
    t.includes("expediente")
  ) {
    return "national_decision";
  }
  return "national_guideline";
}

export interface AepdRssOptions {
  url?: string;
  fetcher?: FetchFn;
  noFilter?: boolean;
}

/**
 * Connecteur AEPD RSS — flux Noticias AEPD filtré sur les publications régulatoires.
 * Détecte les résolutions, sanctions, recommandations et guides sur la protection des données.
 */
export async function fetchAepdDocuments(
  options: AepdRssOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = AEPD_RSS_URL,
    fetcher = fetch as unknown as FetchFn,
    noFilter = false,
  } = options;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`AEPD RSS returned HTTP ${response.status}`);
  }

  const xml = await response.text();

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
    const guidRaw = item["guid"];
    const guid =
      typeof guidRaw === "object" && guidRaw !== null
        ? String((guidRaw as Record<string, unknown>)["#text"] ?? guidRaw)
        : String(guidRaw ?? "");
    const pubDate = String(item["pubDate"] ?? "");

    if (!link) continue;
    if (!noFilter && !isAepdRelevant(title, description)) continue;

    const externalId = guid || createHash("sha256").update(link).digest("hex").slice(0, 16);

    if (seen.has(externalId)) continue;
    seen.add(externalId);

    documents.push({
      externalId,
      sourceUrl: link,
      title: title.trim(),
      documentType: inferAepdDocumentType(title),
      language: "es",
      country: "ES",
      publicationDate: pubDate ? new Date(pubDate) : undefined,
    });
  }

  return documents;
}
