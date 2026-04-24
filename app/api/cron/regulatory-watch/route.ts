import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";

const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Known AI Act regulatory deadlines (static, reliable) ────────────────────
const REGULATORY_ALERTS_STATIC = [
  {
    id: "aiact-prohibited-2025",
    regulation: "AI Act (UE 2024/1689)",
    title: "⛔ AI Act — Systèmes IA interdits : application au 2 février 2025",
    description: "Depuis le 2 février 2025, les systèmes d'IA classés 'risque inacceptable' sont interdits. Vérifiez qu'aucun de vos systèmes ne relève des pratiques interdites (Art. 5) : notation sociale, manipulation subliminale, exploitation des vulnérabilités.",
    severity: "critical" as const,
    article_ref: "Art. 5 AI Act",
    deadline: new Date("2025-02-02"),
  },
  {
    id: "aiact-gpai-2025",
    regulation: "AI Act (UE 2024/1689)",
    title: "🤖 AI Act — Modèles IA à usage général (GPAI) : application au 2 août 2025",
    description: "Depuis le 2 août 2025, les obligations relatives aux modèles d'IA à usage général (ChatGPT, Claude, Gemini...) sont en vigueur. Si vous utilisez ou intégrez des GPAI, vérifiez les obligations de transparence et les contrats fournisseurs.",
    severity: "high" as const,
    article_ref: "Art. 51-56 AI Act",
    deadline: new Date("2025-08-02"),
  },
  {
    id: "aiact-full-2026",
    regulation: "AI Act (UE 2024/1689)",
    title: "🚨 AI Act — Application complète : J-100 avant le 2 août 2026",
    description: "L'AI Act s'applique intégralement au 2 août 2026 pour tous les systèmes à haut risque. Documentation technique (Art. 11), évaluation de conformité (Art. 43), enregistrement EASA obligatoires. Moins de 100 jours restants.",
    severity: "critical" as const,
    article_ref: "Art. 111 AI Act",
    deadline: new Date("2026-08-02"),
  },
  {
    id: "aiact-literacy-2025",
    regulation: "AI Act (UE 2024/1689)",
    title: "📚 AI Act — Obligation de littératie IA en vigueur depuis août 2025",
    description: "L'Art. 4 impose de veiller à ce que le personnel utilisant des systèmes IA dispose d'une littératie IA suffisante. Formez vos équipes et documentez les formations réalisées. La Politique IA Employés est obligatoire.",
    severity: "high" as const,
    article_ref: "Art. 4 AI Act",
    deadline: new Date("2025-08-02"),
  },
  {
    id: "rgpd-ai-2024",
    regulation: "RGPD (UE 2016/679)",
    title: "🔒 RGPD + IA — Le G29/EDPB publie des lignes directrices IA",
    description: "L'EDPB a publié des lignes directrices sur l'utilisation des données personnelles pour l'entraînement de modèles IA. Si vous entraînez ou affinez des modèles sur des données personnelles, une DPIA (Art. 35 RGPD) est obligatoire.",
    severity: "medium" as const,
    article_ref: "Art. 35 RGPD",
    deadline: new Date("2024-06-01"),
  },
];

// ─── Try to fetch EUR-Lex RSS (non-blocking) ─────────────────────────────────
async function fetchEurlexRSS(): Promise<{ regulation: string; title: string; url: string; date: string }[]> {
  const updates: { regulation: string; title: string; url: string; date: string }[] = [];
  // EUR-Lex official OJ RSS feed (much more reliable than HTML scraping)
  const feeds = [
    {
      regulation: "AI Act (UE 2024/1689)",
      url: "https://eur-lex.europa.eu/oj/2024/direct-access.html?ojSeries=L&rss=true",
      keyword: "artificial intelligence",
    },
  ];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "CompliAI-RegulatoryWatch/1.0" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      // Parse item titles from RSS
      const items = xml.matchAll(/<item>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<pubDate>([^<]+)<\/pubDate>[\s\S]*?<\/item>/g);
      for (const item of items) {
        const [, title, link, date] = item;
        if (title?.toLowerCase().includes(feed.keyword) || title?.toLowerCase().includes("ia")) {
          updates.push({ regulation: feed.regulation, title: title.trim(), url: link.trim(), date: date.trim() });
        }
      }
    } catch {
      // Non-blocking
    }
  }
  return updates;
}

async function analyzeImpactOnProject(
  projectDesc: string,
  alertTitle: string,
  alertDescription: string
): Promise<{ impacted: boolean; reason: string }> {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `Est-ce que cette alerte réglementaire concerne ce projet IA ? Réponds UNIQUEMENT en JSON : {"impacted": true/false, "reason": "1 phrase d'explication"}

Alerte: ${alertTitle}
Description: ${alertDescription.slice(0, 300)}
Projet: ${projectDesc.slice(0, 400)}`,
      }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const match = raw.match(/\{[\s\S]*?\}/);
    if (match) return JSON.parse(match[0]);
  } catch { /* non-blocking */ }
  return { impacted: true, reason: "Vérification d'impact recommandée." };
}

async function sendAlertEmail(
  userEmail: string,
  userName: string,
  projectName: string,
  alert: typeof REGULATORY_ALERTS_STATIC[0],
  reason: string
) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_...")) return;
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "alerts@compliai.eu",
    to: userEmail,
    subject: `⚠️ Alerte conformité : ${alert.regulation} — ${projectName}`,
    html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1e293b; color: white; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 18px;">🔒 CompliAI — Alerte réglementaire</h1>
  </div>
  <p>Bonjour ${userName || ""},</p>
  <p>Une alerte réglementaire concerne votre projet <strong>${projectName}</strong>.</p>
  <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; font-weight: bold; color: #92400e;">${alert.title}</p>
    <p style="margin: 8px 0 0; color: #78350f;">${alert.description}</p>
  </div>
  <p><strong>Impact sur votre projet :</strong> ${reason}</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://compliai.eu"}/dashboard/alerts"
     style="display: inline-block; background: #1e293b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
    Voir mes alertes
  </a>
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
  <p style="font-size: 12px; color: #94a3b8;">
    Ces alertes constituent des informations générales. Consultez un avocat spécialisé pour valider l'impact sur votre situation spécifique.<br>
    Pour ne plus recevoir ces alertes, désactivez la veille dans vos <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://compliai.eu"}/dashboard/settings">paramètres</a>.
  </p>
</div>`,
  });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || expectedSecret === "your-secret-cron-token" || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  let alertsCreated = 0;

  // Get all Pro users with active projects
  const { data: proUsers } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("subscription_tier", ["pro", "enterprise"]);

  if (!proUsers || proUsers.length === 0) {
    return NextResponse.json({ message: "Aucun utilisateur Pro", alerts_created: 0 });
  }

  // Also try to fetch live EUR-Lex updates (non-blocking bonus)
  const liveUpdates = await fetchEurlexRSS();

  for (const user of proUsers) {
    const { data: projects } = await admin
      .from("projects")
      .select("id, name, description, sector, data_types")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!projects || projects.length === 0) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(user.id);
    const userEmail = authUser?.user?.email ?? "";

    for (const project of projects) {
      const projectDesc = `${project.name}: ${project.description ?? ""}. Secteur: ${project.sector ?? ""}. Données: ${(project.data_types ?? []).join(", ")}`;

      // Process static regulatory alerts
      for (const alert of REGULATORY_ALERTS_STATIC) {
        // Only send alerts for deadlines within the past 90 days or future
        const daysDiff = (alert.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff < -90) continue; // Skip very old deadlines

        // Check if alert already sent for this project
        const { data: existing } = await admin
          .from("regulatory_alerts")
          .select("id")
          .eq("user_id", user.id)
          .eq("project_id", project.id)
          .ilike("title", `%${alert.id}%`)
          .single();

        if (existing) continue; // Already sent

        const { impacted, reason } = await analyzeImpactOnProject(projectDesc, alert.title, alert.description);
        if (!impacted) continue;

        await admin.from("regulatory_alerts").insert({
          user_id: user.id,
          project_id: project.id,
          title: alert.title,
          description: `${alert.description}\n\n[${alert.id}]`,
          regulation: alert.regulation,
          affected_features: [alert.article_ref],
          severity: alert.severity,
          source_url: `https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689`,
          is_read: false,
        });

        alertsCreated++;

        if (userEmail) {
          await sendAlertEmail(userEmail, user.full_name ?? "", project.name, alert, reason).catch(console.error);
        }
      }

      // Process live EUR-Lex updates if any found
      for (const update of liveUpdates) {
        const { impacted, reason } = await analyzeImpactOnProject(projectDesc, update.title, "Nouvelle mise à jour réglementaire détectée sur EUR-Lex.");
        if (!impacted) continue;

        await admin.from("regulatory_alerts").insert({
          user_id: user.id,
          project_id: project.id,
          title: `📡 EUR-Lex : ${update.title}`,
          description: reason,
          regulation: update.regulation,
          affected_features: [],
          severity: "medium",
          source_url: update.url,
          is_read: false,
        });
        alertsCreated++;
      }
    }
  }

  return NextResponse.json({ message: "Veille réglementaire terminée", alerts_created: alertsCreated, live_updates_found: liveUpdates.length });
}
