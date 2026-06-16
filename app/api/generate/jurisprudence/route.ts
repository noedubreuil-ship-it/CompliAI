import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildJurisprudenceAnalyzerPrompt, generateJurisprudenceAnalysisDocument, extractJson } from "@/lib/ai/generators";
import { searchEurLex, buildEurLexContext } from "@/lib/ai/eurlex";
import { JurisprudenceEuAnalyzerSchema } from "@/lib/ai/schemas/jurisprudence-eu-analyzer";
import { aiUnavailable } from "@/lib/ai/http-errors";

export const runtime = "nodejs";

// Max text length to send to Claude (chars)
const MAX_TEXT_LENGTH = 12000;

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid SSR issues with pdf-parse
  const mod = (await import("pdf-parse")) as unknown as {
    default?: (b: Buffer) => Promise<{ text?: string }>;
    (b: Buffer): Promise<{ text?: string }>;
  };
  const pdfParse = mod.default ?? mod;
  const data = await pdfParse(buffer);
  return data.text || "";
}

export async function POST(req: NextRequest) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();

  const contentType = req.headers.get("content-type") ?? "";
  let reference = "";
  let text = "";
  let analysisFocus = "";
  let projectId: string | null = null;

  // ── Handle multipart form (PDF upload) ────────────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      reference = String(formData.get("reference") ?? "");
      analysisFocus = String(formData.get("analysis_focus") ?? "");
      const additionalText = String(formData.get("text") ?? "");
      const rawProjectId = String(formData.get("project_id") ?? "").trim();
      projectId = rawProjectId ? rawProjectId : null;
      const file = formData.get("file") as File | null;

      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileType = file.name.toLowerCase();

        if (fileType.endsWith(".pdf")) {
          try {
            const extracted = await extractTextFromPdf(buffer);
            text = extracted.slice(0, MAX_TEXT_LENGTH);
          } catch {
            return NextResponse.json({ error: "Impossible d'extraire le texte du PDF. Vérifiez que le fichier n'est pas protégé." }, { status: 400 });
          }
        } else if (fileType.endsWith(".txt")) {
          text = buffer.toString("utf-8").slice(0, MAX_TEXT_LENGTH);
        } else {
          return NextResponse.json({ error: "Format non supporté. Utilisez PDF ou TXT." }, { status: 400 });
        }
      }

      // Combine manual text + extracted text
      if (additionalText.trim()) {
        text = additionalText.trim() + (text ? "\n\n[Texte extrait du PDF :]\n" + text : "");
      }

    } catch (e: any) {
      return NextResponse.json({ error: `Erreur lecture formulaire : ${e.message}` }, { status: 400 });
    }
  } else {
    // ── Handle JSON (reference + text input) ───────────────────────────────
    const body = await req.json();
    reference = body.reference ?? "";
    text = (body.text ?? "").slice(0, MAX_TEXT_LENGTH);
    analysisFocus = body.analysis_focus ?? "";
    projectId = typeof body.project_id === "string" && body.project_id.trim() ? body.project_id.trim() : null;
  }

  if (!text.trim() && !reference.trim()) {
    return NextResponse.json({ error: "Fournissez une référence ou un texte à analyser." }, { status: 400 });
  }

  // When only a reference is provided (no text body), search EUR-Lex for the actual document
  let eurLexContext = "";
  let eurLexResultsCount = 0;
  if (!text.trim() && reference.trim()) {
    const eurLexResults = await searchEurLex(reference, 3);
    eurLexResultsCount = eurLexResults.length;
    if (eurLexResults.length > 0) {
      eurLexContext = buildEurLexContext(eurLexResults);
    }
  }

  const effectiveText = text.trim() ||
    (eurLexContext
      ? `Référence : ${reference}\n\n[Résultats EUR-Lex récupérés pour cette affaire :]\n${eurLexContext}`
      : `Décision / arrêt référencé : ${reference}. Analyse cette décision selon ta connaissance du droit européen.`);

  try {
    const basePrompt = buildJurisprudenceAnalyzerPrompt({
      reference,
      text: effectiveText,
      analysis_focus: analysisFocus,
    });
    const prompt = await enrichPromptWithNationalRag(basePrompt, {
      query: `${reference} ${analysisFocus} ${effectiveText.slice(0, 2000)}`,
      includeEuCaseLaw: true,
    });

    const raw = await generateJurisprudenceAnalysisDocument(prompt, auth.billing("jurisprudence", "jurisprudence"));
    const content = extractJson(raw) as Record<string, unknown>;
    const validated = JurisprudenceEuAnalyzerSchema.safeParse(content);
    if (!validated.success) {
      console.error("[jurisprudence] invalid JSON shape:", validated.error.flatten());
      return aiUnavailable("Sortie IA invalide (jurisprudence). Réessayez.");
    }

    // Save to generated_documents
    await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      project_id: projectId,
      doc_type: "jurisprudence_analysis",
      title: `Analyse jurisprudentielle — ${reference || "Décision"}`,
      content: validated.data,
      raw_text: raw,
    });

    return NextResponse.json({
      content: validated.data,
      proof: {
        eurlex_results: eurLexResultsCount,
        used_eurlex_context: Boolean(eurLexContext.trim()),
        used_pdf_or_text: Boolean(text.trim()),
      },
    });
  } catch (err) {
    console.error("Jurisprudence analysis error:", err);
    return NextResponse.json({ error: "Erreur lors de l'analyse" }, { status: 500 });
  }
}
