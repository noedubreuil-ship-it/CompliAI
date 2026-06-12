/**
 * Routage modèle Claude par plan et outil — protège la marge tout en gardant
 * une qualité perçue suffisante (Sonnet pour payants, Haiku pour free).
 */
import type { PlanName } from "@/lib/pricing";
import { MODEL_CONFIG, type AIModel } from "@/lib/pricing";

/** Outils Pro où Opus est autorisé (coût × multiplicateur crédits). */
export const OPUS_PREMIUM_TOOLS = new Set([
  "audit",
  "investor-report",
  "jurisprudence",
]);

export const OPUS_CREDIT_MULTIPLIER = 2;

export function apiModelToBillingModel(apiModel: string): AIModel {
  const m = apiModel.toLowerCase();
  if (m.includes("haiku")) return "haiku";
  if (m.includes("opus")) return "opus";
  if (m.includes("sonnet")) return "sonnet";
  return "sonnet";
}

export function resolveModelApiId(opts: {
  plan: PlanName;
  tool: string;
}): string {
  const tool = opts.tool;
  const plan = opts.plan;

  const useOpus =
    (plan === "pro" || plan === "enterprise") && OPUS_PREMIUM_TOOLS.has(tool);

  if (useOpus) return MODEL_CONFIG.opus.apiId;
  if (plan === "free") return MODEL_CONFIG.haiku.apiId;
  return MODEL_CONFIG.sonnet.apiId;
}

export function getCreditMultiplier(opts: { plan: PlanName; tool: string }): number {
  const useOpus =
    (opts.plan === "pro" || opts.plan === "enterprise") &&
    OPUS_PREMIUM_TOOLS.has(opts.tool);
  return useOpus ? OPUS_CREDIT_MULTIPLIER : 1;
}
