import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildArt11Prompt, generateArt11TechnicalDocument, extractJson } from "@/lib/ai/generators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const body = await request.json();

  try {
    const ragQuery = [body.system_name, body.sector, body.country, body.use_case, body.risk_category]
      .filter(Boolean)
      .join(" ");
    const prompt = await enrichPromptWithNationalRag(buildArt11Prompt(body), {
      query: ragQuery,
      includeEuCaseLaw: false,
    });
    const raw = await generateArt11TechnicalDocument(prompt, auth.billing("art11", "doc_art11"));
    const content = extractJson(raw);

    const { data: doc } = await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      project_id: body.project_id ?? null,
      doc_type: "art11_technical",
      title: `Documentation Technique Art. 11 — ${body.system_name}`,
      content,
      raw_text: raw,
    }).select().single();

    return NextResponse.json({ doc_id: doc?.id, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Art11 generation error:", message);
    return NextResponse.json({ error: `Erreur: ${message}` }, { status: 500 });
  }
}
