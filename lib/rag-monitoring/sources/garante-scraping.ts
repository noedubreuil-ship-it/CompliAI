import { parse as parseHtml } from "node-html-parser";
import { DetectedDocument, DocumentType, FetchFn } from "../types";

export const GARANTE_RICERCA_URL =
  "https://www.garanteprivacy.it/home/ricerca/-/search/tipologia/Provvedimenti";

/**
 * Sélecteurs CSS pour la page de recherche Garante (vérifié le 2026-06-25).
 *
 * Structure HTML des items dans la page ricerca :
 * <div class="data-risultato">
 *   <p>28/05/2026</p>
 * </div>
 * <strong>
 *   <a href="/web/guest/home/docweb/-/docweb-display/docweb/10259569"
 *      class="titolo-risultato"
 *      title="Parere su istanza di accesso civico - 28 maggio 2026 [10259569]">
 *     Parere su istanza di accesso civico - 28 maggio 2026 [10259569]
 *   </a>
 * </strong>
 */
export const GARANTE_SELECTORS = {
  titleLink: "a.titolo-risultato",
  dateContainer: ".data-risultato p",
};

export const GARANTE_BASE_URL = "https://www.garanteprivacy.it";

/**
 * Extrait le DocwID numérique depuis l'URL d'un document Garante.
 * Ex. "/web/guest/home/docweb/-/docweb-display/docweb/10259569" → "10259569"
 */
export function extractGaranteDocwId(href: string): string | undefined {
  const match = href.match(/\/docweb\/(\d+)/);
  return match?.[1];
}

/**
 * Parse la date Garante depuis le format "28/05/2026".
 */
export function parseGaranteDate(raw: string): Date | undefined {
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return new Date(`${year}-${month}-${day}T00:00:00Z`);
}

/**
 * Infère le type de document Garante depuis le titre (en italien).
 * Fonctionne sans compréhension de l'italien — patterns structurels.
 */
export function inferGaranteDocumentType(title: string): DocumentType {
  const t = title.toLowerCase();
  if (
    t.includes("provvedimento") ||
    t.includes("sanzione") ||
    t.includes("ammonimento") ||
    t.includes("ingiunzione") ||
    t.includes("divieto") ||
    t.includes("ordinanza")
  ) {
    return "national_decision";
  }
  if (
    t.includes("linee guida") ||
    t.includes("parere") ||
    t.includes("deliberazione") ||
    t.includes("regolamento") ||
    t.includes("orientamento")
  ) {
    return "national_guideline";
  }
  return "national_decision";
}

export interface GaranteScrapingOptions {
  url?: string;
  fetcher?: FetchFn;
}

/**
 * Connecteur Garante (Autorità Garante per la protezione dei dati personali — Italie).
 *
 * Source : page de recherche des provvedimenti Garante
 * Méthode : scraping HTML
 * Langue : "it"
 *
 * Déduplication : externalId = DocwID numérique (ex. "10259569")
 * Rate limit : 2 000 ms entre appels (Liferay portal, prudence)
 *
 * Note : le flux RSS officiel (/gpdp-rss) retourne un HTML Liferay invalide.
 * Le scraping de la page de recherche est la méthode retenue.
 */
export async function fetchGaranteDocuments(
  options: GaranteScrapingOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = GARANTE_RICERCA_URL,
    fetcher = fetch as unknown as FetchFn,
  } = options;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Garante ricerca a retourné HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseGaranteHtml(html);
}

/**
 * Parse le HTML de la page de recherche des provvedimenti Garante.
 * Exposé séparément pour faciliter les tests avec fixtures.
 */
export function parseGaranteHtml(html: string): DetectedDocument[] {
  const root = parseHtml(html);
  const documents: DetectedDocument[] = [];

  const titleLinks = root.querySelectorAll(GARANTE_SELECTORS.titleLink);
  if (titleLinks.length === 0) return [];

  for (const linkEl of titleLinks) {
    const href = linkEl.getAttribute("href") ?? "";
    const titleAttr = linkEl.getAttribute("title") ?? "";
    const titleText = linkEl.text.trim();
    const title = (titleAttr || titleText).trim();

    if (!href || !title) continue;

    const docwId = extractGaranteDocwId(href);
    if (!docwId) continue;

    const fullUrl = href.startsWith("http")
      ? href
      : `${GARANTE_BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    // La date est dans le frère précédent (.data-risultato)
    // Cherche le nœud parent et remonte vers la date
    let publicationDate: Date | undefined;
    const parentDiv = linkEl.parentNode?.parentNode;
    if (parentDiv) {
      // Chercher dans tout le bloc parent (frère précédent = .data-risultato)
      const rawHtml = parentDiv.outerHTML ?? "";
      const dateMatch = rawHtml.match(/class="data-risultato"[^>]*>[\s\S]*?<p[^>]*>([\d\/]+)<\/p>/);
      if (dateMatch) {
        publicationDate = parseGaranteDate(dateMatch[1]);
      }
    }

    documents.push({
      externalId: docwId,
      sourceUrl: fullUrl,
      title,
      documentType: inferGaranteDocumentType(title),
      language: "it",
      country: "IT",
      publicationDate,
    });
  }

  return documents;
}
