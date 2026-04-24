export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";

export interface TierLimits {
  audits_per_month: number;
  pdf_export: boolean;
  regulatory_alerts: boolean;
  ai_register: boolean;
  chat_messages_per_day: number;
  projects: number;
  blocking_issue_tracker: boolean;
  document_generators: boolean;
  contract_analysis: boolean;
  benchmark: boolean;
  investor_report: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    audits_per_month: 1,
    pdf_export: false,
    regulatory_alerts: false,
    ai_register: false,
    chat_messages_per_day: 10,
    projects: 1,
    blocking_issue_tracker: false,
    document_generators: false,
    contract_analysis: false,
    benchmark: false,
    investor_report: false,
  },
  starter: {
    audits_per_month: 3,
    pdf_export: false,
    regulatory_alerts: false,
    ai_register: true,
    chat_messages_per_day: 50,
    projects: 3,
    blocking_issue_tracker: true,
    document_generators: true,
    contract_analysis: false,
    benchmark: false,
    investor_report: false,
  },
  pro: {
    audits_per_month: Infinity,
    pdf_export: true,
    regulatory_alerts: true,
    ai_register: true,
    chat_messages_per_day: Infinity,
    projects: Infinity,
    blocking_issue_tracker: true,
    document_generators: true,
    contract_analysis: true,
    benchmark: true,
    investor_report: true,
  },
  enterprise: {
    audits_per_month: Infinity,
    pdf_export: true,
    regulatory_alerts: true,
    ai_register: true,
    chat_messages_per_day: Infinity,
    projects: Infinity,
    blocking_issue_tracker: true,
    document_generators: true,
    contract_analysis: true,
    benchmark: true,
    investor_report: true,
  },
};

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.free;
}

export function mapPriceIdToTier(priceId: string): SubscriptionTier {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}
