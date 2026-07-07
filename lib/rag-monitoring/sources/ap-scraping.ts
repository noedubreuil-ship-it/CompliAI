import { createHash } from "crypto";
import { parse as parseHtml } from "node-html-parser";
import { DetectedDocument, DocumentType, FetchFn } from "../types";

export const AP_ACTUEEL_URL =
  "https://www.autoriteitpersoonsgegevens.nl/actueel";

/**
 * Sélecteurs CSS pour la page actueel de l'AP (vérifié le 2026-06-25).
 *
 * Structure HTML des items :
 * <article class="node-article-teaser node-article-teaser--nieuwsbericht">
 *   <a class="node-article-teaser__action" href="/actueel/slug">…</a>
 *   <div class="node-article-teaser__content">
 *     <h3 class="node-article-teaser__title"><span>Titre</span></h3>
 *     <div class="node-article-teaser__submitted">24 juni 2026</div>
 *   </div>
 * </article>
 */
export const AP_SELECTORS = {
  article: "article.node-article-teaser",
  action_link: "a.node-article-teaser__action",
  title: ".node-article-teaser__title span",
  date: ".node-article-teaser__submitted",
};

export const AP_BASE_URL = "https://www.autoriteitpersoonsgegevens.nl";

/**
 * Mapping des mois néerlandais vers leur numéro (1-12).
 * Permet de parser les dates "24 juni 2026" indépendamment de la locale.
 */
const DUTCH_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maart: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  augustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  december: 12,
};

/**
 * Parse une date AP depuis le format néerlandais "24 juni 2026".
 */
export function parseApDate(raw: string): Date | undefined {
  const parts = raw.trim().toLowerCase().split(/\s+/);
  if (parts.length < 3) return undefined;
  const day = parseInt(parts[0], 10);
  const monthNum = DUTCH_MONTHS[parts[1]];
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || !monthNum || isNaN(year)) return undefined;
  return new Date(
    `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00Z`
  );
}

/**
 * Génère l'externalId depuis le slug de l'URL AP.
 * Ex. "/actueel/ap-grote-toename-van-privacyklachten" → "ap-grote-toename-van-privacyklachten"
 */
export function apUrlToExternalId(href: string): string {
  const slug = href.replace(/^\/actueel\//, "").replace(/[?#].*/, "").trim();
  if (slug && slug !== href) return slug;
  return createHash("sha256").update(href).digest("hex").slice(0, 16);
}

/**
 * Infère le type de document AP depuis le titre néerlandais.
 * Fonctionne sans compréhension du néerlandais — patterns structurels.
 */
export function inferApDocumentType(title: string): DocumentType {
  const t = title.toLowerCase();
  if (
    t.includes("boete") ||
    t.includes("handhaving") ||
    t.includes("sanctie") ||
    t.includes("besluit") ||
    t.includes("last onder dwangsom") ||
    t.includes("bestuurlijke") ||
    t.includes("onderzoek")
  ) {
    return "national_decision";
  }
  if (
    t.includes("richtsnoer") ||
    t.includes("aanbeveling") ||
    t.includes("leidraad") ||
    t.includes("orientatie") ||
    t.includes("rapport")
  ) {
    return "national_guideline";
  }
  return "national_decision";
}

export interface ApScrapingOptions {
  url?: string;
  fetcher?: FetchFn;
}

/**
 * Connecteur AP (Autoriteit Persoonsgegevens — Pays-Bas) — scraping HTML.
 *
 * Source : https://www.autoriteitpersoonsgegevens.nl/actueel
 * Langue : "nl"
 *
 * Déduplication : externalId = slug de l'URL (/actueel/<slug>)
 * Rate limit : 2 000 ms entre appels
 *
 * Note : les dates sont en néerlandais ("24 juni 2026") —
 * le mapping DUTCH_MONTHS permet de les parser sans locale NL.
 */
export async function fetchApDocuments(
  options: ApScrapingOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = AP_ACTUEEL_URL,
    fetcher = fetch as unknown as FetchFn,
  } = options;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`AP actueel a retourné HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseApHtml(html);
}

/**
 * Parse le HTML de la page actueel AP.
 * Exposé séparément pour faciliter les tests avec fixtures.
 */
export function parseApHtml(html: string): DetectedDocument[] {
  const root = parseHtml(html);
  const documents: DetectedDocument[] = [];

  const articles = root.querySelectorAll(AP_SELECTORS.article);
  if (articles.length === 0) return [];

  for (const article of articles) {
    const actionLink = article.querySelector(AP_SELECTORS.action_link);
    const titleEl = article.querySelector(AP_SELECTORS.title);
    const dateEl = article.querySelector(AP_SELECTORS.date);

    if (!actionLink || !titleEl) continue;

    const href = actionLink.getAttribute("href") ?? "";
    const title = titleEl.text.trim();
    if (!href || !title) continue;

    const fullUrl = href.startsWith("http")
      ? href
      : `${AP_BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    const rawDate = dateEl?.text?.trim() ?? "";
    const publicationDate = parseApDate(rawDate);

    documents.push({
      externalId: apUrlToExternalId(href),
      sourceUrl: fullUrl,
      title,
      documentType: inferApDocumentType(title),
      language: "nl",
      country: "NL",
      publicationDate,
    });
  }

  return documents;
}
