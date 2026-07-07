import { parse } from "node-html-parser";
import { createHash } from "crypto";
import { DetectedDocument, DocumentType, FetchFn } from "../types";

export const EDPB_DOCUMENTS_URL =
  "https://www.edpb.europa.eu/our-work-tools/our-documents_fr";

export const EDPB_BASE_URL = "https://www.edpb.europa.eu";

/** Silence alert threshold — EDPB publie environ toutes les 2 semaines */
export const EDPB_SILENCE_ALERT_DAYS = 30;

/**
 * Table de correspondance entre les libellés EDPB et les DocumentType du pipeline.
 * Les libellés sont ceux effectivement présents dans la page our-documents_fr.
 */
const DOCUMENT_TYPE_MAP: Record<string, DocumentType> = {
  "lignes directrices": "edpb_guideline",
  "guidelines": "edpb_guideline",
  "recommandations": "edpb_recommendation",
  "recommendations": "edpb_recommendation",
  "décision": "edpb_binding_decision",
  "decision": "edpb_binding_decision",
  "avis": "edpb_guideline",
  "opinion": "edpb_guideline",
  "avis du comité": "edpb_guideline",
  "opinion of the board": "edpb_guideline",
  "avis du comité (article 64)": "edpb_guideline",
  "décision contraignante": "edpb_binding_decision",
  "binding decision": "edpb_binding_decision",
};

/** Priorité de traitement par DocumentType (plus petit = plus prioritaire) */
export const DOCUMENT_TYPE_PRIORITY: Record<DocumentType, number> = {
  edpb_guideline: 0,
  edpb_recommendation: 0,
  edpb_binding_decision: 0,
  eu_regulation: 1,
  eu_directive: 1,
  eu_decision: 1,
  cjeu_judgment: 1,
  cjeu_order: 1,
  cjeu_referral: 3,
  ai_office_guidance: 1,
  national_decision: 2,
  national_guideline: 2,
  other: 3,
};

function resolveDocumentType(rawType: string): DocumentType {
  const normalized = rawType.trim().toLowerCase();
  for (const [key, value] of Object.entries(DOCUMENT_TYPE_MAP)) {
    if (normalized.includes(key)) return value;
  }
  return "other";
}

function parseEdpbDate(raw: string): Date | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // Format datetime ISO (ex. "2026-06-08T12:00:00Z")
  const isoMatch = trimmed.match(/datetime="([^"]+)"/);
  if (isoMatch) return new Date(isoMatch[1]);
  // Texte format "08 juin 2026"
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Hash SHA-256 du contenu principal de la page pour la détection de changement de markup */
export function hashPageStructure(html: string): string {
  const root = parse(html);
  const main = root.querySelector("main")?.innerHTML ?? html.slice(0, 2000);
  return createHash("sha256").update(main).digest("hex");
}

/** Détecte si le sélecteur principal retourne zéro items (possible rupture de markup) */
export interface MarkupAlert {
  type: "MARKUP_CHANGE" | "SCRAPING_ERROR";
  message: string;
}

export function checkMarkupIntegrity(
  html: string,
  previousHash: string | undefined,
  itemCount: number
): MarkupAlert[] {
  const alerts: MarkupAlert[] = [];
  const currentHash = hashPageStructure(html);

  if (itemCount === 0) {
    if (previousHash && currentHash !== previousHash) {
      alerts.push({
        type: "MARKUP_CHANGE",
        message:
          "MARKUP_CHANGE: 0 documents détectés et hash de page modifié — sélecteur CSS potentiellement invalide",
      });
    } else {
      alerts.push({
        type: "SCRAPING_ERROR",
        message: "SCRAPING_ERROR: 0 documents détectés — vérifier le sélecteur CSS EDPB",
      });
    }
  }

  return alerts;
}

export interface EdpbScrapingOptions {
  url?: string;
  fetcher?: FetchFn;
  previousPageHash?: string;
}

export interface EdpbScrapingResult {
  documents: DetectedDocument[];
  pageHash: string;
  markupAlerts: MarkupAlert[];
}

/**
 * Connecteur EDPB — scraping de la page our-documents.
 * Détecte toutes les nouvelles publications EDPB : lignes directrices,
 * recommandations, décisions Art. 65, avis.
 */
export async function fetchEdpbDocuments(
  options: EdpbScrapingOptions = {}
): Promise<EdpbScrapingResult> {
  const {
    url = EDPB_DOCUMENTS_URL,
    fetcher = fetch as unknown as FetchFn,
    previousPageHash,
  } = options;

  const response = await fetcher(url, {
    headers: {
      // Forcer HTTP/1.1 est géré côté serveur Node.js via undici options ;
      // ici on ajoute un User-Agent pour éviter les blocages de scraping basiques.
      "User-Agent":
        "CompliAI-RAG-Monitor/1.0 (contact: admin@compliai.fr; legal monitoring bot)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`EDPB page returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const root = parse(html);

  // Sélecteurs basés sur la structure réelle observée le 2026-06-24
  const cards = root.querySelectorAll(".document-card");
  const pageHash = hashPageStructure(html);
  const markupAlerts = checkMarkupIntegrity(html, previousPageHash, cards.length);

  const documents: DetectedDocument[] = [];

  for (const card of cards) {
    const titleEl =
      card.querySelector(".document-card__title a") ??
      card.querySelector(".document-card__title");
    const typeEl = card.querySelector(".document-card__document-type");
    const timeEl = card.querySelector(".document-card__date time");
    const linkEl = card.querySelector(".document-card__link");

    const title =
      titleEl?.text?.trim() ??
      card.querySelector("h3")?.text?.trim() ??
      "";
    const rawType = typeEl?.text?.trim() ?? "";
    const rawDate =
      timeEl?.getAttribute("datetime") ?? timeEl?.text?.trim() ?? "";
    const href = linkEl?.getAttribute("href") ?? "";

    if (!title || !href) continue;

    const sourceUrl = href.startsWith("http")
      ? href
      : `${EDPB_BASE_URL}${href}`;

    const documentType = resolveDocumentType(rawType);
    const publicationDate = rawDate ? new Date(rawDate) : undefined;

    // L'externalId est le hash de l'URL canonique pour la déduplication
    const externalId = createHash("sha256")
      .update(sourceUrl)
      .digest("hex")
      .slice(0, 16);

    documents.push({
      externalId,
      sourceUrl,
      title,
      documentType,
      language: "fr",
      country: "EU",
      publicationDate: publicationDate && !isNaN(publicationDate.getTime())
        ? publicationDate
        : undefined,
    });
  }

  return { documents, pageHash, markupAlerts };
}
