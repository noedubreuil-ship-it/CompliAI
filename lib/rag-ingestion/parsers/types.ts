/**
 * Types partagés pour le pipeline de parsing RAG (Phase 2).
 *
 * Ces types définissent la sortie des parsers Claude → staging_chunks.
 * Ils doivent rester strictement alignés avec le schéma SQL de staging_chunks.
 */

// ─── Modèle Claude figé pour toute la Phase 2 ────────────────────────────────
// Choix délibéré : claude-sonnet-4-6, validé le 2026-06-25.
//
// Justification :
// - Modèle le plus récent de la famille Sonnet disponible via l'API Anthropic
//   (confirmé via client.models.list() : claude-sonnet-4-6 > claude-sonnet-4-5-20250929)
// - Meilleure compréhension des structures juridiques complexes vs Sonnet 4.5
// - Coût identique à Sonnet 4.5 : $3/M tokens input, $15/M tokens output
// - Température 0 obligatoire : sorties JSON déterministes, pas de variabilité
// - Opus 4.x (Opus 4.6/4.7/4.8) écarté : ~5x plus cher, gain marginal sur textes
//   juridiques structurés où le prompt guide étroitement la sortie
// - Haiku 4.5 écarté : qualité insuffisante pour découpage d'articles complexes
//   (ex. AI Act Art.5 avec 4 niveaux hiérarchiques)
export const RAG_INGESTION_MODEL = "claude-sonnet-4-6" as const;
export const RAG_INGESTION_TEMPERATURE = 0 as const;
/**
 * Plafond de tokens de sortie par appel de parsing.
 *
 * Etait a 8192, seize fois sous la capacite reelle de Claude Sonnet 4.6
 * (128 000 tokens de sortie). Les avis EDPB, longs par nature, depassaient ce
 * plafond : la reponse etait tronquee en plein JSON et le pipeline signalait
 * « Reponse Claude non parseable en JSON » — un message trompeur. 5 documents
 * sur 10 ont echoue ainsi le 2026-07-18.
 *
 * Porte a 64000 le 2026-07-18, en meme temps que le passage de l'appel en
 * streaming (base-parser.ts). Le palier intermediaire a 16384 restait trop bas :
 * un arret CJUE reel a ete mesure a 16 013 tokens de sortie, soit 2 % sous le
 * plafond — la majorite des arrets de la Cour tronquaient encore.
 *
 * 64000 et non les 128000 du modele : la marge couvre largement le plus long
 * arret observe, et un plafond plus bas borne le cout d'un document aberrant.
 */
export const RAG_INGESTION_MAX_TOKENS = 64000 as const;

// ─── Types de document supportés ─────────────────────────────────────────────
export type SupportedDocumentType =
  | "eu_regulation"
  | "eu_directive"
  | "cjeu_judgment"
  | "cjeu_order"
  | "edpb_guideline"
  | "edpb_recommendation"
  | "edpb_binding_decision"
  | "ai_office_guidance"
  | "national_decision"
  | "national_guideline";

// Mapping document_type → text_type pour staging_chunks
export const DOCUMENT_TYPE_TO_TEXT_TYPE: Record<SupportedDocumentType, string> = {
  eu_regulation: "reglement_ue",
  eu_directive: "directive_ue",
  cjeu_judgment: "jurisprudence_cjue",
  cjeu_order: "jurisprudence_cjue",
  edpb_guideline: "lignes_directrices",
  edpb_recommendation: "recommandation_edpb",
  edpb_binding_decision: "decision_edpb_art65",
  ai_office_guidance: "guidance_ai_office",
  national_decision: "decision_autorite_nationale",
  national_guideline: "lignes_directrices",
};

// ─── Chunk brut retourné par Claude ──────────────────────────────────────────
export interface RawParsedChunk {
  article_number: string | null;
  paragraph_number: string | null;
  point_letter: string | null;
  article_title: string | null;
  chapter: string | null;
  content: string;
}

// ─── Sortie brute du parser Claude ───────────────────────────────────────────
export interface RawParserOutput {
  regulation: string;
  celex: string | null;
  ecli?: string | null;
  publication_date: string | null;
  authority?: string | null;
  country?: string | null;
  language?: string | null;
  parties?: string | null;
  chunks: RawParsedChunk[];
}

// ─── Chunk enrichi prêt pour staging_chunks ──────────────────────────────────
export interface StagingChunkInsert {
  document_id: string;
  regulation: string;
  article_number: string | null;
  paragraph_number: string | null;
  point_letter: string | null;
  article_title: string | null;
  chapter: string | null;
  content: string;
  language: string;
  country: string;
  text_type: string;
  source_type: string;
  source_url: string | null;
  eurlex_url: string | null;
  publication_date: string | null;
  chunk_hash: string;
}

// ─── Résultat d'un appel parser ───────────────────────────────────────────────
export interface ParserResult {
  ok: true;
  rawOutput: RawParserOutput;
  chunks: StagingChunkInsert[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };
  promptHash: string;
}

export interface ParserError {
  ok: false;
  error: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };
}

export type ParserResponse = ParserResult | ParserError;

// ─── Input d'un parser ────────────────────────────────────────────────────────
export interface ParserInput {
  documentId: string;
  documentType: SupportedDocumentType;
  documentText: string;
  sourceUrl: string | null;
  eurLexUrl?: string | null;
  publicationDate?: string | null;
  language?: string;
  country?: string;
}
