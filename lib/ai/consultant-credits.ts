import { calculateCredits, CONSULTANT_CREDITS_TYPICAL, type AIModel } from "@/lib/pricing";

export { CONSULTANT_CREDITS_TYPICAL };

export function estimateConsultantCredits(
  inputTokens: number,
  outputTokens: number,
  model: AIModel = "sonnet"
): number {
  return calculateCredits(model, inputTokens, outputTokens);
}
