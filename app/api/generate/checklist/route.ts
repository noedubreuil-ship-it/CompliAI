import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildChecklistPrompt, extractJson, generateComplianceChecklistDocument } from "@/lib/ai/generators";

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
    const raw = await generateComplianceChecklistDocument(prompt, auth.billing("checklist", "checklist"));
    const content = extractJson(raw) as Record<string, unknown>;

    if (typeof content.checklist_id !== "string" || !content.checklist_id.trim()) {
      content.checklist_id = randomUUID();
    }

    const titleFromModel = typeof content.title === "string" ? content.title.trim() : "";
    const regulation = typeof body.regulation === "string" ? body.regulation : "Conformité UE";
    const sector = typeof body.sector === "string" ? body.sector : "";

    await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      project_id: null,
      doc_type: "checklist",
      title: titleFromModel || `Checklist ${regulation}${sector ? ` — ${sector}` : ""}`,
      content,
      raw_text: raw,
    });

    return NextResponse.json({ content });
  } catch (err) {
    console.error("Checklist error:", err);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
