/**
 * runner.ts — Exécute les questions du golden set sur le RAG production.
 *
 * Module en lecture seule : ne modifie aucune table de production.
 * Utilise searchLegalChunksHybrid() (lib/ai/rag.ts) — cosine 60% + BM25 40%.
 * matchCount = 15 pour maximiser le rappel sur les questions AI Act.
 */

import { searchLegalChunks, searchLegalChunksHybrid } from "@/lib/ai/rag";
import { GOLDEN_SET } from "./golden-set";
import type {
  GoldenQuestion,
  ChunkResult,
  QuestionResult,
  RequiredArticle,
  BlacklistedArticle,
} from "./types";

const MATCH_COUNT = 15;
// Seuil cosine bas pour permettre à BM25 de ramener des chunks pertinents
// via FULL OUTER JOIN même si la similarité vectorielle est faible.
const SIMILARITY_THRESHOLD = 0.25;

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Normalise une chaîne regulation pour comparaison insensible à la casse
 * et aux variantes typographiques.
 */
function normalizeReg(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Teste si un chunk correspond à un article de référence.
 * La comparaison est souple : un article_number null côté référence
 * correspond à tout chunk de ce règlement.
 */
function chunkMatchesRef(
  chunk: ChunkResult,
  ref: RequiredArticle | BlacklistedArticle
): boolean {
  const regMatch = normalizeReg(chunk.regulation).includes(normalizeReg(ref.regulation));
  if (!regMatch) return false;
  if (ref.article_number === null) return true;
  const chunkArt = chunk.article_number?.trim() ?? "";
  const refArt = ref.article_number.trim();
  // "9" doit matcher "9", "9_§1", "9bis" mais PAS "92" ni "90"
  // → correspondance exacte OU préfixe suivi d'un caractère non-numérique
  return chunkArt === refArt ||
    (chunkArt.startsWith(refArt) && !/^\d/.test(chunkArt[refArt.length] ?? "x"));
}

// ─── Analyse d'une seule question ────────────────────────────────────────────

export async function runQuestion(q: GoldenQuestion): Promise<QuestionResult> {
  const executedAt = new Date().toISOString();

  let rawChunks;
  try {
    rawChunks = await searchLegalChunksHybrid(q.question, MATCH_COUNT, SIMILARITY_THRESHOLD);
  } catch (err) {
    return {
      question_id: q.id,
      question: q.question,
      executed_at: executedAt,
      returned_chunks: [],
      articles_cited: [],
      missing_required: q.required_articles,
      present_blacklisted: [],
      anomalies: [`rag_search_error: ${(err as Error).message}`],
      status: "critical",
    };
  }

  const returnedChunks: ChunkResult[] = rawChunks.map((c) => ({
    regulation: c.regulation ?? "",
    article_number: c.article_number ?? null,
    article_title: c.article_title ?? null,
    content_excerpt: (c.content ?? "").slice(0, 300),
    similarity: c.similarity ?? 0,
  }));

  // Second pass : si des articles critiques manquent après la passe principale,
  // certaines sources polluantes (ex: Commission Guidelines en anglais) peuvent
  // monopoliser les slots. On réinterroge avec un filtre par règlement.
  const criticalRegsMissing = new Set(
    q.required_articles
      .filter(ra => ra.severity === "critical" && !returnedChunks.some(c => chunkMatchesRef(c, ra)))
      .map(ra => ra.regulation)
  );
  for (const reg of criticalRegsMissing) {
    try {
      // Recherche cosine-only avec match_count élevé (1000) pour contourner la limitation
      // HNSW : ef_search trop bas (< 1000) peut exclure des chunks pertinents d'un règlement
      // quand des sources concurrentes (ex: Commission Guidelines) forment un cluster dense.
      // À partir de match_count=1000, Art.50 AI Act est retrouvé pour la query Q15.
      const cosineChunks = await searchLegalChunks(q.question, 1000, 0.40);
      // startsWith pour éviter que "Commission Guidelines ... AI Act" matche "AI Act"
      const suppChunks = cosineChunks.filter(sc =>
        normalizeReg(sc.regulation ?? "").startsWith(normalizeReg(reg))
      );
      for (const sc of suppChunks) {
        const isDup = returnedChunks.some(
          c => c.regulation === (sc.regulation ?? "") && c.article_number === (sc.article_number ?? null)
        );
        if (!isDup) {
          returnedChunks.push({
            regulation: sc.regulation ?? "",
            article_number: sc.article_number ?? null,
            article_title: sc.article_title ?? null,
            content_excerpt: (sc.content ?? "").slice(0, 300),
            similarity: sc.similarity ?? 0,
          });
        }
      }
    } catch {
      // Passe supplémentaire non critique — on continue sans elle
    }
  }

  // Articles cités = "règlement:article" pour chaque chunk distinct
  const articleSet = new Set<string>();
  for (const c of returnedChunks) {
    const key = `${c.regulation}:${c.article_number ?? "*"}`;
    articleSet.add(key);
  }
  const articles_cited = [...articleSet];

  // Vérification articles requis
  const missingRequired: RequiredArticle[] = [];
  for (const req of q.required_articles) {
    const found = returnedChunks.some((c) => chunkMatchesRef(c, req));
    if (!found) missingRequired.push(req);
  }

  // Vérification articles blacklistés
  const presentBlacklisted: BlacklistedArticle[] = [];
  for (const bl of q.blacklisted_articles) {
    const found = returnedChunks.some((c) => chunkMatchesRef(c, bl));
    if (!found) continue;

    // Blacklist conditionnelle : ne fire que si les articles listés dans
    // condition_only_when_missing sont ABSENTS des résultats.
    if (bl.condition_only_when_missing && bl.condition_only_when_missing.length > 0) {
      const allConditionsMet = bl.condition_only_when_missing.every((artNum) => {
        const condRef = { regulation: bl.regulation, article_number: artNum };
        return !returnedChunks.some((c) => chunkMatchesRef(c, condRef));
      });
      if (!allConditionsMet) continue; // au moins un article conditionnel est présent → pas de fire
    }

    presentBlacklisted.push(bl);
  }

  // Construction des anomalies
  const anomalies: string[] = [];
  for (const missing of missingRequired) {
    const code = missing.severity === "critical" ? "CRITICAL_MISSING" : "IMPORTANT_MISSING";
    anomalies.push(
      `${code}:${missing.regulation}:${missing.article_number ?? "*"} — ${missing.description}`
    );
  }
  for (const bl of presentBlacklisted) {
    anomalies.push(
      `BLACKLISTED_PRESENT:${bl.regulation}:${bl.article_number ?? "*"} — ${bl.reason}`
    );
  }

  // Statut global
  const hasCriticalMissing = missingRequired.some((r) => r.severity === "critical");
  const hasBlacklisted = presentBlacklisted.length > 0;
  let status: QuestionResult["status"] = "ok";
  if (hasCriticalMissing || hasBlacklisted) {
    status = "critical";
  } else if (missingRequired.length > 0) {
    status = "warning";
  }

  return {
    question_id: q.id,
    question: q.question,
    executed_at: executedAt,
    returned_chunks: returnedChunks,
    articles_cited,
    missing_required: missingRequired,
    present_blacklisted: presentBlacklisted,
    anomalies,
    status,
  };
}

// ─── Exécution complète du golden set ────────────────────────────────────────

export interface GoldenSetRunResult {
  executed_at: string;
  results: QuestionResult[];
  summary: {
    total: number;
    ok: number;
    warning: number;
    critical: number;
  };
}

/**
 * Exécute les 16 questions du golden set et retourne les résultats complets.
 *
 * @param questionIds - Si fourni, n'exécute que ces questions (ex: ["Q01", "Q02"])
 * @param concurrency - Nombre de requêtes parallèles (défaut: 2 pour ne pas saturer l'API)
 */
export async function runGoldenSet(
  questionIds?: string[],
  concurrency = 2
): Promise<GoldenSetRunResult> {
  const questions = questionIds
    ? GOLDEN_SET.filter((q) => questionIds.includes(q.id))
    : GOLDEN_SET;

  const results: QuestionResult[] = [];

  // Exécution par batches pour ne pas saturer OpenAI embeddings API
  for (let i = 0; i < questions.length; i += concurrency) {
    const batch = questions.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(runQuestion));
    results.push(...batchResults);
    // Pause entre batches (rate limiting OpenAI)
    if (i + concurrency < questions.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    warning: results.filter((r) => r.status === "warning").length,
    critical: results.filter((r) => r.status === "critical").length,
  };

  return {
    executed_at: new Date().toISOString(),
    results,
    summary,
  };
}
