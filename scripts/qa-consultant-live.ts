/**
 * qa-consultant-live.ts — Vérification EN CONTINU du syllogisme juridique du chat.
 *
 * Contrairement aux tests hermétiques (qui scorent des fixtures), cet outil
 * GÉNÈRE de vraies réponses par le chemin réel du chat (RAG hybride → contexte →
 * callClaude consultant) et vérifie :
 *   - les scorers thématiques de régression (pas d'hallucination, qualification
 *     prudente, différenciation des branches…) ;
 *   - la structure syllogistique transverse (conclusion d'abord, qualification du
 *     régime, subsomption, base textuelle, registre).
 *
 * Opt-in et facturé (appels Sonnet) — à lancer avant un déploiement important :
 *   npx tsx --env-file=.env.local scripts/qa-consultant-live.ts
 *   npx tsx --env-file=.env.local scripts/qa-consultant-live.ts --json
 *
 * Code de sortie : 0 si toutes les réponses passent, 1 sinon (gate déploiement).
 */
import Module from "module";

// Neutralise le guard `server-only` (la pile de prompts consultant l'importe).
const origLoad = (Module as unknown as { _load: (...a: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...a: unknown[]) => unknown })._load = function (
  this: unknown,
  request: string,
  ...rest: unknown[]
) {
  if (request === "server-only") return {};
  return origLoad.call(this, request, ...rest);
};

const JSON_OUT = process.argv.includes("--json");
const SHOW = process.argv.includes("--show");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1]?.toUpperCase();

interface Row {
  id: string;
  rag: number;
  outTokens: number;
  thematicFailures: string[];
  syllogismFailures: string[];
  pass: boolean;
}

async function main() {
  const { searchLegalChunksHybridChat, buildLegalContext } = await import("../lib/ai/rag");
  const { callClaude } = await import("../lib/ai/client");
  const { CONSULTANT_TRAP_QUESTIONS, scoreSyllogismStructure } = await import(
    "../lib/ai/consultant-answer-scoring"
  );

  const rows: Row[] = [];

  const questions = ONLY
    ? CONSULTANT_TRAP_QUESTIONS.filter((q) => q.id === ONLY)
    : CONSULTANT_TRAP_QUESTIONS;

  for (const q of questions) {
    let chunks: Awaited<ReturnType<typeof searchLegalChunksHybridChat>> = [];
    try {
      chunks = await searchLegalChunksHybridChat(q.question, 12, 0.2);
    } catch (e) {
      console.error(`[${q.id}] RAG error: ${(e as Error).message}`);
    }
    const context = buildLegalContext(chunks);
    const res = await callClaude({
      tool: "consultant",
      userMessage: q.question,
      context: context || undefined,
      consultantCreditsPlan: "pro",
      consultantResponseDepth: "detailed",
    });

    const thematic = q.scorer(res.text);
    const syllogism = scoreSyllogismStructure(res.text);
    const pass = thematic.pass && syllogism.pass;
    rows.push({
      id: q.id,
      rag: chunks.length,
      outTokens: res.outputTokens,
      thematicFailures: thematic.failures,
      syllogismFailures: syllogism.failures,
      pass,
    });

    if (!JSON_OUT) {
      console.log("\n" + "─".repeat(72));
      console.log(`${pass ? "✅" : "❌"}  ${q.id}  — RAG ${chunks.length} extraits, ${res.outputTokens} tokens`);
      if (thematic.failures.length) console.log(`   thématique : ${thematic.failures.join(", ")}`);
      if (syllogism.failures.length) console.log(`   syllogisme : ${syllogism.failures.join(", ")}`);
      if (pass) console.log("   syllogisme + fond : conformes");
      if (SHOW) console.log(`   ┌ début réponse ─\n   │ ${res.text.slice(0, 400).replace(/\n/g, "\n   │ ")}\n   └─`);
    }
  }

  const failed = rows.filter((r) => !r.pass);

  if (JSON_OUT) {
    console.log(JSON.stringify({ total: rows.length, failed: failed.length, rows }, null, 2));
  } else {
    console.log("\n" + "═".repeat(72));
    console.log(`BILAN : ${rows.length - failed.length}/${rows.length} réponses conformes.`);
    if (failed.length) console.log(`Échecs : ${failed.map((r) => r.id).join(", ")}`);
  }

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("ERR", e);
  process.exitCode = 1;
});
