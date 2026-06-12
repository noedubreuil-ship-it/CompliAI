import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { buildAuditPrompt } from "@/lib/ai/prompts";
import { getTierLimits } from "@/lib/stripe/limits";
import { getCurrentMonthYear } from "@/lib/utils";
import { logAction } from "@/lib/audit-trail";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";
import type { ProjectFormData, AuditResult } from "@/lib/types/audit";
import { deliverUserWebhooks } from "@/lib/webhooks";
import { sendSlackNotification } from "@/lib/slack";
import { TOOL_CONFIGS } from "@/lib/ai/config";
import { logAIInteraction } from "@/lib/ai/monitoring";
import { aiUnavailable } from "@/lib/ai/http-errors";
import { getCreditBalance, preflightCheck } from "@/lib/credits";
import type { PlanName } from "@/lib/pricing";
import { preflightToResponse } from "@/lib/ai/http-errors";
import { resolveModelApiId } from "@/lib/ai/model-routing";
import { billAiCall } from "@/lib/ai/bill-ai-call";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// L'audit attend une sortie JSON stricte : on conserve un system prompt
// JSON-only dédié plutôt que d'injecter le MASTER_SYSTEM_PROMPT qui
// contraindrait le modèle à produire la clôture juridique.
const AUDIT_SYSTEM_PROMPT = `Tu agis comme un juriste senior parisien spécialisé en droit européen du numérique (AI Act, RGPD, NIS2, DSA, DMA, Data Act). Tu produis ici un rapport d'audit structuré au format JSON, exclusivement. Tu n'inventes aucun numéro d'article, aucune sanction et aucune jurisprudence. Tu démarres ta réponse par "{" et tu la termines par "}". Aucun texte avant ni après le JSON.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const limited = await rateLimitUser(user.id, "audit", RATE_LIMITS.audit);
  if (limited) return limited;

  const credits = await getCreditBalance(user.id);
  const creditPlan: PlanName = credits?.plan ?? "free";
  const preflight = await preflightCheck(user.id, creditPlan);
  if (preflight) {
    const blocked = preflightToResponse(preflight);
    if (blocked) return blocked;
  }

  // Check subscription tier + usage limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const tier = (profile?.subscription_tier ?? "free") as Parameters<typeof getTierLimits>[0];
  const limits = getTierLimits(tier);
  const monthYear = getCurrentMonthYear();

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check usage counter
  if (limits.audits_per_month !== Infinity) {
    const { data: usage } = await admin
      .from("audit_usage")
      .select("audit_count")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .single();

    if ((usage?.audit_count ?? 0) >= limits.audits_per_month) {
      return NextResponse.json(
        { error: `Limite atteinte. Votre plan ${tier} permet ${limits.audits_per_month} audit(s) par mois. Passez à Pro pour des audits illimités.` },
        { status: 429 }
      );
    }
  }

  const body = (await request.json()) as ProjectFormData & {
    organization_id?: string | null;
  };

  // Validate input
  if (!body.name || !body.description || !body.sector) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  // Si projet d'équipe : vérifier l'adhésion à l'organisation
  let orgId: string | null = body.organization_id ?? null;
  if (orgId) {
    const { data: memb } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!memb) {
      return NextResponse.json({ error: "Organisation invalide ou accès refusé" }, { status: 403 });
    }
  }

  // Create project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      organization_id: orgId,
      name: body.name,
      description: body.description,
      sector: body.sector,
      business_model: body.business_model,
      target_audience: body.target_audience,
      data_types: body.data_types,
      uses_personal_data: body.uses_personal_data,
      uses_biometric_data: body.uses_biometric_data,
      uses_automated_decisions: body.uses_automated_decisions,
      deployment_country: body.deployment_country,
      ai_model_type: body.ai_model_type,
      training_data_source: body.training_data_source,
    })
    .select()
    .single();

  if (projectError) {
    return NextResponse.json({ error: "Erreur lors de la création du projet" }, { status: 500 });
  }

  // Call Claude for audit
  const prompt = buildAuditPrompt(body);
  let auditResult: AuditResult;
  const auditStartedAt = Date.now();
  const auditTemperature = TOOL_CONFIGS.doc_memoire.temperature;
  const auditModel = resolveModelApiId({ plan: creditPlan, tool: "audit" });

  try {
    const message = await anthropic.messages.create({
      model: auditModel,
      max_tokens: 4096,
      temperature: auditTemperature,
      system: AUDIT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse Claude invalide");
    auditResult = JSON.parse(jsonMatch[0]) as AuditResult;

    await billAiCall({
      userId: user.id,
      plan: creditPlan,
      apiModel: auditModel,
      endpoint: "audit",
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
      tool: "audit",
    });

    void logAIInteraction(supabase, {
      userId: user.id,
      tool: "audit",
      userInput: prompt,
      outputLength: rawText.length,
      latencyMs: Date.now() - auditStartedAt,
      temperature: auditTemperature,
      model: auditModel,
    });
  } catch (err) {
    // Clean up the created project on LLM failure
    await supabase.from("projects").delete().eq("id", project.id);
    const message = err instanceof Error ? err.message : String(err);
    console.error("Claude audit error:", message);
    return aiUnavailable(message);
  }

  // Save audit to DB
  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      project_id: project.id,
      user_id: user.id,
      verdict: auditResult.verdict,
      ai_act_classification: auditResult.ai_act_classification,
      risk_level: auditResult.risk_level,
      compliance_score: auditResult.compliance_score ?? null,
      roadmap: auditResult.roadmap,
      cost_estimate: auditResult.cost_estimate,
      lawyer_needed: auditResult.lawyer_needed,
      raw_response: JSON.stringify(auditResult),
    })
    .select()
    .single();

  if (auditError) {
    return NextResponse.json({ error: "Erreur sauvegarde audit" }, { status: 500 });
  }

  // Snapshot versionné pour historique comparatif (évolution conformité dans le temps)
  const { data: lastSnap } = await supabase
    .from("audit_snapshots")
    .select("version")
    .eq("project_id", project.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: snapErr } = await supabase.from("audit_snapshots").insert({
    project_id: project.id,
    audit_id: audit.id,
    user_id: user.id,
    version: (lastSnap?.version ?? 0) + 1,
    compliance_score: auditResult.compliance_score ?? null,
    verdict: auditResult.verdict,
    ai_act_classification: auditResult.ai_act_classification ?? null,
    risk_level: auditResult.risk_level ?? null,
    snapshot: auditResult as unknown as Record<string, unknown>,
  });
  if (snapErr) {
    console.warn("audit_snapshots insert skipped:", snapErr.message);
  }

  // Save blocking issues (+ webhooks sur issues critiques ou haute sévérité)
  let criticalIssuesPayload: Record<string, unknown>[] = [];

  if (auditResult.blocking_issues?.length > 0) {
    const inserted = auditResult.blocking_issues.map((issue) => ({
      audit_id: audit.id,
      project_id: project.id,
      user_id: user.id,
      title: issue.title,
      description: issue.description,
      regulation: issue.regulation,
      article: issue.article,
      severity: issue.severity,
      phase: issue.phase,
      status: "open",
    }));
    await supabase.from("blocking_issues").insert(inserted);

    criticalIssuesPayload = auditResult.blocking_issues
      .filter((i) => i.severity === "critical" || i.severity === "high")
      .map((i) => ({
        title: i.title,
        severity: i.severity,
        regulation: i.regulation,
        phase: i.phase,
        project_name: body.name,
        project_id: project.id,
        audit_id: audit.id,
      }));
  }

  if (criticalIssuesPayload.length > 0) {
    void deliverUserWebhooks({
      userId: user.id,
      event: "blocking_issue.created",
      payload: {
        issues: criticalIssuesPayload,
      },
    });
  }

  // Increment usage counter (non-blocking)
  const { data: existingUsage } = await admin
    .from("audit_usage")
    .select("audit_count")
    .eq("user_id", user.id)
    .eq("month_year", monthYear)
    .single();

  await admin.from("audit_usage").upsert(
    {
      user_id: user.id,
      month_year: monthYear,
      audit_count: (existingUsage?.audit_count ?? 0) + 1,
    },
    { onConflict: "user_id,month_year" }
  );

  // Log to audit trail (non-blocking)
  logAction({
    user_id: user.id,
    action: "audit_created",
    entity_type: "audit",
    entity_id: audit.id,
    entity_name: body.name,
    metadata: { verdict: auditResult.verdict, risk_level: auditResult.risk_level, compliance_score: auditResult.compliance_score },
  });

  const { data: slackProfile } = await admin
    .from("profiles")
    .select("slack_webhook_url")
    .eq("id", user.id)
    .maybeSingle();
  if (slackProfile?.slack_webhook_url) {
    void sendSlackNotification(slackProfile.slack_webhook_url, {
      title: "Nouvel audit",
      text: `*${body.name}* — ${auditResult.verdict} · score ${auditResult.compliance_score ?? "—"}% · ${auditResult.ai_act_classification ?? ""}`,
      color: auditResult.verdict === "Conforme" ? "#16a34a" : "#dc2626",
    });
  }

  return NextResponse.json({
    project_id: project.id,
    audit_id: audit.id,
    verdict: auditResult.verdict,
    risk_level: auditResult.risk_level,
  });
}
