/**
 * Types partagés pour l'ingestion massive du corpus RAG.
 * Vagues : edpb | cjue | regulations
 */

export type DocumentWave = "edpb" | "cjue" | "regulations";
export type DocumentPriority = "P1" | "P2" | "P3";

export type DocumentKind =
  | "edpb_guideline"
  | "edpb_recommendation"
  | "edpb_binding_decision"
  | "cjeu_judgment"
  | "eu_regulation"
  | "eu_directive"
  | "eu_decision"
  | "ai_office_guidance"
  | "other"; // pour edpb_opinion, statements

export interface MassDocument {
  id: string;
  title: string;
  kind: DocumentKind;
  wave: DocumentWave;
  priority: DocumentPriority;
  language: "fr" | "en";
  officialUrl: string;
  rawContentUrl?: string; // URL directe vers le texte (PDF ou HTML)
  celex?: string;
  ecli?: string;
  estimatedChunks: [number, number];
  sizeRisk?: "low" | "medium" | "high"; // risque dépassement max_tokens
  urlConfidence?: "high" | "medium" | "low"; // confiance dans l'URL
  skipUntilUrlFixed?: true; // exclure de l'execute jusqu'à vérification manuelle de l'URL
}
