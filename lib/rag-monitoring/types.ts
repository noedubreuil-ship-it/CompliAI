export type DocumentType =
  | "eu_regulation"
  | "eu_directive"
  | "eu_decision"
  | "cjeu_judgment"
  | "cjeu_order"
  | "cjeu_referral"
  | "edpb_guideline"
  | "edpb_recommendation"
  | "edpb_binding_decision"
  | "ai_office_guidance"
  | "national_decision"
  | "national_guideline"
  /**
   * Procédure législative en cours (Parlement européen).
   * VEILLE UNIQUEMENT : absent de SUPPORTED_DOCUMENT_TYPES (lib/rag-ingestion/pipeline.ts),
   * donc jamais ingéré dans `legal_chunks`. Ne pas ajouter à cet ensemble sans
   * porter d'abord un marquage « proposition — non applicable » jusque dans les
   * prompts de génération.
   */
  | "legislative_procedure"
  | "other";

export type SourceType =
  | "eurlex_rss"
  | "curia_rss"
  | "curia_scraping"
  | "edpb_scraping"
  | "ai_office_scraping"
  | "ep_procedure_api"
  | "national_authority_scraping"
  | "national_authority_rss";

export type MonitoringStatus = "ok" | "error" | "silence_alert" | "markup_change";

export interface DetectedDocument {
  /** Identifiant externe unique : CELEX, ECLI, ou hash SHA-256 de l'URL */
  externalId: string;
  celex?: string;
  ecli?: string;
  sourceUrl: string;
  title: string;
  documentType: DocumentType;
  /** Code langue ISO 639-1 de la version téléchargée (ex. "fr", "en") */
  language: string;
  country: string;
  publicationDate?: Date;
}

export interface MonitoringSource {
  id: string;
  name: string;
  sourceType: SourceType;
  url: string;
  authority: string;
  country: string;
  language?: string;
  config: Record<string, unknown>;
  lastCheckedAt?: Date;
  lastDocumentDetectedAt?: Date;
  consecutiveSilenceDays: number;
  silenceAlertThresholdDays?: number;
  pageStructureHash?: string;
}

export interface MonitoringRunResult {
  sourceId: string;
  executedAt: Date;
  durationMs: number;
  status: MonitoringStatus;
  documentsFound: number;
  documentsNew: number;
  documentsDuplicate: number;
  detectedDocuments: DetectedDocument[];
  alerts: string[];
  /** Nombre total de retries réseau nécessaires pour cette source */
  retryCount?: number;
  error?: string;
}

/** Paramètre pour injecter une fonction fetch (production = globalThis.fetch, tests = mock depuis fixture) */
export type FetchFn = (
  url: string,
  init?: RequestInit
) => Promise<{ text: () => Promise<string>; ok: boolean; status: number }>;
