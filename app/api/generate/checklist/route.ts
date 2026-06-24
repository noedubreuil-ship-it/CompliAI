import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildChecklistPrompt, extractJson, generateComplianceChecklistDocument } from "@/lib/ai/generators";
import { buildToolLanguageAddendum } from "@/lib/ai/query-translate";
import { ComplianceChecklistSchema } from "@/lib/ai/schemas/compliance-checklist";
import { aiUnavailable } from "@/lib/ai/http-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const body = (await request.json()) as Record<string, unknown>;

  try {
    const ragQuery = [body.regulation, body.sector, body.country, body.company_name, body.context]
      .filter(Boolean)
      .join(" ");
    const prompt = await enrichPromptWithNationalRag(buildChecklistPrompt(body), {
      query: ragQuery,
      includeEuCaseLaw: true,
    });
    const inputText = [body.context, body.company_name, body.regulation].filter(Boolean).join(" ");
    const langAddendum = buildToolLanguageAddendum(String(inputText));
    const raw = await generateComplianceChecklistDocument(prompt, auth.billing("checklist", "checklist"), langAddendum);
    const content = extractJson(raw) as Record<string, unknown>;

    if (typeof content.checklist_id !== "string" || !content.checklist_id.trim()) {
      content.checklist_id = randomUUID();
    }

    const parsed = ComplianceChecklistSchema.safeParse(content);
    if (!parsed.success) {
      console.error("[checklist] invalid JSON shape:", parsed.error.flatten());
      return aiUnavailable("Sortie IA invalide (checklist). Réessayez.");
    }

    const titleFromModel = typeof content.title === "string" ? content.title.trim() : "";
    const regulation = typeof body.regulation === "string" ? body.regulation : "Conformité UE";
    const sector = typeof body.sector === "string" ? body.sector : "";
    const projectId = typeof body.project_id === "string" ? body.project_id : null;

    const { data: doc, error } = await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      project_id: projectId,
      doc_type: "checklist",
      title: titleFromModel || `Checklist ${regulation}${sector ? ` — ${sector}` : ""}`,
      content: parsed.data,
      raw_text: raw,
    }).select("id").single();
    if (error) {
      console.error("[checklist] persist error:", error.message);
    }

    return NextResponse.json({ doc_id: doc?.id, content: parsed.data });
  } catch (err) {
    console.error("Checklist error:", err);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
