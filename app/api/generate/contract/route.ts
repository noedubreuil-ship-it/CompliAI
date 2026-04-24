import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildContractAnalysisPrompt, generateDocument, extractJson } from "@/lib/ai/generators";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { contract_text, provider_name, filename } = body;

  if (!contract_text || !provider_name) {
    return NextResponse.json({ error: "Texte du contrat et nom du fournisseur requis" }, { status: 400 });
  }

  try {
    const prompt = buildContractAnalysisPrompt(contract_text, provider_name);
    const raw = await generateDocument(prompt);
    const analysis = extractJson(raw);

    const { data: result } = await supabase.from("contract_analyses").insert({
      user_id: user.id,
      filename: filename || `${provider_name}_contract.txt`,
      provider_name,
      analysis,
      risk_score: analysis.risk_score ?? null,
    }).select().single();

    return NextResponse.json({ analysis_id: result?.id, analysis });
  } catch (err) {
    console.error("Contract analysis error:", err);
    return NextResponse.json({ error: "Erreur lors de l'analyse" }, { status: 500 });
  }
}
