/**
 * Grille de crédits centralisée.
 * Ajustez uniquement ce fichier pour changer les tarifs IA ou les allocations de plans.
 */

// ─── Modèles supportés ────────────────────────────────────────────────────────
export type AIModel = "haiku" | "sonnet" | "opus";

export interface ModelConfig {
  /** Identifiant exact pour l'API Anthropic */
  apiId: string;
  /** Crédits consommés par tranche de 1 000 tokens input */
  creditsPerKInputToken: number;
  /** Crédits consommés par tranche de 1 000 tokens output */
  creditsPerKOutputToken: number;
  /** Nombre max de tokens output autorisé */
  maxOutputTokens: number;
}

/**
 * Ratios calibrés pour que 5 000 crédits ≈ ~500 messages haiku courts (plan Starter).
 * Haiku : ~0.5 cr / 1K input, ~2.5 cr / 1K output
 * Sonnet : ~2 cr / 1K input, ~10 cr / 1K output
 */
export const MODEL_CONFIG: Record<AIModel, ModelConfig> = {
  haiku: {
    apiId: "claude-haiku-4-5-20251001",
    creditsPerKInputToken: 0.5,
    creditsPerKOutputToken: 2.5,
    maxOutputTokens: 4096,
  },
  sonnet: {
    apiId: "claude-sonnet-4-5",
    creditsPerKInputToken: 2,
    creditsPerKOutputToken: 10,
    maxOutputTokens: 8192,
  },
  opus: {
    apiId: "claude-opus-4-5",
    creditsPerKInputToken: 10,
    creditsPerKOutputToken: 50,
    maxOutputTokens: 4096,
  },
};

/**
 * Calcule les crédits à consommer pour un appel.
 * On arrondit toujours au supérieur (ceil) pour ne jamais sous-facturer.
 */
export function calculateCredits(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  const cfg = MODEL_CONFIG[model];
  const inputCredits = Math.ceil((inputTokens / 1000) * cfg.creditsPerKInputToken);
  const outputCredits = Math.ceil((outputTokens / 1000) * cfg.creditsPerKOutputToken);
  return Math.max(1, inputCredits + outputCredits); // minimum 1 crédit par appel
}

// ─── Plans & allocations mensuelles ──────────────────────────────────────────
export type PlanName = "free" | "starter" | "pro" | "enterprise";

export interface PlanConfig {
  /** Crédits alloués à chaque début de période de facturation */
  monthlyCredits: number;
  /** Seuil d'alerte bas (pour UI) */
  lowCreditThreshold: number;
  /** Seuil de blocage — refus si balance < ce seuil avant l'appel */
  minBalanceToCall: number;
  /** Requêtes IA max par minute */
  rateLimit: number;
}

export const PLAN_CONFIG: Record<PlanName, PlanConfig> = {
  free: {
    monthlyCredits: 400,
    lowCreditThreshold: 80,
    minBalanceToCall: 10,
    rateLimit: 10,
  },
  starter: {
    monthlyCredits: 4_500,
    lowCreditThreshold: 900,
    minBalanceToCall: 10,
    rateLimit: 20,
  },
  pro: {
    monthlyCredits: 18_000,
    lowCreditThreshold: 3_600,
    minBalanceToCall: 10,
    rateLimit: 30,
  },
  enterprise: {
    monthlyCredits: 60_000,
    lowCreditThreshold: 12_000,
    minBalanceToCall: 10,
    rateLimit: 60,
  },
};

/** Retourne le plan depuis un Stripe Price ID (serveur ou NEXT_PUBLIC). */
export { resolvePlanFromStripePriceId as getPlanFromPriceId } from "@/lib/stripe/plan-mapping";

/** Retourne le PlanConfig depuis le nom du plan */
export function getPlanConfig(plan: PlanName): PlanConfig {
  return PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;
}
