/**
 * Cron — réengagement inactivité (J+14 / J+30)
 * Déclenché quotidiennement. Relance les utilisateurs dont la dernière
 * interaction IA remonte à ~14 ou ~30 jours et qui ne sont pas revenus depuis.
 *
 * Pour activer la planification, ajouter dans vercel.json :
 *   { "path": "/api/cron/reengagement", "schedule": "0 11 * * *" }
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReengagement } from "@/lib/email";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DAY_MS = 24 * 60 * 60 * 1000;

/** user_ids distincts ayant une interaction dans [fromDaysAgo, toDaysAgo]. */
async function usersActiveBetween(fromDaysAgo: number, toDaysAgo: number): Promise<Set<string>> {
  const from = new Date(Date.now() - fromDaysAgo * DAY_MS).toISOString();
  const to = new Date(Date.now() - toDaysAgo * DAY_MS).toISOString();
  const { data } = await admin
    .from("ai_interaction_logs")
    .select("user_id")
    .gte("created_at", from)
    .lt("created_at", to)
    .not("user_id", "is", null);
  return new Set((data ?? []).map((r) => r.user_id as string));
}

/** user_ids distincts ayant une interaction depuis `sinceDaysAgo` jours. */
async function usersActiveSince(sinceDaysAgo: number): Promise<Set<string>> {
  const since = new Date(Date.now() - sinceDaysAgo * DAY_MS).toISOString();
  const { data } = await admin
    .from("ai_interaction_logs")
    .select("user_id")
    .gte("created_at", since)
    .not("user_id", "is", null);
  return new Set((data ?? []).map((r) => r.user_id as string));
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dernière activité ~14 j (fenêtre 14–16 j) et rien depuis 14 j → bucket J+14.
  const active14to16 = await usersActiveBetween(16, 14);
  const activeLast14 = await usersActiveSince(14);
  const bucket14 = [...active14to16].filter((u) => !activeLast14.has(u));

  // Dernière activité ~30 j (fenêtre 30–32 j) et rien depuis 30 j → bucket J+30.
  const active30to32 = await usersActiveBetween(32, 30);
  const activeLast30 = await usersActiveSince(30);
  const bucket30 = [...active30to32].filter((u) => !activeLast30.has(u));

  const targets: Array<{ userId: string; days: 14 | 30 }> = [
    ...bucket14.map((userId) => ({ userId, days: 14 as const })),
    ...bucket30.map((userId) => ({ userId, days: 30 as const })),
  ];

  if (!targets.length) return NextResponse.json({ sent: 0 });

  const since60d = new Date(Date.now() - 60 * DAY_MS).toISOString();
  let sent = 0;
  const errors: string[] = [];

  for (const { userId, days } of targets) {
    try {
      const emailType = `reengagement_${days}`;

      // Anti-doublon : pas déjà relancé pour ce palier dans les 60 derniers jours.
      const { count } = await admin
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("email_type", emailType)
        .gte("sent_at", since60d);
      if ((count ?? 0) > 0) continue;

      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, email_notifications")
        .eq("id", userId)
        .single();
      if (profile?.email_notifications === false) continue;

      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (!email) continue;

      await sendReengagement({
        email,
        userName: profile?.full_name ?? undefined,
        daysInactive: days,
      });

      await admin.from("email_log").insert({
        user_id: userId,
        email_type: emailType,
      });

      sent++;
    } catch (err) {
      errors.push(`${userId}: ${String(err)}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
