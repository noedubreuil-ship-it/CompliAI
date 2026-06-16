import { consumeCredits, type ConsumeError, type ConsumeResult } from "@/lib/credits";
import type { PlanName } from "@/lib/pricing";
import type { ConsultantBillingDepth } from "@/lib/ai/model-routing";
import {
  apiModelToBillingModel,
  getCreditMultiplier,
} from "@/lib/ai/model-routing";
import { consultantMinCreditsForDepth } from "@/lib/ai/consultant-credits";
import type { BillingContext } from "@/lib/ai/billing-context";

export type BillAiCallParams = {
  userId: string;
  plan: PlanName;
  apiModel: string;
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  tool?: string;
  responseDepth?: ConsultantBillingDepth;
};

/**
 * Facture un appel Claude (fire-and-forget côté streaming ; await en sync).
 * Retourne null si aucun token à facturer.
 */
export async function billAiCall(
  params: BillAiCallParams,
): Promise<ConsumeResult | ConsumeError | null> {
  const { inputTokens, outputTokens } = params;
  if (inputTokens <= 0 && outputTokens <= 0) return null;

  const tool = params.tool ?? params.endpoint;
  const billingModel = apiModelToBillingModel(params.apiModel);
  const creditMultiplier = getCreditMultiplier({
    plan: params.plan,
    tool,
    responseDepth: params.responseDepth,
  });
  const minCredits =
    tool === "consultant" &&
    params.endpoint === "consultant" &&
    params.responseDepth
      ? consultantMinCreditsForDepth(params.responseDepth)
      : undefined;

  return consumeCredits({
    userId: params.userId,
    model: billingModel,
    endpoint: params.endpoint,
    inputTokens,
    outputTokens,
    creditMultiplier,
    minCredits,
  });
}

export async function billFromBillingContext(
  ctx: BillingContext,
  apiModel: string,
  inputTokens: number,
  outputTokens: number,
): Promise<ConsumeResult | ConsumeError | null> {
  return billAiCall({
    userId: ctx.userId,
    plan: ctx.plan,
    apiModel,
    endpoint: ctx.endpoint,
    inputTokens,
    outputTokens,
    tool: ctx.tool,
  });
}
