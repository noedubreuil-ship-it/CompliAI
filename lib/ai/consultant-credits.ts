import {
  calculateCredits,
  CONSULTANT_CREDITS_TYPICAL,
  CONSULTANT_MIN_CREDITS,
  type AIModel,
  type PlanName,
} from "@/lib/pricing";
import {
  getCreditMultiplier,
  type ConsultantBillingDepth,
} from "@/lib/ai/model-routing";

export { CONSULTANT_CREDITS_TYPICAL, CONSULTANT_MIN_CREDITS };

export function estimateConsultantCredits(
  inputTokens: number,
  outputTokens: number,
  model: AIModel = "sonnet",
  opts?: { plan?: PlanName; depth?: ConsultantBillingDepth }
): number {
  const plan = opts?.plan ?? "starter";
  const depth = opts?.depth ?? "detailed";
  const base = calculateCredits(model, inputTokens, outputTokens);
  const mult = getCreditMultiplier({ plan, tool: "consultant", responseDepth: depth });
  const floor = depth === "brief" ? CONSULTANT_MIN_CREDITS.brief : CONSULTANT_MIN_CREDITS.detailed;
  return Math.max(floor, Math.ceil(base * mult));
}

/** Fourchette affichée dans l’UI chat (ordre de grandeur). */
export function estimateConsultantCreditsRange(
  plan: PlanName,
  depth: ConsultantBillingDepth
): { min: number; typical: number } {
  const model: AIModel = plan === "free" ? "haiku" : "sonnet";
  const input = depth === "brief" ? 7_000 : 13_000;
  const output = depth === "brief" ? 1_200 : 3_800;
  const typical = estimateConsultantCredits(input, output, model, { plan, depth });
  const min = estimateConsultantCredits(4_000, 500, model, { plan, depth });
  return { min, typical };
}

export function consultantMinCreditsForDepth(depth: ConsultantBillingDepth): number {
  return depth === "brief" ? CONSULTANT_MIN_CREDITS.brief : CONSULTANT_MIN_CREDITS.detailed;
}
