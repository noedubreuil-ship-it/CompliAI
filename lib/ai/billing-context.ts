import type { PlanName } from "@/lib/pricing";

/** Contexte serveur pour facturer un appel Claude. */
export interface BillingContext {
  userId: string;
  plan: PlanName;
  /** Identifiant route ou outil (ex. `consultant`, `comparateur`). */
  endpoint: string;
  /** Clé outil pour routage modèle ; défaut = `endpoint`. */
  tool?: string;
}

export function makeBillingContext(
  userId: string,
  plan: PlanName,
  endpoint: string,
  tool?: string,
): BillingContext {
  return { userId, plan, endpoint, tool: tool ?? endpoint };
}
