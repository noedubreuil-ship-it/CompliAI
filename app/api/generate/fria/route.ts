import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildFRIAPrompt, extractJson, generateFRIA27Document } from "@/lib/ai/generators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const body = await request.json();

  let stopReason: string | null = null;

  try {
    const b = body as Record<string, unknown>;
    const ragQuery = [b.entity_name, b.sector, b.country, b.system_description, b.deployment_context]
      .filter(Boolean)
      .join(" ");
    const prompt = await enrichPromptWithNationalRag(buildFRIAPrompt(b), {
      query: ragQuery,
      includeEuCaseLaw: true,
    });
    const modelOut = await generateFRIA27Document(prompt, auth.billing("fria", "doc_fria"));
    stopReason = modelOut.stop_reason;
    const raw = modelOut.raw;

    let content: unknown;
    try {
      content = extractJson(raw);
    } catch (parseErr) {
      const parseMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error("FRIA JSON extract:", parseMsg, "stop_reason=", stopReason);
      if (stopReason === "max_tokens") {
        throw new Error(
          "Réponse du modèle interrompue au plafond de sortie (max_tokens). Augmentez AI_MAX_TOKENS_DOC_FRIA dans .env.local (ex. 24000 ou 32000) ou utilisez un modèle Claude autorisant une sortie plus longue.",
        );
      }
      throw new Error(
        "Réponse IA non exploitable en JSON complet. Réessayez ; si ça échoue encore, augmentez AI_MAX_TOKENS_DOC_FRIA.",
      );
    }

    const { data: doc, error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        user_id: auth.userId,
        project_id: body.project_id ?? null,
        doc_type: "fria",
        title: `FRIA Art. 27 — ${typeof body.system_name === "string" ? body.system_name : "Système IA"}`,
        content,
        raw_text: raw,
      })
      .select()
      .single();

    if (insertError) {
      console.error("FRIA DB insert:", insertError.message);
      throw new Error(`Enregistrement document : ${insertError.message}`);
    }

    return NextResponse.json({ doc_id: doc?.id, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("FRIA generation error:", message);
    return NextResponse.json({ error: `Erreur lors de la génération : ${message}` }, { status: 500 });
  }
}
