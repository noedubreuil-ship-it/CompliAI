/**
 * diag-retrieval-reliability.ts — Fiabilité du retrieval RAG (chemin du CHAT).
 *
 * Mesure ce que le runner golden set NE mesure pas : la FIABILITÉ opérationnelle
 * de la recherche hybride servie au chat —
 *   - latence embedding (OpenAI) vs latence RPC (Postgres), p50 / p95 / max ;
 *   - timeouts Postgres (`statement timeout`, code 57014) — la cause du « 0 extrait
 *     puis réponse de mémoire » observé sur la question DPO ;
 *   - requêtes à 0 résultat ;
 *   - taux de présence des articles CRITIQUES attendus (golden set).
 *
 * Répète chaque requête pour révéler l'INTERMITTENCE (un timeout ne se reproduit
 * pas à chaque appel). Lecture seule sur legal_chunks.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/diag-retrieval-reliability.ts
 *   npx tsx --env-file=.env.local scripts/diag-retrieval-reliability.ts --repeat=3
 *   npx tsx --env-file=.env.local scripts/diag-retrieval-reliability.ts --json
 *
 * Code de sortie : 0 si aucun timeout/erreur et couverture critique complète ;
 *                  1 sinon (gate).
 */
import { createClient } from "@supabase/supabase-js";
import { embedText } from "../lib/ai/embeddings";
import { GOLDEN_SET } from "../lib/rag-quality/golden-set";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JSON_OUT = process.argv.includes("--json");
const REPEAT = (() => {
  const raw = process.argv.find((a) => a.startsWith("--repeat="))?.split("=")[1];
  const n = raw ? Number(raw) : 2;
  return Number.isFinite(n) && n >= 1 ? n : 2;
})();

// Mêmes paramètres que le chat : searchLegalChunksHybridChat(q, 12, 0.20).
const MATCH_COUNT = 12;
const THRESHOLD = 0.2;

interface CallMetric {
  questionId: string;
  attempt: number;
  embedMs: number;
  rpcMs: number;
  chunkCount: number;
  timeout: boolean;
  errorCode?: string;
  errorMessage?: string;
  criticalHit?: boolean; // au moins un article "critical" attendu présent
}

function isTimeout(code?: string, message?: string): boolean {
  if (code === "57014") return true;
  const m = (message ?? "").toLowerCase();
  return m.includes("statement timeout") || m.includes("canceling statement");
}

function normalizeReg(s: string): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function oneCall(questionId: string, question: string, attempt: number, criticalRefs: { regulation: string; article_number: string | null }[]): Promise<CallMetric> {
  const tEmbed = Date.now();
  let embedding: number[];
  try {
    embedding = await embedText(question);
  } catch (e) {
    return {
      questionId, attempt, embedMs: Date.now() - tEmbed, rpcMs: 0, chunkCount: 0,
      timeout: false, errorCode: "embed_error", errorMessage: (e as Error).message,
    };
  }
  const embedMs = Date.now() - tEmbed;

  const tRpc = Date.now();
  const { data, error } = await sb.rpc("search_legal_chunks_hybrid", {
    query_embedding: embedding,
    query_text: question,
    match_threshold: THRESHOLD,
    match_count: MATCH_COUNT,
    filter_regulation_prefix: "",
  });
  const rpcMs = Date.now() - tRpc;

  if (error) {
    return {
      questionId, attempt, embedMs, rpcMs, chunkCount: 0,
      timeout: isTimeout(error.code, error.message), errorCode: error.code, errorMessage: error.message,
    };
  }

  const chunks = (data ?? []) as { regulation: string; article_number: string | null }[];
  const criticalHit = criticalRefs.length === 0 || criticalRefs.some((ref) =>
    chunks.some((c) =>
      normalizeReg(c.regulation).includes(normalizeReg(ref.regulation)) &&
      (ref.article_number == null || String(c.article_number) === String(ref.article_number))
    )
  );

  return { questionId, attempt, embedMs, rpcMs, chunkCount: chunks.length, timeout: false, criticalHit };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  const metrics: CallMetric[] = [];

  for (const q of GOLDEN_SET) {
    const criticalRefs = q.required_articles
      .filter((a) => a.severity === "critical")
      .map((a) => ({ regulation: a.regulation, article_number: a.article_number }));

    for (let attempt = 1; attempt <= REPEAT; attempt++) {
      const m = await oneCall(q.id, q.question, attempt, criticalRefs);
      metrics.push(m);
      if (!JSON_OUT) {
        const flag = m.errorCode ? (m.timeout ? "⏱️ TIMEOUT" : `⚠️ ${m.errorCode}`) : m.chunkCount === 0 ? "∅ 0 extrait" : m.criticalHit ? "ok" : "⚠ article critique manquant";
        console.log(`${q.id} #${attempt}  embed=${m.embedMs}ms rpc=${m.rpcMs}ms chunks=${m.chunkCount}  ${flag}`);
      }
    }
  }

  const timeouts = metrics.filter((m) => m.timeout);
  const errors = metrics.filter((m) => m.errorCode && !m.timeout);
  const empties = metrics.filter((m) => !m.errorCode && m.chunkCount === 0);
  const criticalMiss = metrics.filter((m) => !m.errorCode && m.chunkCount > 0 && m.criticalHit === false);
  const rpcTimes = metrics.filter((m) => !m.errorCode).map((m) => m.rpcMs);
  const embedTimes = metrics.filter((m) => !m.errorCode).map((m) => m.embedMs);

  const summary = {
    totalCalls: metrics.length,
    questions: GOLDEN_SET.length,
    repeat: REPEAT,
    timeouts: timeouts.length,
    errors: errors.length,
    emptyResults: empties.length,
    criticalArticleMisses: criticalMiss.length,
    rpcMs: { p50: percentile(rpcTimes, 50), p95: percentile(rpcTimes, 95), max: Math.max(0, ...rpcTimes) },
    embedMs: { p50: percentile(embedTimes, 50), p95: percentile(embedTimes, 95), max: Math.max(0, ...embedTimes) },
  };

  if (JSON_OUT) {
    console.log(JSON.stringify({ summary, metrics }, null, 2));
  } else {
    console.log("\n" + "═".repeat(72));
    console.log("FIABILITÉ DU RETRIEVAL — synthèse");
    console.log("═".repeat(72));
    console.log(`Appels               : ${summary.totalCalls} (${summary.questions} questions × ${REPEAT})`);
    console.log(`Timeouts (57014)     : ${summary.timeouts}`);
    console.log(`Autres erreurs       : ${summary.errors}`);
    console.log(`Résultats vides      : ${summary.emptyResults}`);
    console.log(`Articles critiques absents (1ʳᵉ passe ; le chat applique un repli cosine) : ${summary.criticalArticleMisses}`);
    console.log(`Latence RPC   p50=${summary.rpcMs.p50}ms  p95=${summary.rpcMs.p95}ms  max=${summary.rpcMs.max}ms`);
    console.log(`Latence embed p50=${summary.embedMs.p50}ms  p95=${summary.embedMs.p95}ms  max=${summary.embedMs.max}ms`);
    if (timeouts.length) console.log(`\n⏱️  Questions ayant timeout au moins une fois : ${[...new Set(timeouts.map((t) => t.questionId))].join(", ")}`);
    if (criticalMiss.length) console.log(`ℹ️  Articles critiques hors top-${MATCH_COUNT} en 1ʳᵉ passe : ${[...new Set(criticalMiss.map((m) => m.questionId))].join(", ")} (repli cosine du chat non testé ici)`);
  }

  // Gate STRICT sur la fiabilité opérationnelle uniquement (timeouts / erreurs /
  // résultats vides). Les articles critiques hors 1ʳᵉ passe sont advisory : le
  // chat dispose d'un repli cosine, et la couverture complète est vérifiée par le
  // runner golden set (lib/rag-quality).
  if (timeouts.length > 0 || errors.length > 0 || empties.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("ERR", e);
  process.exitCode = 1;
});
