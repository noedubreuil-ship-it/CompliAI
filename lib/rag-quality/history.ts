/**
 * history.ts — Persistence dans rag_quality_history (Migration 038).
 * Stocke et interroge les résultats des 4 mécanismes de détection.
 */

import { createClient } from "@supabase/supabase-js";
import type {
  QuestionResult,
  CoverageResult,
  DeadChunkCandidate,
  ExecutionMode,
} from "./types";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

export async function saveQuestionResults(
  results: QuestionResult[],
  mode: ExecutionMode
): Promise<void> {
  const supabase = getServiceClient();
  const rows = results.map((r) => ({
    execution_mode: mode,
    question_id: r.question_id,
    returned_chunks: r.returned_chunks,
    articles_cited: r.articles_cited,
    anomalies_detected: r.anomalies,
    status: r.status,
    metadata: {
      missing_required: r.missing_required,
      present_blacklisted: r.present_blacklisted,
      question_text: r.question,
    },
  }));

  const { error } = await supabase.from("rag_quality_history").insert(rows);
  if (error) throw new Error(`history.saveQuestionResults: ${error.message}`);
}

export async function saveCoverageResults(
  results: CoverageResult[],
  coverageScore: number
): Promise<void> {
  const supabase = getServiceClient();
  const failedEntries = results.filter((r) => !r.found_in_top3);

  const row = {
    execution_mode: "coverage_check" as ExecutionMode,
    coverage_score: coverageScore,
    status: coverageScore >= 0.9 ? "ok" : coverageScore >= 0.7 ? "warning" : "critical",
    anomalies_detected: failedEntries.map((r) =>
      `NOT_IN_TOP3:${r.entry.regulation}:${r.entry.article}:priority=${r.entry.priority}`
    ),
    metadata: {
      total_checked: results.length,
      found_in_top3: results.filter((r) => r.found_in_top3).length,
      failed_critical: failedEntries.filter((r) => r.entry.priority === "critical").length,
      failed_important: failedEntries.filter((r) => r.entry.priority === "important").length,
      failed_entries: failedEntries.map((r) => ({
        id: r.entry.id,
        regulation: r.entry.regulation,
        article: r.entry.article,
        priority: r.entry.priority,
        best_rank: r.best_rank,
      })),
    },
  };

  const { error } = await supabase.from("rag_quality_history").insert(row);
  if (error) throw new Error(`history.saveCoverageResults: ${error.message}`);
}

export async function saveDeadChunks(deadChunks: DeadChunkCandidate[]): Promise<void> {
  const supabase = getServiceClient();

  const row = {
    execution_mode: "dead_chunks" as ExecutionMode,
    status: deadChunks.length === 0 ? "ok" : deadChunks.length <= 3 ? "warning" : "critical",
    anomalies_detected: deadChunks.map(
      (c) => `DEAD_CHUNK:${c.chunk_id}:${c.regulation}:${c.article_number ?? "*"}`
    ),
    metadata: {
      dead_chunks_count: deadChunks.length,
      dead_chunks: deadChunks.map((c) => ({
        chunk_id: c.chunk_id,
        regulation: c.regulation,
        article_number: c.article_number,
        inserted_at: c.inserted_at,
        self_retrieval_rank: c.self_retrieval_rank,
        reason: c.reason,
      })),
    },
  };

  const { error } = await supabase.from("rag_quality_history").insert(row);
  if (error) throw new Error(`history.saveDeadChunks: ${error.message}`);
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export interface HistoricalRecord {
  executed_at: string;
  question_id: string | null;
  articles_cited: string[];
  anomalies_detected: string[];
  status: string;
}

/**
 * Récupère l'historique d'une question sur les N dernières exécutions.
 */
export async function getQuestionHistory(
  questionId: string,
  limit = 12
): Promise<HistoricalRecord[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("rag_quality_history")
    .select("executed_at, question_id, articles_cited, anomalies_detected, status")
    .eq("question_id", questionId)
    .eq("execution_mode", "weekly_divergence")
    .order("executed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`history.getQuestionHistory: ${error.message}`);
  return (data ?? []) as HistoricalRecord[];
}

/**
 * Compare les résultats actuels avec la dernière exécution pour détecter
 * une dérive des articles cités (mécanisme 2 : comparaison historique).
 */
export async function detectHistoricalDrift(
  currentResults: QuestionResult[]
): Promise<string[]> {
  const alerts: string[] = [];

  for (const current of currentResults) {
    const history = await getQuestionHistory(current.question_id, 1);
    if (history.length === 0) continue;

    const previous = history[0];
    const prevSet = new Set(previous.articles_cited);
    const currSet = new Set(current.articles_cited);

    // Articles présents avant et maintenant absents
    const disappeared = [...prevSet].filter((a) => !currSet.has(a));
    // Articles nouvellement apparus
    const appeared = [...currSet].filter((a) => !prevSet.has(a));

    if (disappeared.length > 0) {
      alerts.push(
        `DRIFT_DISAPPEARED:${current.question_id} — articles disparus : ${disappeared.join(", ")}`
      );
    }
    if (appeared.length > 2) {
      // Plus de 2 articles nouveaux → dérive potentielle
      alerts.push(
        `DRIFT_APPEARED:${current.question_id} — ${appeared.length} nouveaux articles : ${appeared.slice(0, 5).join(", ")}…`
      );
    }
  }

  return alerts;
}

/**
 * Récupère la dernière exécution d'un mode donné.
 */
export async function getLastExecution(
  mode: ExecutionMode
): Promise<{ executed_at: string; status: string } | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("rag_quality_history")
    .select("executed_at, status")
    .eq("execution_mode", mode)
    .order("executed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as { executed_at: string; status: string } | null;
}
