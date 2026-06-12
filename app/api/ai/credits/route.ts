import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { ensureUserCredits, getCreditBalance } from "@/lib/credits";
import { getPlanConfig } from "@/lib/pricing";
import { z } from "zod";

function creditThresholds(monthlyCredits: number) {
  return {
    monthlyCredits,
    lowCreditThreshold: Math.max(10, Math.floor(monthlyCredits * 0.2)),
    criticalCreditThreshold: Math.max(10, Math.floor(monthlyCredits * 0.05)),
  };
}

function warningLevel(
  balance: number,
  low: number,
  critical: number,
): "ok" | "low" | "critical" {
  if (balance <= critical) return "critical";
  if (balance <= low) return "low";
  return "ok";
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let credits = await getCreditBalance(user.id);
  if (!credits) {
    credits = await ensureUserCredits(user.id, "free");
  }
  const plan = credits.plan ?? "free";
  const cfg = getPlanConfig(plan);
  const thresholds = creditThresholds(cfg.monthlyCredits);
  const balance = credits?.balance ?? 0;
  const level = warningLevel(
    balance,
    thresholds.lowCreditThreshold,
    thresholds.criticalCreditThreshold,
  );

  const { data: prefs } = await admin
    .from("user_credits")
    .select("auto_recharge_enabled, auto_recharge_threshold, auto_recharge_pack_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    balance,
    plan,
    subscriptionStatus: credits?.subscriptionStatus ?? null,
    lastResetAt: credits?.lastResetAt ?? null,
    ...thresholds,
    warningLevel: level,
    isLow: level !== "ok",
    autoRecharge: {
      enabled: prefs?.auto_recharge_enabled ?? false,
      threshold: prefs?.auto_recharge_threshold ?? 500,
      packId: prefs?.auto_recharge_pack_id ?? null,
    },
  });
}

const PatchSchema = z.object({
  autoRechargeEnabled: z.boolean().optional(),
  autoRechargeThreshold: z.number().int().min(100).max(5000).optional(),
  autoRechargePackId: z.string().uuid().nullable().optional(),
});

export async function PATCH(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const updates: Record<string, unknown> = {};
  if (parsed.data.autoRechargeEnabled !== undefined) {
    updates.auto_recharge_enabled = parsed.data.autoRechargeEnabled;
  }
  if (parsed.data.autoRechargeThreshold !== undefined) {
    updates.auto_recharge_threshold = parsed.data.autoRechargeThreshold;
  }
  if (parsed.data.autoRechargePackId !== undefined) {
    updates.auto_recharge_pack_id = parsed.data.autoRechargePackId;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const { error } = await admin.from("user_credits").upsert(
    { user_id: user.id, ...updates },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
