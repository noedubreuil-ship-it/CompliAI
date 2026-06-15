import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const AI_ACT_DEADLINE = new Date("2026-08-02T00:00:00Z");
const ALERT_THRESHOLDS = [90, 60, 30, 14, 7];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const daysUntilDeadline = Math.ceil(
    (AI_ACT_DEADLINE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (!ALERT_THRESHOLDS.includes(daysUntilDeadline)) {
    return NextResponse.json({ message: `No alert today (${daysUntilDeadline} days remaining)` });
  }

  // Get all users with email notifications enabled and high-risk systems
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email_notifications")
    .eq("email_notifications", true);

  if (!profiles?.length) return NextResponse.json({ message: "No users to notify" });

  const results = await Promise.allSettled(
    profiles.map(async (profile) => {
      // Get user's email from auth
      const { data: { user } } = await admin.auth.admin.getUserById(profile.id);
      if (!user?.email) return;

      // Get open blocking issues for this user
      const { data: issues } = await admin
        .from("blocking_issues")
        .select("id, title, projects(name)")
        .eq("user_id", profile.id)
        .eq("status", "open")
        .limit(5);

      const issueCount = issues?.length ?? 0;

      await resend.emails.send({
        from: `CompliAI <${process.env.RESEND_FROM_EMAIL ?? "alerts@compliai.eu"}>`,
        to: user.email,
        subject: `⚠️ ${daysUntilDeadline} jours avant la deadline AI Act — ${issueCount} obligation(s) en attente`,
        html: buildEmailHtml({
          userName: profile.full_name ?? "Utilisateur",
          daysLeft: daysUntilDeadline,
          issueCount,
          issues: issues ?? [],
        }),
      });

      await admin.from("notifications").insert({
        user_id: profile.id,
        title: `AI Act — J-${daysUntilDeadline}`,
        body:
          issueCount > 0 ?
            `${issueCount} issue(s) bloquante(s) ouverte(s) avant la deadline du 2 août 2026.`
          : `Plus que ${daysUntilDeadline} jours avant la deadline AI Act (2 août 2026).`,
        type: daysUntilDeadline <= 14 ? "warning" : "info",
        link: "/dashboard/calendar",
      });
    })
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  return NextResponse.json({ message: `Sent ${sent} alerts for ${daysUntilDeadline}-day threshold` });
}

function buildEmailHtml(data: {
  userName: string;
  daysLeft: number;
  issueCount: number;
  issues: Array<{
    title: string;
    projects?: { name?: string } | { name?: string }[] | null | undefined;
  }>;
}): string {
  function projectLabel(p: { name?: string } | { name?: string }[] | null | undefined) {
    if (!p) return "";
    if (Array.isArray(p)) return p[0]?.name ?? "";
    return p.name ?? "";
  }
  const urgencyColor = data.daysLeft <= 30 ? "#dc2626" : data.daysLeft <= 60 ? "#ea580c" : "#d97706";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px;">🛡️ CompliAI</h1>
      <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">Alerte de conformité réglementaire</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #334155; font-size: 15px;">Bonjour ${data.userName},</p>
      <div style="background: ${urgencyColor}15; border: 1px solid ${urgencyColor}40; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <p style="font-size: 36px; font-weight: 800; color: ${urgencyColor}; margin: 0;">${data.daysLeft} jours</p>
        <p style="color: ${urgencyColor}; margin: 4px 0 0; font-size: 14px;">avant la deadline AI Act — Art. 6 + Annexe III (2 août 2026)</p>
      </div>
      ${data.issueCount > 0 ? `
      <div style="margin: 24px 0;">
        <p style="font-weight: 600; color: #0f172a; margin: 0 0 12px;">Obligations non complétées (${data.issueCount}) :</p>
        ${data.issues.map(issue => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
            <p style="font-weight: 500; color: #0f172a; margin: 0; font-size: 14px;">${issue.title}</p>
            ${projectLabel(issue.projects) ? `<p style="color: #64748b; margin: 2px 0 0; font-size: 12px;">${projectLabel(issue.projects)}</p>` : ""}
          </div>
        `).join("")}
      </div>
      ` : `<p style="color: #16a34a; font-weight: 600;">✓ Aucune obligation bloquante en attente. Bien joué !</p>`}
      <div style="text-align: center; margin: 28px 0 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.compliai.eu"}/dashboard"
          style="background: #0f172a; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
          Voir mon tableau de bord →
        </a>
      </div>
    </div>
    <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">CompliAI — Conformité IA européenne · Se désabonner : Paramètres → Notifications</p>
    </div>
  </div>
</body>
</html>`;
}
