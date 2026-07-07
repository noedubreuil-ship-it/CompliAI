import { createHash } from "crypto";
import { parse as parseHtml } from "node-html-parser";
import { DetectedDocument, FetchFn } from "../types";

export const DPC_DECISIONS_URL =
  "https://www.dataprotection.ie/en/dpc-guidance/decisions";

/**
 * Sélecteurs CSS pour la page des décisions DPC (vérifié le 2026-06-25).
 *
 * Structure HTML des items :
 * <div class="views-view-grid horizontal cols-2 clearfix">
 *   <div class="views-row">
 *     <div class="views-col">
 *       <div class="faq-section-results-box">
 *         <div class="faq-section-category-link">
 *           <span class="datetime">10 Dec 2025</span>
 *         </div>
 *         <h3 class="mb-2"><a href="/en/dpc-guidance/decisions/...">Titre</a></h3>
 *         <p>Description…</p>
 *       </div>
 *     </div>
 *   </div>
 * </div>
 */
export const DPC_SELECTORS = {
  grid: ".views-view-grid",
  item: ".faq-section-results-box",
  title: "h3 a",
  date: ".datetime",
  category: ".faq-section-category-link a",
};

export const DPC_BASE_URL = "https://www.dataprotection.ie";

export const DPC_STRATEGIC_KEYWORDS = [
  "meta",
  "facebook",
  "instagram",
  "whatsapp",
  "tiktok",
  "microsoft",
  "apple",
  "linkedin",
  "twitter",
  "google",
  "transfers",
  "transfer",
  "children",
  "child users",
  "ai",
  "artificial intelligence",
  "breach",
  "personal data breaches",
];

/**
 * Parse la date DPC depuis le format "10 Dec 2025" ou "10 December 2025".
 */
export function parseDpcDate(raw: string): Date | undefined {
  if (!raw) return undefined;
  const clean = raw.trim();
  const date = new Date(clean);
  if (!isNaN(date.getTime())) return date;
  return undefined;
}

/**
 * Génère l'externalId depuis le chemin URL de la décision.
 * Ex. "/en/dpc-guidance/decisions/inquiry-concerning-university-limerick"
 * → slug "inquiry-concerning-university-limerick"
 */
export function dpcUrlToExternalId(href: string): string {
  const slug = href.replace(/.*\/decisions\//, "").replace(/[?#].*/, "").trim();
  if (slug && slug !== href) return slug;
  return createHash("sha256").update(href).digest("hex").slice(0, 16);
}

export function isDpcRelevant(title: string): boolean {
  const normalized = title.toLowerCase();
  return DPC_STRATEGIC_KEYWORDS.some((keyword) => {
    const keywordLower = keyword.toLowerCase();
    if (keywordLower.length <= 3) {
      return new RegExp(`\\b${keywordLower}\\b`).test(normalized);
    }
    return normalized.includes(keywordLower);
  });
}

export interface DpcScrapingOptions {
  url?: string;
  fetcher?: FetchFn;
}

/**
 * Connecteur DPC (Data Protection Commission Irlande) — scraping HTML.
 *
 * Source : https://www.dataprotection.ie/en/dpc-guidance/decisions
 * Langue : "en"
 * Importance : très haute (supervise Meta, Google, Apple, Microsoft)
 *
 * Déduplication : externalId = slug du chemin URL de la décision
 * Rate limit : 2 000 ms entre appels (pas de limite documentée, prudence)
 */
export async function fetchDpcDecisions(
  options: DpcScrapingOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = DPC_DECISIONS_URL,
    fetcher = fetch as unknown as FetchFn,
  } = options;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`DPC decisions a retourné HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseDpcDecisionsHtml(html).filter((doc) => isDpcRelevant(doc.title));
}

/**
 * Parse le HTML de la page des décisions DPC.
 * Exposé séparément pour faciliter les tests avec fixtures.
 */
export function parseDpcDecisionsHtml(html: string): DetectedDocument[] {
  const root = parseHtml(html);
  const documents: DetectedDocument[] = [];
  // La grille DPC est en 2 colonnes — certaines décisions peuvent apparaître en double
  const seenExternalIds = new Set<string>();

  const items = root.querySelectorAll(DPC_SELECTORS.item);
  if (items.length === 0) return [];

  for (const item of items) {
    const titleEl = item.querySelector(DPC_SELECTORS.title);
    const dateEl = item.querySelector(DPC_SELECTORS.date);

    if (!titleEl) continue;

    const title = titleEl.text.trim();
    const href = titleEl.getAttribute("href") ?? "";
    if (!title || !href) continue;

    const fullUrl = href.startsWith("http")
      ? href
      : `${DPC_BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    const rawDate = dateEl?.text?.trim() ?? "";
    const publicationDate = parseDpcDate(rawDate);

    const externalId = dpcUrlToExternalId(href);
    if (seenExternalIds.has(externalId)) continue;
    seenExternalIds.add(externalId);

    documents.push({
      externalId,
      sourceUrl: fullUrl,
      title,
      documentType: "national_decision",
      language: "en",
      country: "IE",
      publicationDate,
    });
  }

  return documents;
}
