import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  generateConsultantMemoPdf,
  stripConsultantMarkdownForPdf,
} from "@/lib/pdf/consultant-memo";

/**
 * POST { question: string; answer: string } — utilisateur connecté uniquement.
 * Génère un PDF récap (Question + réponse brute) sans repasser par le LLM.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { question?: string; answer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";

  if (!question || !answer || question.length > 16000 || answer.length > 500000) {
    return NextResponse.json({ error: "Question ou réponse manquantes ou trop longues." }, { status: 400 });
  }

  try {
    const generatedAtLabel = `Généré le ${new Date().toLocaleString("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    })} — utilisateur ${user.id.slice(0, 8)}`;

    const buffer = await generateConsultantMemoPdf({
      question,
      answerPlain: stripConsultantMarkdownForPdf(answer),
      generatedAtLabel,
    });

    const fname = `compliai-consultant-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fname}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[consultant/export-pdf]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur génération PDF" },
      { status: 500 }
    );
  }
}
