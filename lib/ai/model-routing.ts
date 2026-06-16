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

/** Multiplicateur crédits consultant (même appel API, plus de crédits facturés). */
export const CONSULTANT_CREDIT_MULTIPLIER = 1.25;

/** Note développée : facturation crédits plus élevée que la synthèse courte. */
export const CONSULTANT_DETAILED_CREDIT_MULTIPLIER = 1.6;

export type ConsultantBillingDepth = "brief" | "detailed";

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

export function getCreditMultiplier(opts: {
  plan: PlanName;
  tool: string;
  responseDepth?: ConsultantBillingDepth;
}): number {
  const useOpus =
    (opts.plan === "pro" || opts.plan === "enterprise") &&
    OPUS_PREMIUM_TOOLS.has(opts.tool);

  let mult = useOpus ? OPUS_CREDIT_MULTIPLIER : 1;

  if (opts.tool === "consultant") {
    mult *= CONSULTANT_CREDIT_MULTIPLIER;
    if (opts.responseDepth !== "brief") {
      mult *= CONSULTANT_DETAILED_CREDIT_MULTIPLIER;
    }
  }

  return mult;
}
