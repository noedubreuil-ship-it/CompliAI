import { createClient } from "@supabase/supabase-js";
import type { PlanName } from "@/lib/pricing";
import { PLAN_CONFIG } from "@/lib/pricing";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** Coût API estimé par crédit consommé (€) — Sonnet + embeddings, ordre de grandeur. */
const ESTIMATED_EUR_PER_CREDIT = 0.01;

export interface PlanUsageMetrics {
  plan: PlanName;
  userCount: number;
  avgCredits30d: number;
  p95Credits30d: number;
  totalCredits30d: number;
}

export interface CreditMetricsSummary {
  periodDays: number;
  byPlan: PlanUsageMetrics[];
  packConversionRate: number;
  payingUsers: number;
  packBuyers30d: number;
  estimatedGrossMarginPct: number;
  estimatedApiCostEur30d: number;
  estimatedSubscriptionRevenueEur30d: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

const PLAN_MRR_EUR: Record<PlanName, number> = {
  free: 0,
  starter: 49,
  pro: 199,
  enterprise: 799,
};

export async function getCreditMetrics30d(): Promise<CreditMetricsSummary> {
  const admin = getAdmin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: usageRows } = await admin
    .from("ai_usage_logs")
    .select("user_id, credits_consumed, created_at")
    .gte("created_at", since);

  const { data: creditRows } = await admin
    .from("user_credits")
    .select("user_id, plan");

  const planByUser = new Map<string, PlanName>();
  for (const row of creditRows ?? []) {
    planByUser.set(row.user_id, (row.plan ?? "free") as PlanName);
  }

  const usageByUser = new Map<string, number>();
  for (const row of usageRows ?? []) {
    const prev = usageByUser.get(row.user_id) ?? 0;
    usageByUser.set(row.user_id, prev + (row.credits_consumed ?? 0));
  }

  const byPlanMap = new Map<PlanName, number[]>();
  for (const [userId, total] of usageByUser) {
    const plan = planByUser.get(userId) ?? "free";
    const arr = byPlanMap.get(plan) ?? [];
    arr.push(total);
    byPlanMap.set(plan, arr);
  }

  const plans: PlanName[] = ["free", "starter", "pro", "enterprise"];
  const byPlan: PlanUsageMetrics[] = plans.map((plan) => {
    const totals = (byPlanMap.get(plan) ?? []).sort((a, b) => a - b);
    const userCount = totals.length;
    const totalCredits30d = totals.reduce((s, v) => s + v, 0);
    return {
      plan,
      userCount,
      avgCredits30d: userCount ? Math.round(totalCredits30d / userCount) : 0,
      p95Credits30d: percentile(totals, 95),
      totalCredits30d,
    };
  });

  const payingUsers = (creditRows ?? []).filter(
    (r) => r.plan && r.plan !== "free",
  ).length;

  const { count: packBuyers30d } = await admin
    .from("credit_pack_purchases")
    .select("user_id", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("created_at", since);

  const packConversionRate =
    payingUsers > 0 ? Math.round(((packBuyers30d ?? 0) / payingUsers) * 1000) / 10 : 0;

  const totalCredits = (usageRows ?? []).reduce(
    (s, r) => s + (r.credits_consumed ?? 0),
    0,
  );
  const estimatedApiCostEur30d = Math.round(totalCredits * ESTIMATED_EUR_PER_CREDIT * 100) / 100;

  let estimatedSubscriptionRevenueEur30d = 0;
  for (const row of creditRows ?? []) {
    const plan = (row.plan ?? "free") as PlanName;
    estimatedSubscriptionRevenueEur30d += PLAN_MRR_EUR[plan] ?? 0;
  }

  const estimatedGrossMarginPct =
    estimatedSubscriptionRevenueEur30d > 0
      ? Math.round(
          ((estimatedSubscriptionRevenueEur30d - estimatedApiCostEur30d) /
            estimatedSubscriptionRevenueEur30d) *
            1000,
        ) / 10
      : 0;

  return {
    periodDays: 30,
    byPlan,
    packConversionRate,
    payingUsers,
    packBuyers30d: packBuyers30d ?? 0,
    estimatedGrossMarginPct,
    estimatedApiCostEur30d,
    estimatedSubscriptionRevenueEur30d,
  };
}

/** Allocation mensuelle (pour affichage admin). */
export function getPlanMonthlyCredits(plan: PlanName): number {
  return PLAN_CONFIG[plan]?.monthlyCredits ?? 0;
}
