/**
 * Cron — Rappels deadlines réglementaires (J-30, J-14, J-7)
 * Tourne chaque matin à 08h30.
 * Pour chaque utilisateur avec email_notifications=true :
 * - Cherche les événements critiques/hauts du calendrier dont la date est dans exactement 30, 14 ou 7 jours
 * - Envoie un email de rappel
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { EU_CALENDAR_EVENTS } from "@/lib/data/eu-calendar";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "alerts@compliai.eu";

const ALERT_DAYS = [30, 14, 7];

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trouve les événements qui tombent exactement dans 7, 14 ou 30 jours
  const todayEvents = EU_CALENDAR_EVENTS.filter((e) => {
    const days = daysUntil(e.date);
    return (
      ALERT_DAYS.includes(days) &&
      (e.importance === "critique" || e.importance === "haute")
    );
  });

  if (todayEvents.length === 0) {
    return NextResponse.json({ sent: 0, message: "Aucun événement à alerter aujourd'hui" });
  }

  // Récupère les utilisateurs avec notifications activées
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email_notifications");

  const notifiableUsers = (profiles ?? []).filter((p) => p.email_notifications !== false);
  if (notifiableUsers.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const errors: string[] = [];

  for (const profile of notifiableUsers) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      // Construit le HTML des événements
      const eventsHtml = todayEvents
        .map((e) => {
          const days = daysUntil(e.date);
          const urgencyColor = days <= 7 ? "#dc2626" : days <= 14 ? "#d97706" : "#2563eb";
          return `
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:12px 8px;">
                <span style="display:inline-block;background:${urgencyColor};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px;">J-${days}</span>
              </td>
              <td style="padding:12px 8px;">
                <strong style="color:#111;font-size:13px;">${e.title}</strong><br/>
                <span style="color:#666;font-size:11px;">${e.regulation}</span>
              </td>
              <td style="padding:12px 8px;text-align:right;">
                ${e.sourceUrl ? `<a href="${e.sourceUrl}" style="color:#003399;font-size:11px;">Source →</a>` : ""}
              </td>
            </tr>`;
        })
        .join("");

      const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#003399;padding:20px 28px;">
        <span style="color:#fff;font-size:16px;font-weight:700;">CompliAI — Rappel réglementaire</span>
      </td></tr>
      <tr><td style="padding:28px;">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111;">
          ${todayEvents.length} deadline${todayEvents.length > 1 ? "s" : ""} à venir
        </h2>
        <p style="color:#555;font-size:13px;margin:0 0 20px;line-height:1.6;">
          Bonjour ${profile.full_name ?? ""},<br/>
          Voici les échéances réglementaires importantes à surveiller :
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tr style="background:#f8fafc;">
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;">Délai</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;">Événement</th>
            <th style="padding:10px 8px;font-size:11px;color:#888;text-transform:uppercase;"></th>
          </tr>
          ${eventsHtml}
        </table>
        <div style="margin-top:24px;text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar"
             style="display:inline-block;background:#003399;color:#fff;font-weight:600;font-size:13px;padding:12px 28px;border-radius:8px;text-decoration:none;">
            Voir le calendrier complet →
          </a>
        </div>
      </td></tr>
      <tr><td style="padding:12px 28px;border-top:1px solid #f0f0f0;">
        <p style="margin:0;font-size:11px;color:#aaa;">
          CompliAI · <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" style="color:#003399;">Gérer mes notifications</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

      await resend.emails.send({
        from: FROM,
        to: email,
        subject: `⏰ ${todayEvents.length} deadline${todayEvents.length > 1 ? "s" : ""} réglementaire${todayEvents.length > 1 ? "s" : ""} — ${todayEvents.map((e) => `J-${daysUntil(e.date)}`).join(", ")}`,
        html,
      });
      await admin.from("notifications").insert({
        user_id: profile.id,
        title: `Deadline réglementaire (${todayEvents.length})`,
        body: todayEvents.map((e) => `${e.title} — J-${daysUntil(e.date)}`).join(" · ").slice(0, 2000),
        type: "warning",
        link: "/dashboard/calendar",
      });
      sent++;
    } catch (err) {
      errors.push(`${profile.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ sent, total: notifiableUsers.length, errors });
}
