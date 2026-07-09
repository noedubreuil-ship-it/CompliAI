/**
 * coverage-checker.ts — Mécanisme 3 : couverture des articles principaux.
 *
 * Pour chaque entrée de COVERAGE_ARTICLES (indexed = true), exécute une
 * requête sémantique et vérifie que le chunk correspondant est en top-3.
 *
 * Exécution mensuelle. Module en lecture seule.
 */

import { searchLegalChunks } from "@/lib/ai/rag";
import { COVERAGE_ARTICLES, getActiveCritical } from "./coverage-articles";
import type { CoverageEntry, CoverageResult, ChunkResult } from "./types";

const TOP_N = 3;
const MATCH_COUNT = 5; // On cherche 5 pour être sûr que le top-3 est couvert
const SIMILARITY_THRESHOLD = 0.55; // Plus permissif pour les requêtes de couverture

// ─── Vérification d'une entrée ───────────────────────────────────────────────

/**
 * Normalise pour comparaison souple :
 * "AI Act" ≈ "aiact", "ECLI:EU:C:2023:634" ≈ "ecli eu c 2023 634"
 */
function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

function chunkMatchesCoverageEntry(chunk: ChunkResult, entry: CoverageEntry): boolean {
  const regNorm = normalizeForMatch(chunk.regulation);
  const entryRegNorm = normalizeForMatch(entry.regulation);

  // Pour les ECLI, le champ regulation du chunk contient l'ECLI
  if (entry.regulation === "CJUE") {
    return regNorm.includes(normalizeForMatch(entry.article)) ||
      (chunk.article_number !== null &&
        normalizeForMatch(chunk.article_number).includes(normalizeForMatch(entry.article)));
  }

  // Pour EDPB, check sur regulation et article_number
  if (entry.regulation === "EDPB") {
    return regNorm.includes("edpb") &&
      (chunk.article_number !== null &&
        normalizeForMatch(chunk.article_number).includes(normalizeForMatch(entry.article)));
  }

  // Pour les règlements : regulation match + article_number match
  const regulationMatch = regNorm.includes(entryRegNorm.split(" ")[0]) ||
    entryRegNorm.includes(regNorm.split(" ")[0]);
  if (!regulationMatch) return false;

  // Vérification article_number
  if (!chunk.article_number) return false;
  const chunkArt = normalizeForMatch(chunk.article_number);
  const entryArt = normalizeForMatch(entry.article);
  return chunkArt === entryArt || chunkArt.startsWith(entryArt + " ");
}

export async function checkCoverageEntry(entry: CoverageEntry): Promise<CoverageResult> {
  // Si non indexé → résultat d'info automatique, pas d'alerte
  if (!entry.indexed) {
    return {
      entry,
      found_in_top3: false,
      best_rank: null,
      top_chunk: null,
    };
  }

  let chunks: ChunkResult[] = [];
  try {
    const raw = await searchLegalChunks(entry.query, MATCH_COUNT, SIMILARITY_THRESHOLD);
    chunks = raw.map((c) => ({
      regulation: c.regulation ?? "",
      article_number: c.article_number ?? null,
      article_title: c.article_title ?? null,
      content_excerpt: (c.content ?? "").slice(0, 200),
      similarity: c.similarity ?? 0,
    }));
  } catch {
    return {
      entry,
      found_in_top3: false,
      best_rank: null,
      top_chunk: null,
    };
  }

  let bestRank: number | null = null;
  let topChunk: ChunkResult | null = null;

  for (let i = 0; i < chunks.length; i++) {
    if (chunkMatchesCoverageEntry(chunks[i], entry)) {
      bestRank = i + 1; // 1-indexed
      topChunk = chunks[i];
      break;
    }
  }

  return {
    entry,
    found_in_top3: bestRank !== null && bestRank <= TOP_N,
    best_rank: bestRank,
    top_chunk: topChunk,
  };
}

// ─── Exécution complète ───────────────────────────────────────────────────────

export interface CoverageRunResult {
  executed_at: string;
  results: CoverageResult[];
  coverage_score: number; // proportion found_in_top3 parmi indexed
  indexed_checked: number;
  not_indexed: number;
  critical_failures: CoverageResult[];
  important_failures: CoverageResult[];
  low_failures: CoverageResult[];
}

/**
 * Exécute la vérification de couverture sur les articles actifs (indexed = true).
 *
 * @param criticalOnly - Si true, ne vérifie que les articles "critical" (plus rapide)
 * @param concurrency - Requêtes parallèles (défaut: 3)
 */
export async function runCoverageCheck(
  criticalOnly = false,
  concurrency = 3
): Promise<CoverageRunResult> {
  const toCheck = criticalOnly
    ? getActiveCritical()
    : COVERAGE_ARTICLES.filter((e) => !e.exclude_reason);

  const indexed = toCheck.filter((e) => e.indexed);
  const notIndexed = toCheck.filter((e) => !e.indexed);

  const results: CoverageResult[] = [];

  // Pas de check pour les non-indexés — on les inclut avec found=false par défaut
  for (const entry of notIndexed) {
    results.push({ entry, found_in_top3: false, best_rank: null, top_chunk: null });
  }

  // Vérification par batches pour les indexés
  for (let i = 0; i < indexed.length; i += concurrency) {
    const batch = indexed.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(checkCoverageEntry));
    results.push(...batchResults);
    if (i + concurrency < indexed.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const indexedResults = results.filter((r) => r.entry.indexed);
  const foundCount = indexedResults.filter((r) => r.found_in_top3).length;
  const coverageScore = indexedResults.length > 0 ? foundCount / indexedResults.length : 1;

  const failures = results.filter((r) => r.entry.indexed && !r.found_in_top3);

  return {
    executed_at: new Date().toISOString(),
    results,
    coverage_score: coverageScore,
    indexed_checked: indexedResults.length,
    not_indexed: notIndexed.length,
    critical_failures: failures.filter((r) => r.entry.priority === "critical"),
    important_failures: failures.filter((r) => r.entry.priority === "important"),
    low_failures: failures.filter((r) => r.entry.priority === "low"),
  };
}
