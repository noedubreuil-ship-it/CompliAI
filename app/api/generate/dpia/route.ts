import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  appendNationalRagToUserPrompt,
  buildNationalRagContextForTool,
} from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildDPIAPrompt, generateDocument, extractJson } from "@/lib/ai/generators";
import { buildToolLanguageAddendum } from "@/lib/ai/query-translate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const body = await request.json();

  try {
    const ragQuery = [
      body.treatment_name,
      body.controller,
      body.purposes,
      body.data_types,
      body.data_subjects,
      body.sector,
      body.recipients,
    ]
      .filter(Boolean)
      .join(" ");
    const rag = await buildNationalRagContextForTool({ query: ragQuery, includeEuCaseLaw: true });
    let prompt = buildDPIAPrompt(body);
    prompt = appendNationalRagToUserPrompt(prompt, rag.context);

    const inputText = [body.treatment_name, body.purposes, body.context].filter(Boolean).join(" ");
    const langAddendum = buildToolLanguageAddendum(String(inputText));
    const raw = await generateDocument(prompt, auth.billing("dpia", "dpia"), langAddendum);
    const content = extractJson(raw);

    const { data: doc } = await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      project_id: body.project_id ?? null,
      doc_type: "dpia",
      title: `DPIA Art. 35 — ${body.treatment_name}`,
      content,
      raw_text: raw,
    }).select().single();

    return NextResponse.json({ doc_id: doc?.id, content });
  } catch (err) {
    console.error("DPIA generation error:", err);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }
}
