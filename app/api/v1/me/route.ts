import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveApiKeyUserId } from "@/lib/api/resolve-api-key";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  const userId = await resolveApiKeyUserId(request);
  if (!userId) return NextResponse.json({ error: "Clé API invalide ou expirée" }, { status: 401 });

  const [{ data: profile }, { data: credits }] = await Promise.all([
    admin.from("profiles").select("full_name, company, subscription_tier").eq("id", userId).single(),
    admin.from("user_credits").select("balance, plan, subscription_status").eq("user_id", userId).single(),
  ]);

  return NextResponse.json({
    userId,
    fullName: profile?.full_name,
    company: profile?.company,
    subscriptionTier: profile?.subscription_tier,
    credits: {
      balance: credits?.balance ?? 0,
      plan: credits?.plan ?? "free",
      status: credits?.subscription_status,
    },
  });
}
