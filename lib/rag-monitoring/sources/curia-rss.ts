import { XMLParser } from "fast-xml-parser";
import { DetectedDocument, FetchFn } from "../types";

export const CURIA_RSS_URL =
  "http://curia.europa.eu/v/rss.jsp?lang=fr&secondLang=en";

/** Mots-clés déclenchant la détection d'un arrêt CJUE */
export const CJUE_KEYWORD_FILTERS = [
  "données à caractère personnel",
  "données personnelles",
  "protection des données",
  "RGPD",
  "règlement général",
  "intelligence artificielle",
  "transfert",
  "consentement",
  "profilage",
  "surveillance",
  "ePrivacy",
  "communications électroniques",
  "droit à l'oubli",
  "accès aux données",
  "responsable du traitement",
  "AI Act",
];

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

/** Extrait le CELEX depuis un lien EUR-Lex ou dc:identifier */
function extractCelexFromLink(link: string, dcIdentifier?: string): string | undefined {
  if (dcIdentifier && /^6\d{4}C[JT]/.test(dcIdentifier)) {
    return dcIdentifier;
  }
  const match = link.match(/CELEX[=:]([0-9A-Z]+)/i);
  return match?.[1];
}

/** Extrait l'ECLI depuis le titre ou la description si présent */
function extractEcli(text: string): string | undefined {
  const match = text.match(/ECLI:EU:[CT]:\d{4}:\d+/i);
  return match?.[0];
}

function isRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return CJUE_KEYWORD_FILTERS.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));
}

export interface CuriaRssOptions {
  url?: string;
  keywords?: string[];
  fetcher?: FetchFn;
}

/**
 * Connecteur Curia RSS — arrêts et ordonnances de la CJUE.
 * Détecte les nouveaux arrêts pertinents en matière de données personnelles et IA.
 */
export async function fetchCuriaRss(
  options: CuriaRssOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = CURIA_RSS_URL,
    fetcher = fetch as unknown as FetchFn,
  } = options;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Curia RSS returned HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parsed = XML_PARSER.parse(xml);

  const items: unknown[] = parsed?.rss?.channel?.item ?? [];
  if (!Array.isArray(items)) {
    return [];
  }

  const documents: DetectedDocument[] = [];

  for (const rawItem of items) {
    const item = rawItem as Record<string, unknown>;
    const title = String(item["title"] ?? "");
    const link = String(item["link"] ?? "");
    const description = String(item["description"] ?? "");
    const dcIdentifier = String(item["dc:identifier"] ?? "");
    const dcDate = String(item["dc:date"] ?? "");
    const pubDate = String(item["pubDate"] ?? "");

    if (!isRelevant(title, description)) continue;
    if (!link) continue;

    const celex = extractCelexFromLink(link, dcIdentifier);
    const ecli = extractEcli(`${title} ${description}`);

    const publicationDate = dcDate
      ? new Date(dcDate)
      : pubDate
      ? new Date(pubDate)
      : undefined;

    documents.push({
      externalId: ecli ?? celex ?? link,
      celex,
      ecli,
      sourceUrl: link,
      title: title.trim(),
      documentType: "cjeu_judgment",
      language: "fr",
      country: "EU",
      publicationDate,
    });
  }

  return documents;
}
