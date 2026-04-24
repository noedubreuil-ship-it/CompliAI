import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildArt11Prompt, generateDocument, extractJson } from "@/lib/ai/generators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();

  try {
    const prompt = buildArt11Prompt(body);
    const raw = await generateDocument(prompt);
    const content = extractJson(raw);

    const { data: doc } = await supabase.from("generated_documents").insert({
      user_id: user.id,
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
