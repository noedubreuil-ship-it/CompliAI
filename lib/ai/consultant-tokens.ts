/**
 * Budget max_tokens pour l'outil « consultant ».
 *
 * — **Plans payants** : toujours le plafond configuré (`TOOL_CONFIGS.consultant`, défaut **16384**) ;
 * — **Plan gratuit** : plafond **absolu** par défaut aligné (**16384**), avec budgets adaptatifs
 *   (simple / modéré / complexe) jusqu’à ce plafond ; surcharge `AI_MAX_TOKENS_CONSULTANT_FREE` (.env).
 */

import type { PlanName } from "@/lib/pricing";

function envNum(key: string, fallback: number): number {
  const raw =
    typeof process !== "undefined" && process.env?.[key]
      ? String(process.env[key])
      : "";
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const SIMPLE_LEAD =
  /^(qu'est-ce que|d[eé]finition|c'est quoi|signifie|quel est le sens de)\b/i;
const COMPLEX_HINT =
  /\b(analyse|conformit[eé]|contrat|syst[eè]me|dispositif|puis-je|échéance|echeance|délai|delai|obligations?|calendrier|à quelle date|a quelle date)\b/i;

export type ConsultantQuestionComplexity = "simple" | "moderate" | "complex";

export function classifyConsultantQuestion(question: string): ConsultantQuestionComplexity {
  const q = question.trim();
  if (q.length < 100 && SIMPLE_LEAD.test(q)) return "simple";
  if (q.length > 300 || COMPLEX_HINT.test(q)) return "complex";
  return "moderate";
}

function adaptiveWishForFree(
  complexity: ConsultantQuestionComplexity,
  paidCeiling: number
): number {
  const simple = envNum("AI_CONSULTANT_TOKENS_SIMPLE", 1600);
  /** Réponses développées (Type A…) sans couper analyses nationales ni tableaux (plafonné par freeCap). */
  const moderate = envNum("AI_CONSULTANT_TOKENS_MODERATE", 8192);

  switch (complexity) {
    case "simple":
      return simple;
    case "moderate":
      return moderate;
    default:
      return Math.min(
        envNum("AI_CONSULTANT_TOKENS_COMPLEX", paidCeiling),
        paidCeiling
      );
  }
}

/**
 * `max_tokens` output pour `/api/chat` (consultant).
 */
export function resolveConsultantOutputMaxTokens(
  question: string,
  plan: PlanName | undefined | null,
  consultantCeiling: number
): number {
  const tier = plan === undefined || plan === null ? ("starter" as PlanName) : plan;
  const paidCap = Math.max(consultantCeiling, 0);
  const freeCap = envNum("AI_MAX_TOKENS_CONSULTANT_FREE", 16384);

  if (tier === "free") {
    const wish = adaptiveWishForFree(classifyConsultantQuestion(question), paidCap);
    return Math.max(4096, Math.floor(Math.min(wish, freeCap)));
  }

  return Math.max(4096, Math.floor(paidCap));
}

/**
 * Plafond sortie lorsque l’utilisateur choisit **Synthèse courte** (`response_depth=brief`).
 * Variable : `AI_MAX_TOKENS_CONSULTANT_BRIEF`.
 */
export function resolveConsultantBriefOutputMaxTokens(): number {
  const raw = Number(process.env.AI_MAX_TOKENS_CONSULTANT_BRIEF);
  const cap = Number.isFinite(raw) && raw >= 256 ? raw : 2048;
  return Math.max(256, Math.floor(cap));
}
