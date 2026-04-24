import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildEmployeePolicyPrompt, generateDocument, extractJson } from "@/lib/ai/generators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();

  try {
    const prompt = buildEmployeePolicyPrompt(body);
    const raw = await generateDocument(prompt);
    const content = extractJson(raw);

    const { data: doc } = await supabase.from("generated_documents").insert({
      user_id: user.id,
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
