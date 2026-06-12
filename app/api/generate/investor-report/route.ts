import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildInvestorReportPrompt, generateDocument, extractJson } from "@/lib/ai/generators";
import { catchGenerateRouteError } from "@/lib/ai/http-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate({ requirePro: true });
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { audit_id } = await request.json();

  const { data: audit } = await supabase
    .from("audits")
    .select("*, projects(name, sector)")
    .eq("id", audit_id)
    .eq("user_id", auth.userId)
    .single();

  if (!audit) return NextResponse.json({ error: "Audit introuvable" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company")
    .eq("id", auth.userId)
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

    const projectSector = (audit.projects as { sector?: string })?.sector ?? "";
    const projectName = (audit.projects as { name: string })?.name ?? "Projet IA";

    const promptInput = {
      company_name: profile?.company ?? "Entreprise",
      project_name: projectName,
      verdict: audit.verdict,
      risk_level: audit.risk_level,
      compliance_score: audit.compliance_score ?? 0,
      ai_act_classification: audit.ai_act_classification,
      roadmap_summary: roadmapSummary,
      cost_estimate: costEst,
      blocking_issues_count: issuesCount?.length ?? 0,
    };

    const ragQuery = `${profile?.company ?? ""} ${projectName} ${projectSector} ${audit.ai_act_classification ?? ""} ${audit.verdict ?? ""}`;
    const prompt = await enrichPromptWithNationalRag(buildInvestorReportPrompt(promptInput), {
      query: ragQuery,
      includeEuCaseLaw: true,
    });

    const raw = await generateDocument(prompt, auth.billing("investor-report", "investor-report"));
    const content = extractJson(raw);

    const { data: doc } = await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      audit_id,
      project_id: audit.project_id,
      doc_type: "investor_report",
      title: `Rapport Investisseurs — ${projectName}`,
      content,
      raw_text: raw,
    }).select().single();

    return NextResponse.json({ doc_id: doc?.id, content });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
