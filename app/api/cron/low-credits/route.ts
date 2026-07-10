/**
 * Cron — alerte crédits bas
 * Déclenché quotidiennement. Scanne tous les utilisateurs dont le solde
 * est sous le seuil d'alerte et envoie un email si pas déjà envoyé dans les 24h.
 *
 * Configurer dans vercel.json :
 *   { "path": "/api/cron/low-credits", "schedule": "0 9 * * *" }
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendLowCreditsAlert } from "@/lib/email";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LOW_THRESHOLD = 500;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Utilisateurs sous le seuil, abonnés actifs
  const { data: users } = await admin
    .from("user_credits")
    .select("user_id, balance, plan")
    .lte("balance", LOW_THRESHOLD)
    .eq("subscription_status", "active");

  if (!users?.length) return NextResponse.json({ sent: 0 });

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let sent = 0;
  const errors: string[] = [];

  for (const row of users) {
    try {
      // Vérifie cooldown 24h (via email_log — credit_transactions.type est
      // contraint aux types financiers, un marqueur y échouerait).
      const { count } = await admin
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", row.user_id)
        .eq("email_type", "low_credits_alert")
        .gte("sent_at", since24h);

      if ((count ?? 0) > 0) continue;

      // Vérifie notifications activées
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, email_notifications")
        .eq("id", row.user_id)
        .single();

      if (profile?.email_notifications === false) continue;

      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
      const email = authUser?.user?.email;
      if (!email) continue;

      await sendLowCreditsAlert({
        email,
        userName: profile?.full_name ?? undefined,
        balance: row.balance,
        plan: row.plan ?? "free",
        threshold: LOW_THRESHOLD,
      });

      await admin.from("email_log").insert({
        user_id: row.user_id,
        email_type: "low_credits_alert",
        metadata: { threshold: LOW_THRESHOLD, balance: row.balance },
      });

      sent++;
    } catch (err) {
      errors.push(`${row.user_id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
