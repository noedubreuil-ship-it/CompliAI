import { createHash } from "crypto";
import { parse as parseHtml } from "node-html-parser";
import { DetectedDocument, DocumentType, FetchFn } from "../types";

export const IPSI_NOVICE_URL = "https://www.ip-rs.si/novice/";

/**
 * Sélecteurs pour la page novice IP SI (vérifié le 2026-06-25).
 *
 * Structure HTML du tableau :
 * <table>
 *   <thead>
 *     <tr>
 *       <th>Datum</th>
 *       <th>Naslov</th>
 *     </tr>
 *   </thead>
 *   <tbody>
 *     <tr>
 *       <td align="center">24.06.2026</td>
 *       <td align="left"><a href="https://www.ip-rs.si/go?u=%2Fnovice%2F...">Titre SL</a></td>
 *     </tr>
 *   </tbody>
 * </table>
 *
 * Les URLs sont encodées via le proxy go?u=<percent_encoded_path>.
 */
export const IPSI_SELECTORS = {
  table_row: "table tr",
  date_cell: "td:first-child",
  title_link: "td:last-child a",
};

export const IPSI_BASE_URL = "https://www.ip-rs.si";

export const IPSI_KEYWORDS = [
  "odločba",
  "sklep",
  "pritožbi",
  "kršitev",
  "smernice",
  "priporočilo",
  "splošne uredbe",
  "osebnih podatkov",
  "umetna inteligenca",
  "aktu o umetni inteligenci",
  "regulativnega peskovnika",
  "digitalnem okolju",
  "plačilnih kartic",
  "ecrp",
];

export const IPSI_NEGATIVE_KEYWORDS = [
  "širimo ekipo",
  "nagrada",
  "konferenci",
  "delavnici za učitelje",
  "ustvarjalnega natečaja",
  "letno poročilo predstavila",
  "mladinski dialog",
];

/**
 * Parse la date IP SI depuis le format "24.06.2026" (JJ.MM.AAAA).
 */
export function parseIpsiDate(raw: string): Date | undefined {
  const match = raw.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return new Date(
    `${year}-${month}-${day}T00:00:00Z`
  );
}

/**
 * Décode l'URL depuis le proxy ip-rs.si : "go?u=%2Fnovice%2F..."
 * et retourne l'URL absolue canonique.
 */
export function decodeIpsiProxyUrl(rawHref: string): string {
  try {
    if (rawHref.includes("go?u=")) {
      const param = rawHref.replace(/.*go\?u=/, "");
      const decoded = decodeURIComponent(param);
      if (decoded.startsWith("/")) return `${IPSI_BASE_URL}${decoded}`;
      return decoded;
    }
    if (rawHref.startsWith("http")) return rawHref;
    return `${IPSI_BASE_URL}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;
  } catch {
    return rawHref;
  }
}

/**
 * Génère l'externalId depuis le chemin de l'URL décodée.
 * Ex. "/novice/jesenski-delavnici-za-ucitelje-..." → "jesenski-delavnici-za-ucitelje-..."
 */
export function ipsiUrlToExternalId(decodedUrl: string): string {
  const slug = decodedUrl.replace(/.*\/novice\//, "").replace(/[?#].*/, "").replace(/\/$/, "").trim();
  if (slug && slug !== decodedUrl) return slug;
  return createHash("sha256").update(decodedUrl).digest("hex").slice(0, 16);
}

export function isIpsiRelevant(title: string): boolean {
  const normalized = title.toLowerCase();
  if (IPSI_NEGATIVE_KEYWORDS.some((kw) => normalized.includes(kw.toLowerCase()))) {
    return false;
  }
  return IPSI_KEYWORDS.some((kw) => normalized.includes(kw.toLowerCase()));
}

/**
 * Infère le type de document IP SI depuis le titre (en slovène).
 * Fonctionne sans compréhension du slovène — patterns structurels et mots-clés universels.
 */
export function inferIpsiDocumentType(title: string): DocumentType {
  const t = title.toLowerCase();
  if (
    t.includes("odločba") ||
    t.includes("sklep") ||
    t.includes("inšpekcija") ||
    t.includes("prekršek") ||
    t.includes("kazen") ||
    t.includes("kršitev")
  ) {
    return "national_decision";
  }
  if (
    t.includes("smernice") ||
    t.includes("priporočilo") ||
    t.includes("mnenje") ||
    t.includes("napotki")
  ) {
    return "national_guideline";
  }
  return "national_decision";
}

export interface IpsiScrapingOptions {
  url?: string;
  fetcher?: FetchFn;
}

/**
 * Connecteur IP SI (Informacijski pooblaščenec — Slovénie) — scraping HTML.
 *
 * Source : https://www.ip-rs.si/novice/
 * Langue : "sl"
 *
 * Déduplication : externalId = slug de l'URL décodée
 * Rate limit : 2 000 ms entre appels
 *
 * Note : les dates sont au format "JJ.MM.AAAA" (ex. "24.06.2026") —
 * parseIpsiDate() les parse sans locale SL.
 * Les URLs passent par un proxy go?u=<encoded_path> — decodeIpsiProxyUrl() les decode.
 */
export async function fetchIpsiDocuments(
  options: IpsiScrapingOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = IPSI_NOVICE_URL,
    fetcher = fetch as unknown as FetchFn,
  } = options;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`IP SI novice a retourné HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseIpsiHtml(html).filter((doc) => isIpsiRelevant(doc.title));
}

/**
 * Parse le HTML de la page novice IP SI.
 * Exposé séparément pour faciliter les tests avec fixtures.
 */
export function parseIpsiHtml(html: string): DetectedDocument[] {
  const root = parseHtml(html);
  const documents: DetectedDocument[] = [];

  const rows = root.querySelectorAll(IPSI_SELECTORS.table_row);
  if (rows.length === 0) return [];

  for (const row of rows) {
    const dateEl = row.querySelector(IPSI_SELECTORS.date_cell);
    const linkEl = row.querySelector(IPSI_SELECTORS.title_link);

    if (!dateEl || !linkEl) continue;

    const rawDate = dateEl.text.trim();
    // Ignorer les en-têtes (non-dates)
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)) continue;

    const href = linkEl.getAttribute("href") ?? "";
    const title = linkEl.text.trim();
    if (!href || !title) continue;

    const decodedUrl = decodeIpsiProxyUrl(href);
    const publicationDate = parseIpsiDate(rawDate);

    documents.push({
      externalId: ipsiUrlToExternalId(decodedUrl),
      sourceUrl: decodedUrl,
      title,
      documentType: inferIpsiDocumentType(title),
      language: "sl",
      country: "SI",
      publicationDate,
    });
  }

  return documents;
}
