import type { PlanName } from "@/lib/pricing";
import type { SubscriptionTier } from "@/lib/stripe/limits";

function priceIds(...keys: (string | undefined)[]): string[] {
  return keys.filter((id): id is string => Boolean(id && id.trim()));
}

/** Tous les Price IDs Stripe connus pour un plan (serveur + client). */
export function stripePriceIdsForPlan(plan: Exclude<PlanName, "free">): string[] {
  switch (plan) {
    case "starter":
      return priceIds(
        process.env.STRIPE_STARTER_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
      );
    case "pro":
      return priceIds(
        process.env.STRIPE_PRO_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
      );
    case "enterprise":
      return priceIds(
        process.env.STRIPE_ENTERPRISE_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
      );
  }
}

export function allConfiguredStripePriceIds(): string[] {
  return [
    ...stripePriceIdsForPlan("starter"),
    ...stripePriceIdsForPlan("pro"),
    ...stripePriceIdsForPlan("enterprise"),
  ];
}

/** Résout un Stripe Price ID → plan applicatif (free si inconnu). */
export function resolvePlanFromStripePriceId(priceId: string): PlanName {
  if (!priceId) return "free";
  for (const plan of ["starter", "pro", "enterprise"] as const) {
    if (stripePriceIdsForPlan(plan).includes(priceId)) return plan;
  }
  return "free";
}

export function mapPriceIdToTier(priceId: string): SubscriptionTier {
  return resolvePlanFromStripePriceId(priceId);
}

export function isAllowedStripePriceId(priceId: string): boolean {
  return allConfiguredStripePriceIds().includes(priceId);
}
