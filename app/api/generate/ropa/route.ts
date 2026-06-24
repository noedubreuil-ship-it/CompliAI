import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import {
  buildRoPAPrompt,
  extractJson,
  generateRopaDocument,
  normalizeRopaContentForClient,
} from "@/lib/ai/generators";
import { buildToolLanguageAddendum } from "@/lib/ai/query-translate";
import { mergeDocumentTemplate } from "@/lib/document-templates";
import { indexGeneratedDocumentEmbedding } from "@/lib/documents-semantic";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const body = (await request.json()) as Record<string, unknown>;
  const templateId = typeof body.template_id === "string" ? body.template_id : undefined;

  try {
    const merged = await mergeDocumentTemplate(auth.userId, templateId, body);
    const ragQuery = [
      merged.company_name,
      merged.sector,
      merged.activities,
      merged.treatment_name,
      merged.role,
    ]
      .filter(Boolean)
      .join(" ");
    const prompt = await enrichPromptWithNationalRag(buildRoPAPrompt(merged), {
      query: ragQuery,
      includeEuCaseLaw: true,
    });
    const inputText = [merged.company_name, merged.activities, merged.treatment_name].filter(Boolean).join(" ");
    const langAddendum = buildToolLanguageAddendum(String(inputText));
    const raw = await generateRopaDocument(prompt, auth.billing("ropa", "ropa"), langAddendum);
    const parsed = extractJson(raw) as Record<string, unknown>;
    const content = normalizeRopaContentForClient(parsed);

    const company =
      typeof body.company_name === "string" && body.company_name.trim() ?
        body.company_name.trim()
      : typeof content.controller === "string" ?
        String(content.controller).trim()
      : "Organisation";

    const { data: doc, error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        user_id: auth.userId,
        project_id: body.project_id ?? null,
        doc_type: "ropa",
        title: `RoPA Art. 30 — ${company}`,
        content,
        raw_text: raw,
      })
      .select()
      .single();

    if (insertError) {
      console.error("RoPA DB insert:", insertError.message);
      throw new Error(`Enregistrement document : ${insertError.message}`);
    }

    if (doc?.id) void indexGeneratedDocumentEmbedding(doc.id).catch(() => {});

    return NextResponse.json({ doc_id: doc?.id, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("RoPA generation error:", message);
    return NextResponse.json({ error: `Erreur lors de la génération : ${message}` }, { status: 500 });
  }
}
