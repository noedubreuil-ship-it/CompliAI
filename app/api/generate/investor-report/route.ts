import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInvestorReportPrompt, generateDocument, extractJson } from "@/lib/ai/generators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { audit_id } = await request.json();

  const { data: audit } = await supabase
    .from("audits")
    .select("*, projects(name, sector)")
    .eq("id", audit_id)
    .eq("user_id", user.id)
    .single();

  if (!audit) return NextResponse.json({ error: "Audit introuvable" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company")
    .eq("id", user.id)
    .single();

  try {
    const roadmapSummary = Array.isArray(audit.roadmap)
      ? audit.roadmap.map((p: { phase: string }) => p.phase).join(", ")
      : "Non défini";
    const costEst = audit.cost_estimate?.initial
      ? `Initial: ${audit.cost_estimate.initial}, Récurrent: ${audit.cost_estimate.recurring_annual}`
      : "Non estimé";

    const { data: issuesCount } = await supabase
      .from("blocking_issues")
      .select("id", { count: "exact" })
      .eq("audit_id", audit_id);

    const prompt = buildInvestorReportPrompt({
      company_name: profile?.company ?? "Entreprise",
      project_name: (audit.projects as { name: string })?.name ?? "Projet IA",
      verdict: audit.verdict,
      risk_level: audit.risk_level,
      compliance_score: audit.compliance_score ?? 0,
      ai_act_classification: audit.ai_act_classification,
      roadmap_summary: roadmapSummary,
      cost_estimate: costEst,
      blocking_issues_count: issuesCount?.length ?? 0,
    });

    const raw = await generateDocument(prompt);
    const content = extractJson(raw);

    const { data: doc } = await supabase.from("generated_documents").insert({
      user_id: user.id,
      audit_id,
      project_id: audit.project_id,
      doc_type: "investor_report",
      title: `Rapport Investisseurs — ${(audit.projects as { name: string })?.name}`,
      content,
      raw_text: raw,
    }).select().single();

    return NextResponse.json({ doc_id: doc?.id, content });
  } catch (err) {
    console.error("Investor report error:", err);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
