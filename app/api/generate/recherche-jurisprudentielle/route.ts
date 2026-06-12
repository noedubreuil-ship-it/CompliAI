import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildNationalLegalContext, searchEuCaseLawTexts, searchNationalCaseLawTexts } from "@/lib/ai/national-rag";
import { buildNationalRagContextForTool } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import {
  buildRechercheJurisprudentiellePrompt,
  extractJson,
  generateRechercheJurisprudentielleDocument,
  normalizeRechercheJpForClient,
  type RechercheJpIntake,
} from "@/lib/ai/generators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate({ requirePro: true });
  if (!auth.ok) return auth.response;

  const supabase = await createClient();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const requete = typeof body.requete === "string" ? body.requete.trim() : "";
  if (!requete) return NextResponse.json({ error: "requete requise" }, { status: 400 });

  const filtres = typeof body.filtres === "string" ? body.filtres : "Toutes juridictions";
  const mode = typeof body.mode === "string" ? body.mode : undefined;
  const texte_eu = typeof body.texte_eu === "string" ? body.texte_eu : undefined;
  const periode = typeof body.periode === "string" ? body.periode : undefined;

  try {
    const matchCount =
      typeof process.env.AI_RECHERCHE_JP_RAG_MATCH === "string" && Number(process.env.AI_RECHERCHE_JP_RAG_MATCH) > 0 ?
        Math.floor(Number(process.env.AI_RECHERCHE_JP_RAG_MATCH))
      : 10;
    const threshold =
      typeof process.env.AI_RECHERCHE_JP_RAG_THRESHOLD === "string" ?
        Number(process.env.AI_RECHERCHE_JP_RAG_THRESHOLD)
      : 0.5;

    const euChunks = await searchEuCaseLawTexts(requete, matchCount, threshold);
    const nationalRag = await buildNationalRagContextForTool({
      query: requete,
      includeEuCaseLaw: false,
      includeStatutes: false,
      includeNationalCaseLaw: true,
    });
    const natJpChunks = await searchNationalCaseLawTexts(requete, nationalRag.countryCodes, 6, 0.48);
    const ragParts = [
      euChunks.length > 0 ?
        buildNationalLegalContext(euChunks, "Extraits jurisprudence EU indexée (eu_case_law).")
      : "",
      nationalRag.context,
      natJpChunks.length > 0 ?
        buildNationalLegalContext(natJpChunks, "Jurisprudence nationale complémentaire.")
      : "",
    ].filter(Boolean);
    const rag_context = ragParts.join("\n\n");

    const intake: RechercheJpIntake = {
      requete,
      filtres,
      mode,
      texte_eu,
      periode,
      rag_context,
    };

    const prompt = buildRechercheJurisprudentiellePrompt(intake);
    const raw = await generateRechercheJurisprudentielleDocument(prompt, auth.billing("recherche-jurisprudentielle", "jurisprudence"));
    const parsed = extractJson(raw) as Record<string, unknown>;
    const content = normalizeRechercheJpForClient(parsed);

    await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      doc_type: "jurisprudence_analysis",
      title: `Recherche JP — ${requete.slice(0, 80)}`,
      content,
      raw_text: raw,
    });

    return NextResponse.json({
      result: content,
      rag_hits: euChunks.length + natJpChunks.length + nationalRag.statuteHits,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Recherche jurisprudentielle error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
