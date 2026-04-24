import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { buildAuditPrompt } from "@/lib/ai/prompts";
import { getTierLimits } from "@/lib/stripe/limits";
import { getCurrentMonthYear } from "@/lib/utils";
import { logAction } from "@/lib/audit-trail";
import type { ProjectFormData, AuditResult } from "@/lib/types/audit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
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

  const body = (await request.json()) as ProjectFormData;

  // Validate input
  if (!body.name || !body.description || !body.sector) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  // Create project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
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

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse Claude invalide");
    auditResult = JSON.parse(jsonMatch[0]) as AuditResult;
  } catch (err) {
    // Clean up the created project on LLM failure
    await supabase.from("projects").delete().eq("id", project.id);
    const message = err instanceof Error ? err.message : String(err);
    console.error("Claude audit error:", message);
    return NextResponse.json({ error: `Erreur lors de l'analyse IA: ${message}` }, { status: 500 });
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

  // Save blocking issues
  if (auditResult.blocking_issues?.length > 0) {
    await supabase.from("blocking_issues").insert(
      auditResult.blocking_issues.map((issue) => ({
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
      }))
    );
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

  return NextResponse.json({
    project_id: project.id,
    audit_id: audit.id,
    verdict: auditResult.verdict,
    risk_level: auditResult.risk_level,
  });
}
