import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildEmployeePolicyPrompt, generateEmployeePolicyDocument, extractJson } from "@/lib/ai/generators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const body = await request.json();

  try {
    const ragQuery = [body.company_name, body.country, body.sector, body.ai_tools_used]
      .filter(Boolean)
      .join(" ");
    const prompt = await enrichPromptWithNationalRag(buildEmployeePolicyPrompt(body), {
      query: ragQuery,
      includeEuCaseLaw: false,
    });
    const raw = await generateEmployeePolicyDocument(prompt, auth.billing("policy", "doc_memoire"));
    const content = extractJson(raw);

    const { data: doc } = await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      doc_type: "employee_policy",
      title: `Politique IA Employés — ${body.company_name}`,
      content,
      raw_text: raw,
    }).select().single();

    return NextResponse.json({ doc_id: doc?.id, content });
  } catch (err) {
    console.error("Policy generation error:", err);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
