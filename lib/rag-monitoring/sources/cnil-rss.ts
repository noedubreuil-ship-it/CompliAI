import { createHash } from "crypto";
import { XMLParser } from "fast-xml-parser";
import { DetectedDocument, DocumentType, FetchFn } from "../types";

export const CNIL_RSS_URL = "https://www.cnil.fr/fr/rss.xml";

/** Mots-clés positifs : publiés dans le cadre de la mission régulateur de la CNIL */
const CNIL_POSITIVE_KEYWORDS = [
  "sanction",
  "délibération",
  "mise en demeure",
  "recommandation",
  "référentiel",
  "lignes directrices",
  "guide pratique",
  "guide technique",
  "RGPD",
  "intelligence artificielle",
  "règlement IA",
  "AI Act",
  "données personnelles",
  "protection des données",
  "violation de données",
  "violation",
  "amende",
  "séance plénière",
  "délibéré",
  "autorisation",
  "avis",
  "order du jour",
  "contrôle",
  "mise en conformité",
];

/** Mots-clés négatifs : contenu institutionnel hors scope régulatoire */
const CNIL_NEGATIVE_KEYWORDS = [
  "prix ",
  "webinaire",
  "événement",
  "colloque",
  "conférence",
  "journée de recherche",
  "nomination",
  "directeur",
  "recrutement",
];

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

export function isCnilRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (CNIL_NEGATIVE_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()))) {
    return false;
  }
  return CNIL_POSITIVE_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

export function inferCnilDocumentType(title: string): DocumentType {
  const t = title.toLowerCase();
  if (
    t.includes("sanction") ||
    t.includes("amende") ||
    t.includes("mise en demeure") ||
    t.includes("délibération")
  ) {
    return "national_decision";
  }
  return "national_guideline";
}

export interface CnilRssOptions {
  url?: string;
  fetcher?: FetchFn;
  noFilter?: boolean;
}

/**
 * Connecteur CNIL RSS — flux général CNIL filtré sur les publications régulatoires.
 * Détecte les sanctions, délibérations, recommandations et référentiels RGPD/IA.
 */
export async function fetchCnilDocuments(
  options: CnilRssOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = CNIL_RSS_URL,
    fetcher = fetch as unknown as FetchFn,
    noFilter = false,
  } = options;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`CNIL RSS returned HTTP ${response.status}`);
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
    if (!noFilter && !isCnilRelevant(title, description)) continue;

    const externalId = guid || createHash("sha256").update(link).digest("hex").slice(0, 16);

    if (seen.has(externalId)) continue;
    seen.add(externalId);

    documents.push({
      externalId,
      sourceUrl: link,
      title: title.trim(),
      documentType: inferCnilDocumentType(title),
      language: "fr",
      country: "FR",
      publicationDate: pubDate ? new Date(pubDate) : undefined,
    });
  }

  return documents;
}
