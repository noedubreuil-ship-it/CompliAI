import { createHash } from "crypto";
import { XMLParser } from "fast-xml-parser";
import { DetectedDocument, FetchFn } from "../types";

export const AI_OFFICE_RSS_URL =
  "https://digital-strategy.ec.europa.eu/en/rss.xml";

/** Mots-clés positifs : publications directement liées à l'IA Act et au Bureau IA */
const AI_OFFICE_POSITIVE_KEYWORDS = [
  "AI Act",
  "artificial intelligence",
  "intelligence artificielle",
  "GPAI",
  "general-purpose AI",
  "general purpose AI",
  "foundation model",
  "high-risk AI",
  "haut risque",
  "AI Office",
  "Bureau de l'IA",
  "code of practice",
  "code de conduite",
  "systèmes d'IA",
  "AI systems",
  "algorithmic",
  "algorithme",
];

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

export function isAiOfficeRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return AI_OFFICE_POSITIVE_KEYWORDS.some((kw) =>
    text.includes(kw.toLowerCase())
  );
}

export interface AiOfficeRssOptions {
  url?: string;
  fetcher?: FetchFn;
  noFilter?: boolean;
}

/**
 * Connecteur AI Office RSS — flux digital-strategy.ec.europa.eu filtré sur l'IA.
 * Détecte les nouvelles publications du Bureau européen de l'intelligence artificielle.
 */
export async function fetchAiOfficeDocuments(
  options: AiOfficeRssOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = AI_OFFICE_RSS_URL,
    fetcher = fetch as unknown as FetchFn,
    noFilter = false,
  } = options;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`AI Office RSS returned HTTP ${response.status}`);
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
    if (!noFilter && !isAiOfficeRelevant(title, description)) continue;

    const externalId = guid || createHash("sha256").update(link).digest("hex").slice(0, 16);

    if (seen.has(externalId)) continue;
    seen.add(externalId);

    documents.push({
      externalId,
      sourceUrl: link,
      title: title.trim(),
      documentType: "ai_office_guidance",
      language: "en",
      country: "EU",
      publicationDate: pubDate ? new Date(pubDate) : undefined,
    });
  }

  return documents;
}
