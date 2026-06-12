import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import {
  buildAIActClassifierPrompt,
  generateAiActClassifierDocument,
  extractJson,
} from "@/lib/ai/generators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const body = await request.json();

  try {
    const ragQuery = [body.system_name, body.description, body.sector, body.country, body.use_case]
      .filter(Boolean)
      .join(" ");
    const prompt = await enrichPromptWithNationalRag(buildAIActClassifierPrompt(body), {
      query: ragQuery,
      includeEuCaseLaw: false,
    });
    const raw = await generateAiActClassifierDocument(prompt, auth.billing("classifier", "classifier"));
    const content = extractJson(raw);

    await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      project_id: body.project_id ?? null,
      doc_type: "ai_act_classification",
      title: `Classification AI Act — ${body.system_name}`,
      content,
      raw_text: raw,
    });

    return NextResponse.json({ content });
  } catch (err) {
    console.error("Classifier error:", err);
    return NextResponse.json({ error: "Erreur lors de la classification" }, { status: 500 });
  }
}
