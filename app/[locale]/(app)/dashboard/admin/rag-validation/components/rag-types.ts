/**
 * Types partagés entre les composants RAG Validation (Phase 3).
 */

export interface DocumentWithStats {
  id: string;
  title: string | null;
  title_fr?: string | null;
  document_type: string;
  celex: string | null;
  ecli: string | null;
  source_url: string;
  publication_date: string | null;
  detected_at: string;
  language: string;
  country: string;
  total_chunks: number;
  pending_chunks: number;
  approved_chunks: number;
  rejected_chunks: number;
}

export interface StagingChunkRow {
  id: string;
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
  source_type: string | null;
  source_url: string | null;
  eurlex_url: string | null;
  publication_date: string | null;
  validation_status: "pending" | "approved" | "rejected" | "correction_needed";
  rejection_reason: string | null;
  chunk_hash: string | null;
  parsed_at: string;
}

export interface ValidationStats {
  total_staged: number;
  total_pending_chunks: number;
  by_type: Record<string, { documents: number; pending_chunks: number }>;
  last_validation?: string;
}

/**
 * Détermine si un chunk appartient à une jurisprudence CJUE (ECLI dans regulation).
 * Les ECLI commencent toujours par "ECLI:".
 */
export function isEcliChunk(chunk: StagingChunkRow): boolean {
  return chunk.regulation?.startsWith("ECLI:") ?? false;
}

/**
 * Détermine si le champ article_number d'un chunk EDPB contient une plage de paragraphes
 * (ex: §5-§6, §12-§14) plutôt qu'un numéro d'article au sens strict.
 */
export function isParagraphRange(articleNumber: string | null): boolean {
  if (!articleNumber) return false;
  return /^§\d/.test(articleNumber);
}

/**
 * Retourne un label lisible pour le type de document.
 */
export const DOC_TYPE_LABELS: Record<string, string> = {
  eu_regulation: "Règlement UE",
  eu_directive: "Directive UE",
  eu_decision: "Décision UE",
  cjeu_judgment: "Arrêt CJUE",
  edpb_guideline: "Lignes directrices EDPB",
  edpb_recommendation: "Recommandation EDPB",
  edpb_binding_decision: "Décision contraignante EDPB",
  ai_office_guidance: "Guidance AI Office",
  national_decision: "Décision nationale",
  national_guideline: "Ligne directrice nationale",
  other: "Autre",
};

export const DOC_TYPE_COLORS: Record<string, string> = {
  eu_regulation: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  eu_directive: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  eu_decision: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  cjeu_judgment: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  edpb_guideline: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  edpb_recommendation: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  edpb_binding_decision: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  ai_office_guidance: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  national_decision: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  national_guideline: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  other: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

/**
 * Retourne l'identifiant humain du document (CELEX, ECLI, ou source).
 */
export function getDocumentId(doc: Pick<DocumentWithStats, "celex" | "ecli" | "source_url">): string {
  if (doc.celex) return doc.celex;
  if (doc.ecli) return doc.ecli;
  return doc.source_url;
}

/**
 * Construit le label de référence pour un chunk (ex: "Art. 53 §1 (a)", "§55-§58").
 */
export function buildChunkRef(chunk: StagingChunkRow): string {
  if (isParagraphRange(chunk.article_number)) {
    return chunk.article_number ?? "—";
  }
  const parts: string[] = [];
  if (chunk.article_number) parts.push(`Art. ${chunk.article_number}`);
  if (chunk.paragraph_number) parts.push(`§${chunk.paragraph_number}`);
  if (chunk.point_letter) parts.push(`(${chunk.point_letter})`);
  return parts.length > 0 ? parts.join(" ") : (chunk.chapter ?? "—");
}

// Types des documents non ingérés : source unique dans lib/, re-exportée ici
// pour que le client et la route API ne puissent pas diverger.
export type { BlockedReason, BlockedDocument } from "@/lib/rag-validation/classify-error";
