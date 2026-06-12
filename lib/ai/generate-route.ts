/**
 * Handler commun pour POST /api/generate/* — auth, rate limit, preflight crédits, erreurs uniformes.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";
import { getCreditBalance, preflightCheck } from "@/lib/credits";
import type { PlanName } from "@/lib/pricing";
import type { User } from "@supabase/supabase-js";
import { aiUnauthorized, preflightToResponse, catchGenerateRouteError } from "@/lib/ai/http-errors";
import { assertProSubscription } from "@/lib/subscription/pro-access";
import { makeBillingContext } from "@/lib/ai/billing-context";
import type { BillingContext } from "@/lib/ai/billing-context";

export interface GenerateRouteContext {
  userId: string;
  plan: PlanName;
  body: Record<string, unknown>;
  billing: (endpoint: string, tool?: string) => BillingContext;
}

export { makeBillingContext };

/** Auth + rate limit + crédits pour routes /api/generate/* hors `runGenerateRoute`. */
export async function authenticateForGenerate(options?: {
  requirePro?: boolean;
}): Promise<
  | { ok: true; user: User; userId: string; plan: PlanName; billing: (endpoint: string, tool?: string) => BillingContext }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: aiUnauthorized() };

  if (options?.requirePro) {
    const proBlock = await assertProSubscription(supabase, user.id);
    if (proBlock) return { ok: false, response: proBlock };
  }

  const limited = await rateLimitUser(user.id, "legal-tools", RATE_LIMITS.generate);
  if (limited) return { ok: false, response: limited as NextResponse };

  const credits = await getCreditBalance(user.id);
  const plan: PlanName = credits?.plan ?? "free";
  const preflight = await preflightCheck(user.id, plan);
  if (preflight) {
    const blocked = preflightToResponse(preflight);
    if (blocked) return { ok: false, response: blocked };
  }

  const billing = (endpoint: string, tool?: string) =>
    makeBillingContext(user.id, plan, endpoint, tool);
  return { ok: true, user, userId: user.id, plan, billing };
}

export async function runGenerateRoute(
  request: Request,
  handler: (ctx: GenerateRouteContext) => Promise<unknown>,
  options?: { body?: Record<string, unknown>; requirePro?: boolean },
): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return aiUnauthorized();

  if (options?.requirePro) {
    const proBlock = await assertProSubscription(supabase, user.id);
    if (proBlock) return proBlock;
  }

  const limited = await rateLimitUser(user.id, "legal-tools", RATE_LIMITS.generate);
  if (limited) return limited as NextResponse;

  const credits = await getCreditBalance(user.id);
  const plan: PlanName = credits?.plan ?? "free";
  const preflight = await preflightCheck(user.id, plan);
  if (preflight) {
    const blocked = preflightToResponse(preflight);
    if (blocked) return blocked;
  }

  const body =
    options?.body ?? ((await request.json().catch(() => ({}))) as Record<string, unknown>);

  try {
    const billing = (endpoint: string, tool?: string) =>
      makeBillingContext(user.id, plan, endpoint, tool);
    const result = await handler({ userId: user.id, plan, body, billing });
    return NextResponse.json({ result });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
