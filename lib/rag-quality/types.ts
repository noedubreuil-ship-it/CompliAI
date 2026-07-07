/**
 * Types partagés pour le module rag-quality (Phase 5).
 * Suite de vérification de qualité continue du RAG production.
 */

// ─── Golden Set ───────────────────────────────────────────────────────────────

export interface RequiredArticle {
  /** Libellé court de la regulation (ex: "AI Act", "RGPD") */
  regulation: string;
  /** Numéro d'article (ex: "5", "6", "22") — null = tout article de ce règlement */
  article_number: string | null;
  /** Description humaine pour les rapports */
  description: string;
  /** "critical" = alerte immédiate si absent ; "important" = warning */
  severity: "critical" | "important";
}

export interface BlacklistedArticle {
  regulation: string;
  article_number: string | null;
  reason: string;
  /**
   * Si renseigné, la blacklist ne tire QUE SI les article_numbers listés ici
   * sont ABSENTS des résultats (même règlement). Permet d'exprimer :
   * "Art. 55 est problématique uniquement s'il apparaît SANS Art. 53".
   */
  condition_only_when_missing?: string[];
}

export interface GoldenQuestion {
  /** Identifiant court unique */
  id: string;
  /** Thème pour les rapports */
  theme: string;
  /** Formulation exacte envoyée au RAG */
  question: string;
  /** Articles/jurisprudences qui DOIVENT apparaître en top-10 */
  required_articles: RequiredArticle[];
  /** Articles qui NE DOIVENT PAS apparaître (erreur qualificative) */
  blacklisted_articles: BlacklistedArticle[];
  /** Qualification juridique attendue (pour les rapports) */
  expected_qualification: string;
  /** ECLI obligatoires (pour les questions jurisprudence) */
  required_ecli?: string[];
  /** Pour Q16 : lettres de clauses obligatoires dans les articles cités */
  required_clause_letters?: string[];
  /** Éléments souhaitables mais non critiques */
  optional_elements?: string[];
}

// ─── Résultat d'une exécution sur une question ───────────────────────────────

export interface ChunkResult {
  regulation: string;
  article_number: string | null;
  article_title: string | null;
  content_excerpt: string;
  similarity: number;
}

export interface QuestionResult {
  question_id: string;
  question: string;
  executed_at: string;
  returned_chunks: ChunkResult[];
  articles_cited: string[];
  missing_required: RequiredArticle[];
  present_blacklisted: BlacklistedArticle[];
  anomalies: string[];
  status: "ok" | "warning" | "critical";
}

// ─── Coverage (Mécanisme 3) ───────────────────────────────────────────────────

export interface CoverageEntry {
  id: string;
  query: string;
  regulation: string;
  article: string;
  priority: "critical" | "important" | "low";
  indexed: boolean; // false si le règlement n'est pas encore indexé
  exclude_reason?: string; // si exclus du monitoring actif
}

export interface CoverageResult {
  entry: CoverageEntry;
  found_in_top3: boolean;
  best_rank: number | null; // 1-10, null si absent
  top_chunk: ChunkResult | null;
}

// ─── Chunks morts (Mécanisme 4) ──────────────────────────────────────────────

export interface DeadChunkCandidate {
  chunk_id: string;
  regulation: string;
  article_number: string | null;
  content_excerpt: string;
  inserted_at: string;
  pending_document_id: string | null;
  self_retrieval_rank: number | null; // rang quand on cherche son propre contenu
  is_dead: boolean;
  reason: string;
}

// ─── Résultat global d'une exécution pipeline ────────────────────────────────

export type ExecutionMode =
  | "weekly_divergence"
  | "monthly_comparison"
  | "coverage_check"
  | "dead_chunks";

export interface PipelineExecutionResult {
  mode: ExecutionMode;
  executed_at: string;
  duration_ms: number;
  question_results?: QuestionResult[];
  coverage_results?: CoverageResult[];
  dead_chunks?: DeadChunkCandidate[];
  overall_status: "ok" | "warning" | "critical";
  summary: string;
}
