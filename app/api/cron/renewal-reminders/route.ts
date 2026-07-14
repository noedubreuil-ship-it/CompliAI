/**
 * Cron — rappels de renouvellement d'abonnement (J-7 / J-1)
 * Déclenché quotidiennement. Prévient les abonnés actifs (non résiliés) dont
 * l'abonnement se reconduit dans 7 ou 1 jour.
 *
 * Pour activer la planification, ajouter dans vercel.json :
 *   { "path": "/api/cron/renewal-reminders", "schedule": "0 10 * * *" }
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe/client";
import { sendRenewalReminder } from "@/lib/email";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Jours entiers avant l'échéance (arrondi au plus proche). */
function daysUntil(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / DAY_MS);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Abonnements actifs, non résiliés, échéance dans les 8 prochains jours.
  const horizon = new Date(Date.now() + 8 * DAY_MS).toISOString();
  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, stripe_price_id, current_period_end")
    .eq("status", "active")
    .eq("cancel_at_period_end", false)
    .not("current_period_end", "is", null)
    .lte("current_period_end", horizon);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const since3d = new Date(Date.now() - 3 * DAY_MS).toISOString();
  let sent = 0;
  const errors: string[] = [];

  for (const row of subs) {
    try {
      const periodEnd = new Date(row.current_period_end as string);
      const d = daysUntil(periodEnd);
      const daysBefore: 7 | 1 | null = d === 7 ? 7 : d === 1 ? 1 : null;
      if (!daysBefore) continue;

      const emailType = `renewal_reminder_${daysBefore}`;

      // Anti-doublon : pas déjà envoyé dans les 3 derniers jours pour ce palier.
      const { count } = await admin
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", row.user_id)
        .eq("email_type", emailType)
        .gte("sent_at", since3d);
      if ((count ?? 0) > 0) continue;

      // Préférence notifications + nom
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, email_notifications")
        .eq("id", row.user_id)
        .single();
      if (profile?.email_notifications === false) continue;

      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
      const email = authUser?.user?.email;
      if (!email) continue;

      // Montant réel depuis Stripe (fallback 4900 = 49 €).
      let amountCents = 4900;
      if (row.stripe_price_id) {
        try {
          const price = await stripe.prices.retrieve(row.stripe_price_id);
          if (typeof price.unit_amount === "number") amountCents = price.unit_amount;
        } catch { /* fallback conservé */ }
      }

      await sendRenewalReminder({
        email,
        userName: profile?.full_name ?? undefined,
        daysBefore,
        renewalDate: periodEnd,
        amountCents,
        locale: authUser?.user?.user_metadata?.locale as string | undefined,
      });

      await admin.from("email_log").insert({
        user_id: row.user_id,
        email_type: emailType,
        metadata: { renewalDate: periodEnd.toISOString() },
      });

      sent++;
    } catch (err) {
      errors.push(`${row.user_id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
