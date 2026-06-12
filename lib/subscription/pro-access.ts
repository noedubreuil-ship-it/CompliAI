import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type SubscriptionTier = "free" | "pro" | "enterprise" | string;

export function isProOrEnterpriseTier(tier: string | null | undefined): boolean {
  const t = (tier ?? "free").toLowerCase();
  return t === "pro" || t === "enterprise";
}

export async function getUserSubscriptionTier(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionTier> {
  const { data } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .maybeSingle();
  return (data?.subscription_tier as SubscriptionTier) ?? "free";
}

/** Retourne une réponse 403 si l'utilisateur n'est pas Pro/Enterprise ; sinon `null`. */
export async function assertProSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const tier = await getUserSubscriptionTier(supabase, userId);
  if (isProOrEnterpriseTier(tier)) return null;
  return NextResponse.json(
    {
      error: "Abonnement Pro requis pour cet outil.",
      code: "pro_required",
      upgrade_url: "/dashboard/upgrade",
    },
    { status: 403 }
  );
}
